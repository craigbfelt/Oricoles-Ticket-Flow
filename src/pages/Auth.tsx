import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import ConfigurationError from "@/components/ConfigurationError";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isAdminRecovery, setIsAdminRecovery] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Show configuration error if Supabase is not properly configured
  if (!isSupabaseConfigured) {
    return <ConfigurationError />;
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked the reset password link from email
        setIsForgotPassword(false);
        setIsLogin(true);
        toast({
          title: "Password Reset",
          description: "Please enter your new password",
        });
      }
      
      if (session) {
        navigate("/dashboard");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isForgotPassword) {
        // Send password reset email
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?reset=true`,
        });

        if (error) throw error;

        toast({
          title: "Password Reset Email Sent",
          description: "Check your email for a password reset link",
        });
        setIsForgotPassword(false);
        setIsLogin(true);
      } else if (isAdminRecovery) {
        // Admin account recovery - verify via secure server endpoint
        const response = await fetch('/api/admin/recover', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, recoveryCode }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Invalid recovery credentials' }));
          throw new Error(errorData.error || 'Invalid recovery credentials');
        }

        toast({
          title: "Admin Recovery",
          description: "Recovery code verified. Contact system administrator for manual role assignment",
        });
        setIsAdminRecovery(false);
        setIsLogin(true);
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "Successfully signed in",
        });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;

        toast({
          title: "Account created!",
          description: "You can now sign in",
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Oricol Helpdesk</CardTitle>
          <CardDescription>
            {isForgotPassword 
              ? "Reset your password"
              : isAdminRecovery
              ? "Admin Account Recovery"
              : isLogin 
              ? "Sign in to your account" 
              : "Create a new account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isForgotPassword ? (
              // Forgot Password Form
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    We'll send you a password reset link to your email
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Link
                </Button>
              </>
            ) : isAdminRecovery ? (
              // Admin Recovery Form
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Admin Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="craig@zerobitone.co.za"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recoveryCode">Recovery Code</Label>
                  <Input
                    id="recoveryCode"
                    type="text"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    placeholder="Enter recovery code"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Contact IT support if you don't have a recovery code
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Recover Admin Access
                </Button>
              </>
            ) : (
              // Normal Login/Signup Form
              <>
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLogin ? "Sign In" : "Sign Up"}
                </Button>
              </>
            )}
          </form>
          
          <div className="mt-4 space-y-2">
            {isForgotPassword || isAdminRecovery ? (
              <Button
                variant="link"
                onClick={() => {
                  setIsForgotPassword(false);
                  setIsAdminRecovery(false);
                  setIsLogin(true);
                }}
                className="w-full text-sm"
              >
                Back to Sign In
              </Button>
            ) : (
              <>
                <div className="text-center">
                  <Button
                    variant="link"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-sm"
                  >
                    {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
                  </Button>
                </div>
                {isLogin && (
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="link"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setIsAdminRecovery(false);
                      }}
                      className="text-sm"
                    >
                      Forgot your password?
                    </Button>
                    <Button
                      variant="link"
                      onClick={() => {
                        setIsAdminRecovery(true);
                        setIsForgotPassword(false);
                      }}
                      className="text-sm text-muted-foreground"
                    >
                      Admin Account Recovery
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
