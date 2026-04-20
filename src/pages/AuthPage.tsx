import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { SocialSSOButtons } from "@/components/SocialSSOButtons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { goalsApi } from "@/api/endpoints";
import BrandWordmark from "@/components/BrandWordmark";
import { SupabaseConfigNotice } from "@/components/SupabaseConfigNotice";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showQuickGoal, setShowQuickGoal] = useState(false);
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [customGoal, setCustomGoal] = useState("");
  const goalTemplates = [
    "Turn in missing work",
    "Study 20 min",
    "Check my grades once",
    "Practice for 10 min",
    "Get outside for 10 min",
    "Message my teacher/coach"
  ];
  const [selectedTemplate, setSelectedTemplate] = useState(goalTemplates[0]);
  const [authMode, setAuthMode] = useState<'scout' | 'adult' | 'email'>('scout');
  const [troopCode, setTroopCode] = useState('');
  const [scoutNickname, setScoutNickname] = useState('');
  const [scoutPin, setScoutPin] = useState('');
  const { signUp, signIn, scoutSignIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Xaidus | Sign in";
  }, []);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    if (!validatePassword(password)) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (!isLogin && !acceptedTerms) {
      toast({
        title: "Accept Terms",
        description: "Please accept the Terms and Conditions to create an account.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = isLogin 
        ? await signIn(email, password)
        : await signUp(email, password);

      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            title: "Account Exists",
            description: "This email is already registered. Please login instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Authentication Error",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      toast({
        title: isLogin ? "Welcome back!" : "Account created!",
        description: isLogin ? "You've successfully logged in." : "You can now start using Xaidus.",
      });

      // For signups, go to onboarding wizard; logins go home
      navigate(isLogin ? "/" : "/onboarding");
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background" data-page-id="signup">
      <Card className="w-full max-w-[31rem] border-white/10 shadow-strong">
        <CardHeader className="space-y-4 pb-6 pt-7">
          <div className="flex justify-center">
            <BrandWordmark />
          </div>
          <div className="text-center space-y-2">
            <p className="eyebrow">Teen-led. Trust-first.</p>
          <CardTitle className="text-[2rem] sm:text-[2.35rem] text-center text-foreground normal-case tracking-[-0.03em]">
            {authMode === 'scout' ? "Scout Sign In" : authMode === 'adult' ? "Welcome to Xaidus" : isLogin ? "Welcome back" : "Welcome to Xaidus"}
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
            {authMode === 'scout'
              ? "Enter your troop code, nickname, and PIN"
              : authMode === 'adult'
              ? "Peace, not surveillance. Choose how you're signing in."
              : isLogin
              ? "Enter your credentials to access your account"
              : "Create your account, set one goal, and start the 10-second daily pulse."}
          </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <SupabaseConfigNotice />
          {authMode === 'scout' && (
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!troopCode.trim() || !scoutNickname.trim() || !/^\d{4,6}$/.test(scoutPin)) {
                  toast({ title: "Check your details", description: "Troop code, nickname, and a 4–6 digit PIN are required.", variant: "destructive" });
                  return;
                }
                setLoading(true);
                try {
                  const { error } = await scoutSignIn(troopCode.trim(), scoutNickname.trim(), scoutPin);
                  if (error) {
                    toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
                    return;
                  }
                  navigate("/");
                } finally {
                  setLoading(false);
                }
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="troopCode">Troop Code</Label>
                <Input id="troopCode" placeholder="e.g., GS-TROOP42" value={troopCode} onChange={(e) => setTroopCode(e.target.value.toUpperCase())} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scoutNickname">Nickname</Label>
                <Input id="scoutNickname" placeholder="Your nickname" value={scoutNickname} onChange={(e) => setScoutNickname(e.target.value)} disabled={loading} />
                <p className="text-xs text-muted-foreground">You can use your username from other social platforms.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scoutPin">PIN (4–6 digits)</Label>
                <Input id="scoutPin" type="password" inputMode="numeric" placeholder="••••" maxLength={6} value={scoutPin} onChange={(e) => setScoutPin(e.target.value.replace(/\D/g, ''))} disabled={loading} />
              </div>
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-11 font-semibold" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Signing in..." : "Enter Troop"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Your leader sets up your PIN during troop onboarding.
              </p>
              <div className="text-center pt-2">
                <button type="button" className="text-sm text-muted-foreground hover:text-primary hover:underline" onClick={() => setAuthMode('adult')}>
                  Not a Girl Scout? Sign in here
                </button>
              </div>
            </form>
          )}
          {authMode === 'adult' && (
            <div className="space-y-3">
              <Button
                type="button"
                className="w-full h-11 font-semibold bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={() => navigate('/auth/parent')}
              >
                Parent? Sign in here
              </Button>
              <Button
                type="button"
                className="w-full h-11 font-semibold"
                variant="outline"
                onClick={() => navigate('/auth/leader')}
              >
                Leader? Sign in here
              </Button>
              <div className="pt-4 text-center border-t border-border">
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-primary hover:underline"
                  onClick={() => setAuthMode('email')}
                >
                  Non-affiliated? Sign in here
                </button>
              </div>
              <div className="text-center">
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-primary hover:underline"
                  onClick={() => setAuthMode('scout')}
                >
                  ← Back to Scout sign in
                </button>
              </div>
            </div>
          )}
          {authMode === 'email' && (
          <><form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    What happens next
                  </p>
                  <h3 className="text-base font-semibold text-foreground mt-1">
                    You’ll be set up in a couple of quick steps.
                  </h3>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>1. Create your account.</p>
                  <p>2. Pick your first goal with a short setup tutorial.</p>
                  <p>3. Get a tiny first step, streaks, and check-in wins.</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  The goal tutorial is skippable, so you can move fast if you want.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            {!isLogin && (
              <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                <label className="flex items-start gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-primary"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    disabled={loading}
                  />
                  <span>
                    I agree to the{" "}
                    <a
                      href="https://docs.google.com/document/d/1CPT_pgrUzaaaGC9oyey1CI265IRZNdguYtGLhnQCy1s/edit?usp=sharing"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      Terms & Conditions
                    </a>{" "}
                    and acknowledge the{" "}
                    <a
                      href="https://docs.google.com/document/d/1jvfPAiNutb_rUoCz4FUN2JshmTxcPuATVkRWVo-fRdg/edit?usp=sharing"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      Privacy Policy
                    </a>.
                  </span>
                </label>
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-11 font-semibold"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Please wait..." : (isLogin ? "Sign In" : "Sign Up")}
            </Button>
          </form>
          {/* SSO Buttons */}
          {!isLogin && (
            <>
              <div className="mt-8 mb-2 text-center text-base font-semibold text-muted-foreground">Or sign up with</div>
              <SocialSSOButtons onClick={(provider) => {
                window.location.href = `/api/auth/${provider}/login`;
              }} />
            </>
          )}
          <div className="mt-6 text-center text-sm border-t border-border pt-6 space-y-3">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline"
              disabled={loading}
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setAuthMode('adult')}
                className="text-xs text-muted-foreground hover:text-primary hover:underline"
                disabled={loading}
              >
                ← Back
              </button>
            </div>
          </div>
          </>)}

        </CardContent>
      </Card>

      <Dialog open={showQuickGoal} onOpenChange={(open) => {
        setShowQuickGoal(open);
        if (!open) navigate("/");
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">Set your first goal (30 seconds)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pick one that feels doable this week. You can change it anytime.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {goalTemplates.map((g) => (
                <Button
                  key={g}
                  type="button"
                  variant={selectedTemplate === g ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => {
                    setSelectedTemplate(g);
                    setCustomGoal("");
                  }}
                  disabled={creatingGoal}
                >
                  {g}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="customGoal">Or write your own</Label>
              <Input
                id="customGoal"
                placeholder="e.g., Finish my history outline"
                value={customGoal}
                onChange={(e) => {
                  setCustomGoal(e.target.value);
                  setSelectedTemplate("");
                }}
                disabled={creatingGoal}
              />
            </div>
            <Button
              type="button"
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              disabled={creatingGoal}
              onClick={async () => {
                const title = (customGoal || selectedTemplate || "").trim();
                if (!title) {
                  toast({
                    title: "Add a goal",
                    description: "Choose a template or write your own.",
                    variant: "destructive"
                  });
                  return;
                }
                setCreatingGoal(true);
                try {
                  await goalsApi.create({
                      title,
                      description: "Quick-start goal",
                      category: "weekly"
                  });
                  toast({
                    title: "Goal saved",
                    description: "You're set for this week. Check in daily for tiny wins."
                  });
                  setShowQuickGoal(false);
                  navigate("/");
                } catch (err) {
                  toast({
                    title: "Couldn't save goal",
                    description: err instanceof Error ? err.message : "Please try again.",
                    variant: "destructive"
                  });
                } finally {
                  setCreatingGoal(false);
                }
              }}
            >
              {creatingGoal ? "Saving..." : "Save goal & continue"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuthPage;
