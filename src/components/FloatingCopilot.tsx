import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  Minimize2, 
  Maximize2,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText,
  Users,
  Network,
  Ticket
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { usePermissions } from "@/contexts/PermissionsContext";
import { supabase } from "@/integrations/supabase/client";

interface CopilotTask {
  id: string;
  prompt: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  action?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  response?: string;
}

interface CopilotAction {
  name: string;
  keywords: string[];
  requiredPermission: string;
  icon: any;
  execute: (prompt: string) => Promise<{ success: boolean; message: string }>;
}

export const FloatingCopilot = () => {
  const [isMinimized, setIsMinimized] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTask, setCurrentTask] = useState<CopilotTask | null>(null);
  const [taskHistory, setTaskHistory] = useState<CopilotTask[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { permissions, isAdmin, hasPermission } = usePermissions();

  // Define available actions with permission requirements
  const actions: CopilotAction[] = [
    {
      name: "Import Document",
      keywords: ["import document", "upload document", "import file", "add document"],
      requiredPermission: "document_hub",
      icon: FileText,
      execute: async (prompt: string) => {
        // This would trigger the document import flow
        return { 
          success: true, 
          message: "Document import dialog opened. Please select a file to import." 
        };
      }
    },
    {
      name: "Convert Document",
      keywords: ["convert document", "transform document", "convert file"],
      requiredPermission: "document_hub",
      icon: FileText,
      execute: async (prompt: string) => {
        return { 
          success: true, 
          message: "Document conversion initiated. Processing your file..." 
        };
      }
    },
    {
      name: "Import CSV Users",
      keywords: ["import users", "import csv", "add users", "user import"],
      requiredPermission: "users_management",
      icon: Users,
      execute: async (prompt: string) => {
        return { 
          success: true, 
          message: "CSV user import dialog opened. Please select a CSV file." 
        };
      }
    },
    {
      name: "Import Network Data",
      keywords: ["import network", "network diagram", "import topology"],
      requiredPermission: "network_diagrams",
      icon: Network,
      execute: async (prompt: string) => {
        return { 
          success: true, 
          message: "Network data import initiated. Processing network information..." 
        };
      }
    },
    {
      name: "Create Ticket",
      keywords: ["create ticket", "new ticket", "open ticket", "ticket"],
      requiredPermission: "create_tickets",
      icon: Ticket,
      execute: async (prompt: string) => {
        return { 
          success: true, 
          message: "Ticket creation form opened. Please fill in the ticket details." 
        };
      }
    }
  ];

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        
        setPrompt(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.error("Microphone access denied", {
            description: "Please allow microphone access to use voice input"
          });
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Simulate task progress
  useEffect(() => {
    if (currentTask && currentTask.status === 'in_progress') {
      const interval = setInterval(() => {
        setCurrentTask(prev => {
          if (!prev || prev.progress >= 100) {
            clearInterval(interval);
            return prev;
          }
          
          const newProgress = Math.min(prev.progress + 10, 100);
          const updatedTask: CopilotTask = {
            ...prev,
            progress: newProgress,
            status: newProgress >= 100 ? 'completed' : prev.status,
            completedAt: newProgress >= 100 ? new Date().toISOString() : prev.completedAt
          };

          if (newProgress >= 100) {
            toast.success("Copilot task completed!", {
              description: updatedTask.response || "Task processed successfully"
            });
            setTaskHistory(prev => [updatedTask, ...prev.slice(0, 4)]);
          }

          return updatedTask;
        });
      }, 500);

      return () => clearInterval(interval);
    }
  }, [currentTask?.status, currentTask?.progress]);

  const toggleVoiceInput = () => {
    if (!speechSupported || !recognitionRef.current) {
      toast.error("Voice input not supported", {
        description: "Your browser doesn't support speech recognition"
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.info("Listening...", {
          description: "Speak your command clearly"
        });
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        toast.error("Failed to start voice input");
      }
    }
  };

  const findMatchingAction = (prompt: string): CopilotAction | null => {
    const lowerPrompt = prompt.toLowerCase();
    
    for (const action of actions) {
      for (const keyword of action.keywords) {
        if (lowerPrompt.includes(keyword)) {
          return action;
        }
      }
    }
    
    return null;
  };

  const checkPermissionForAction = (action: CopilotAction): boolean => {
    if (isAdmin) return true;
    return hasPermission(action.requiredPermission as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      toast.error("Please enter a command");
      return;
    }

    // Stop voice input if active
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    setIsSubmitting(true);

    // Find matching action
    const matchingAction = findMatchingAction(prompt);
    
    if (!matchingAction) {
      toast.error("Command not recognized", {
        description: "Please try rephrasing your command or use supported actions like 'import document', 'create ticket', etc."
      });
      setIsSubmitting(false);
      return;
    }

    // Check permissions
    if (!checkPermissionForAction(matchingAction)) {
      toast.error("Permission denied", {
        description: `You don't have permission to ${matchingAction.name.toLowerCase()}. Contact your administrator.`
      });
      setIsSubmitting(false);
      return;
    }

    // Create new task
    const newTask: CopilotTask = {
      id: Date.now().toString(),
      prompt: prompt,
      action: matchingAction.name,
      status: 'in_progress',
      progress: 0,
      startedAt: new Date().toISOString()
    };

    setCurrentTask(newTask);
    
    try {
      // Execute the action
      const result = await matchingAction.execute(prompt);
      
      newTask.response = result.message;
      
      if (!result.success) {
        newTask.status = 'failed';
        newTask.error = result.message;
        toast.error("Task failed", { description: result.message });
      }
      
    } catch (error) {
      console.error("Error executing action:", error);
      newTask.status = 'failed';
      newTask.error = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error("Task failed", { description: newTask.error });
    }

    setPrompt("");
    setIsSubmitting(false);

    toast.info("Copilot processing", {
      description: `Executing: ${matchingAction.name}`
    });
  };

  const getAvailableActions = () => {
    return actions.filter(action => checkPermissionForAction(action));
  };

  const getStatusIcon = (status: CopilotTask['status']) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="h-4 w-4" />;
      case 'in_progress':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isMinimized ? (
        // Minimized floating button
        <Button
          onClick={() => setIsMinimized(false)}
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
          size="icon"
        >
          <Sparkles className="h-6 w-6" />
        </Button>
      ) : (
        // Expanded copilot widget
        <Card className="w-96 shadow-2xl border-2 border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Copilot
                {isAdmin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
              </CardTitle>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsMinimized(true)}
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsVisible(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription className="text-xs">
              Voice or text commands for dashboard functions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Available Actions */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Available Actions:</p>
              <div className="flex flex-wrap gap-1">
                {getAvailableActions().map((action) => (
                  <Badge 
                    key={action.name} 
                    variant="outline" 
                    className="text-xs cursor-pointer hover:bg-accent"
                    onClick={() => setPrompt(action.keywords[0])}
                  >
                    <action.icon className="h-3 w-3 mr-1" />
                    {action.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Tell me what to do... (e.g., 'import document')"
                  rows={3}
                  disabled={isSubmitting || (currentTask?.status === 'in_progress')}
                  className="pr-12 text-sm resize-none"
                />
                {speechSupported && (
                  <Button
                    type="button"
                    size="sm"
                    variant={isListening ? "destructive" : "ghost"}
                    className="absolute right-2 top-2 h-7 w-7"
                    onClick={toggleVoiceInput}
                    disabled={isSubmitting || (currentTask?.status === 'in_progress')}
                  >
                    {isListening ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                  </Button>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isListening && (
                    <Badge variant="destructive" className="animate-pulse text-xs">
                      <Volume2 className="h-3 w-3 mr-1" />
                      Listening
                    </Badge>
                  )}
                </div>
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={isSubmitting || !prompt.trim() || (currentTask?.status === 'in_progress')}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {currentTask && currentTask.status === 'in_progress' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{currentTask.action}</span>
                    <span className="font-medium">{currentTask.progress}%</span>
                  </div>
                  <Progress value={currentTask.progress} className="h-1" />
                </div>
              )}

              {currentTask && currentTask.status === 'completed' && currentTask.response && (
                <Alert className="py-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <AlertDescription className="text-xs">{currentTask.response}</AlertDescription>
                </Alert>
              )}

              {currentTask && currentTask.status === 'failed' && currentTask.error && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-3 w-3" />
                  <AlertDescription className="text-xs">{currentTask.error}</AlertDescription>
                </Alert>
              )}
            </form>

            {/* Task History */}
            {taskHistory.length > 0 && (
              <div className="space-y-1 pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground">Recent:</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {taskHistory.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 p-2 rounded text-xs bg-accent/50"
                    >
                      {getStatusIcon(task.status)}
                      <span className="flex-1 truncate">{task.action || task.prompt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
