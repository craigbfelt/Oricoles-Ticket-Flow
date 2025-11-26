import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bot, Send, Mic, MicOff, Volume2, CheckCircle, Loader2, GitMerge, GitCommit, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CopilotTask {
  id: string;
  prompt: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  commits?: number;
  merges?: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  response?: string;
}

interface CopilotAssistantProps {
  onTaskComplete?: (task: CopilotTask) => void;
  placeholder?: string;
  compact?: boolean;
}

export const CopilotAssistant = ({ 
  onTaskComplete, 
  placeholder = "Describe what you want Copilot to do... You can also use voice input.",
  compact = false 
}: CopilotAssistantProps) => {
  const [prompt, setPrompt] = useState("");
  const [autoApprove, setAutoApprove] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTask, setCurrentTask] = useState<CopilotTask | null>(null);
  const [taskHistory, setTaskHistory] = useState<CopilotTask[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        
        setPrompt(transcript);
      };

      recognitionRef.current.onerror = (event) => {
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
          
          const newProgress = Math.min(prev.progress + 5, 100);
          const updatedTask: CopilotTask = {
            ...prev,
            progress: newProgress,
            commits: prev.commits ? prev.commits + Math.floor(Math.random() * 2) : 1,
            status: newProgress >= 100 ? 'completed' : prev.status,
            completedAt: newProgress >= 100 ? new Date().toISOString() : prev.completedAt,
            response: newProgress >= 100 ? generateAIResponse(prev.prompt) : prev.response
          };

          if (newProgress >= 100) {
            toast.success("Copilot task completed!", {
              description: `Task processed successfully`
            });
            setTaskHistory(prev => [updatedTask, ...prev]);
            if (onTaskComplete) {
              onTaskComplete(updatedTask);
            }
          }

          return updatedTask;
        });
      }, 800);

      return () => clearInterval(interval);
    }
  }, [currentTask?.status, currentTask?.progress, onTaskComplete]);

  const generateAIResponse = (userPrompt: string): string => {
    // Simulated AI responses based on prompt content
    const lowerPrompt = userPrompt.toLowerCase();
    
    if (lowerPrompt.includes('diagram') || lowerPrompt.includes('network')) {
      return "I've analyzed the network topology and generated a modern diagram layout. The diagram includes all detected nodes, connections, and IP configurations.";
    }
    if (lowerPrompt.includes('import') || lowerPrompt.includes('document')) {
      return "Document processing complete. I've extracted the relevant data and updated the system with the new information.";
    }
    if (lowerPrompt.includes('server') || lowerPrompt.includes('configuration')) {
      return "Server configurations have been updated. All changes have been validated and applied to the infrastructure.";
    }
    if (lowerPrompt.includes('fix') || lowerPrompt.includes('error') || lowerPrompt.includes('bug')) {
      return "I've identified and fixed the issue. The changes have been committed and are ready for review.";
    }
    
    return "Task completed successfully. I've processed your request and made the necessary updates to the system.";
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    // Stop voice input if active
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    setIsSubmitting(true);

    // Create new task
    const newTask: CopilotTask = {
      id: Date.now().toString(),
      prompt: prompt,
      status: 'in_progress',
      progress: 0,
      commits: 0,
      merges: 0,
      startedAt: new Date().toISOString()
    };

    setCurrentTask(newTask);
    setPrompt("");
    setIsSubmitting(false);

    toast.info("Copilot task started", {
      description: "Processing your request..."
    });
  };

  const getStatusColor = (status: CopilotTask['status']) => {
    const colors = {
      pending: "bg-gray-500",
      in_progress: "bg-blue-500",
      completed: "bg-green-500",
      failed: "bg-red-500"
    };
    return colors[status];
  };

  const getStatusIcon = (status: CopilotTask['status']) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="h-4 w-4" />;
      case 'in_progress':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Copilot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={placeholder}
                rows={2}
                disabled={isSubmitting || (currentTask?.status === 'in_progress')}
                className="pr-12"
              />
              {speechSupported && (
                <Button
                  type="button"
                  size="sm"
                  variant={isListening ? "destructive" : "ghost"}
                  className="absolute right-2 top-2"
                  onClick={toggleVoiceInput}
                  disabled={isSubmitting || (currentTask?.status === 'in_progress')}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isListening && (
                  <Badge variant="destructive" className="animate-pulse">
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
              <Progress value={currentTask.progress} className="h-1" />
            )}
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Copilot Assistant
          </CardTitle>
          <CardDescription>
            Send prompts by text or voice for automated tasks. Copilot can help with diagrams, imports, configurations, and more.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="copilot-prompt">Prompt (Text or Voice)</Label>
              <div className="relative">
                <Textarea
                  id="copilot-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={placeholder}
                  rows={4}
                  disabled={isSubmitting || (currentTask?.status === 'in_progress')}
                  className="pr-16"
                />
                {speechSupported && (
                  <Button
                    type="button"
                    size="icon"
                    variant={isListening ? "destructive" : "outline"}
                    className="absolute right-2 top-2"
                    onClick={toggleVoiceInput}
                    disabled={isSubmitting || (currentTask?.status === 'in_progress')}
                  >
                    {isListening ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
              {isListening && (
                <Alert className="bg-red-50 border-red-200">
                  <Volume2 className="h-4 w-4 text-red-500 animate-pulse" />
                  <AlertTitle className="text-red-700">Voice Recording Active</AlertTitle>
                  <AlertDescription className="text-red-600">
                    Speak clearly. Click the microphone button again to stop.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-approve"
                  checked={autoApprove}
                  onCheckedChange={setAutoApprove}
                  disabled={isSubmitting || (currentTask?.status === 'in_progress')}
                />
                <Label htmlFor="auto-approve" className="cursor-pointer">
                  Auto-approve changes
                </Label>
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting || !prompt.trim() || (currentTask?.status === 'in_progress')}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send to Copilot
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {currentTask && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {getStatusIcon(currentTask.status)}
                Current Task
              </span>
              <Badge className={getStatusColor(currentTask.status)}>
                {currentTask.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {currentTask.prompt}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentTask.status === 'in_progress' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{currentTask.progress}%</span>
                </div>
                <Progress value={currentTask.progress} className="h-2" />
              </div>
            )}

            {currentTask.status === 'completed' && currentTask.response && (
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle>AI Response</AlertTitle>
                <AlertDescription>{currentTask.response}</AlertDescription>
              </Alert>
            )}

            {currentTask.status === 'failed' && currentTask.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{currentTask.error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {taskHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
            <CardDescription>
              History of Copilot tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {taskHistory.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(task.status)}
                      <Badge className={`${getStatusColor(task.status)} text-xs`}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm truncate">{task.prompt}</p>
                    {task.completedAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(task.completedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
