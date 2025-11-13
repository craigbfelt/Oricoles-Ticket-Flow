import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bot, Send, Github, CheckCircle, Loader2, GitMerge, GitCommit, AlertCircle } from "lucide-react";
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
}

export const CopilotPrompt = () => {
  const [prompt, setPrompt] = useState("");
  const [autoApprove, setAutoApprove] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTask, setCurrentTask] = useState<CopilotTask | null>(null);
  const [taskHistory, setTaskHistory] = useState<CopilotTask[]>([]);

  // Simulate task progress (in real implementation, this would connect to GitHub API)
  useEffect(() => {
    if (currentTask && currentTask.status === 'in_progress') {
      const interval = setInterval(() => {
        setCurrentTask(prev => {
          if (!prev || prev.progress >= 100) {
            clearInterval(interval);
            return prev;
          }
          
          const newProgress = Math.min(prev.progress + 5, 100);
          const updatedTask = {
            ...prev,
            progress: newProgress,
            commits: prev.commits ? prev.commits + Math.floor(Math.random() * 2) : 1,
            status: newProgress >= 100 ? 'completed' as const : prev.status,
            completedAt: newProgress >= 100 ? new Date().toISOString() : prev.completedAt
          };

          if (newProgress >= 100) {
            toast.success("Copilot task completed!", {
              description: `${updatedTask.commits} commits made successfully`
            });
            setTaskHistory(prev => [updatedTask, ...prev]);
          }

          return updatedTask;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [currentTask?.status, currentTask?.progress]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            GitHub Copilot Assistant
          </CardTitle>
          <CardDescription>
            Send prompts to GitHub Copilot for automated code changes and commits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Github className="h-4 w-4" />
            <AlertTitle>GitHub Integration</AlertTitle>
            <AlertDescription>
              This feature connects to the GitHub Copilot API to automate code changes.
              Configure your GitHub App credentials in the settings to enable full functionality.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="copilot-prompt">Prompt</Label>
              <Textarea
                id="copilot-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the changes you want Copilot to make... (e.g., 'Add a new feature to export data to CSV' or 'Fix the bug in the user authentication flow')"
                rows={4}
                disabled={isSubmitting || (currentTask?.status === 'in_progress')}
              />
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
                  Auto-approve commits and merges
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

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <GitCommit className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Commits:</span>
                <span className="font-medium">{currentTask.commits || 0}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <GitMerge className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Merges:</span>
                <span className="font-medium">{currentTask.merges || 0}</span>
              </div>
            </div>

            {currentTask.status === 'failed' && currentTask.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{currentTask.error}</AlertDescription>
              </Alert>
            )}

            {currentTask.status === 'completed' && (
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>
                  Task completed successfully with {currentTask.commits} commit(s).
                  {autoApprove && " Changes were auto-approved and merged."}
                </AlertDescription>
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
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <GitCommit className="h-3 w-3" />
                        {task.commits || 0}
                      </span>
                      {task.completedAt && (
                        <span>
                          {new Date(task.completedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
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
