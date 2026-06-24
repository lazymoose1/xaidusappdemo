import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Eye, EyeOff, Sparkles, Target } from "lucide-react";
import BrandWordmark from "@/components/BrandWordmark";
import AuthLoadingOverlay from "@/components/auth/AuthLoadingOverlay";

const introSteps = [
  { icon: Target, title: "Set one goal", description: "Turn pressure into a next step you can actually do today." },
  { icon: CheckCircle2, title: "Check in", description: "A daily pulse that takes seconds, not another thing hanging over you." },
  { icon: Sparkles, title: "Earn & grow", description: "Streaks and micro-wins turn effort into identity over time." },
] as const;

/** A passphrase must be at least two words and 6+ characters. */
function isValidPassphrase(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 6 && trimmed.split(/\s+/).filter(Boolean).length >= 2;
}

const AuthPage = () => {
  const navigate = useNavigate();
  const { user, scoutSelfSignUp, scoutSelfSignIn, scoutSignIn, signIn } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [reason, setReason] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [loading, setLoading] = useState(false);

  // Secondary: leader-provisioned youth sign in with a group code + nickname + PIN.
  const [showGroupCode, setShowGroupCode] = useState(false);
  const [troopCode, setTroopCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");

  // Legacy: teens who originally registered with email + password.
  const [showEmailSignIn, setShowEmailSignIn] = useState(false);
  const [email, setEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");

  useEffect(() => {
    document.title = "Xaidus | Teen Sign In";
  }, []);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().length < 2) {
      toast({ title: "Pick a username", description: "Use at least 2 characters.", variant: "destructive" });
      return;
    }
    if (!/^[a-zA-Z0-9 _-]+$/.test(username.trim())) {
      toast({ title: "Check your username", description: "Use only letters, numbers, spaces, hyphens, or underscores.", variant: "destructive" });
      return;
    }
    if (!isValidPassphrase(passphrase)) {
      toast({ title: "Make it a passphrase", description: "Use at least two words (e.g., “blue mountain trail”).", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await scoutSelfSignUp(username.trim(), passphrase.trim(), reason.trim() || undefined, inviteCode.trim() || undefined);
      if (error) {
        toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "You're in!", description: "Account created. Let's set your first step." });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !passphrase.trim()) {
      toast({ title: "Enter your details", description: "Username and passphrase are required.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await scoutSelfSignIn(username.trim(), passphrase.trim());
      if (error) {
        toast({ title: "Login failed", description: error.message, variant: "destructive" });
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGroupLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!troopCode.trim() || !nickname.trim() || !/^\d{4,6}$/.test(pin)) {
      toast({ title: "Check your details", description: "Group code, nickname, and a 4–6 digit PIN are required.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await scoutSignIn(troopCode.trim(), nickname.trim(), pin);
      if (error) {
        toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !emailPassword) {
      toast({ title: "Enter your details", description: "Email and password are required.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await signIn(email.trim(), emailPassword);
      if (error) {
        toast({ title: "Sign in failed", description: "We couldn't sign you in with those details.", variant: "destructive" });
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const passphraseField = (
    <div className="space-y-2">
      <Label htmlFor="passphrase">Passphrase</Label>
      <div className="relative">
        <Input
          id="passphrase"
          type={showPassphrase ? "text" : "password"}
          placeholder="At least two words"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => setShowPassphrase((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={showPassphrase ? "Hide passphrase" : "Show passphrase"}
        >
          {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  const instructions = (
    <div className="space-y-3 rounded-[1.4rem] border border-white/10 bg-background/75 p-4">
      <p className="eyebrow">What you'll do in Xaidus</p>
      {introSteps.map(({ icon: Icon, title, description }) => (
        <div key={title} className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/75 text-foreground/90">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex items-start justify-center bg-background px-3 py-6 sm:px-5 sm:items-center sm:py-8" data-page-id="teen-auth">
      <Card className="relative w-full max-w-md overflow-hidden border-white/10 shadow-strong">
        {loading && (
          <AuthLoadingOverlay
            title={mode === "signup" ? "Building your account" : "Signing you in"}
            description={mode === "signup" ? "Setting up your first step so you land ready to move." : "Bringing your goals and streaks back into view."}
            variant="teen"
          />
        )}

        <CardHeader className="space-y-4 pb-4 pt-7">
          <button
            type="button"
            onClick={() => navigate("/welcome")}
            className="mx-auto rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Back to sign-in options"
          >
            <BrandWordmark />
          </button>
          <div className="text-center space-y-1">
            <p className="eyebrow">Teen-led. Trust-first.</p>
            <CardTitle className="text-2xl text-foreground normal-case tracking-[-0.02em]">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </CardTitle>
          </div>

          {/* Log in / Sign up toggle */}
          <div className="grid grid-cols-2 gap-1 rounded-full border border-white/10 bg-background/60 p-1">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-full py-2 text-sm font-semibold transition ${
                  mode === m ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {mode === "signup" ? (
            // Sign up: intro above the enter-info section.
            <>
              {instructions}
              <form className="space-y-4" onSubmit={handleSignup}>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" placeholder="Pick a username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} />
                  <p className="text-xs text-muted-foreground">You can use a username you already use on other platforms.</p>
                </div>
                {passphraseField}
                <p className="text-xs text-muted-foreground">Use at least two words so it's easy to remember but hard to guess.</p>
                <div className="space-y-2">
                  <Label htmlFor="reason">What's your reason for being here?</Label>
                  <Textarea
                    id="reason"
                    placeholder="e.g., Stay on top of schoolwork without the stress"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="min-h-[80px] resize-none rounded-2xl"
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">We'll turn this into your first goal.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Parent invite code <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="inviteCode"
                    placeholder="e.g., 7KQ4PX"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    disabled={loading}
                    autoCapitalize="characters"
                  />
                  <p className="text-xs text-muted-foreground">Got a code from your parent? Enter it to link your accounts.</p>
                </div>
                <Button type="submit" className="w-full h-11 font-semibold bg-accent hover:bg-accent/90 text-accent-foreground" disabled={loading}>
                  Create my account
                </Button>
              </form>
            </>
          ) : (
            // Log in: form on top, instructions below.
            <>
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <Label htmlFor="login-username">Username</Label>
                  <Input id="login-username" placeholder="Your username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} />
                </div>
                {passphraseField}
                <Button type="submit" className="w-full h-11 font-semibold bg-accent hover:bg-accent/90 text-accent-foreground" disabled={loading}>
                  Log in
                </Button>
              </form>
              {instructions}
            </>
          )}

          {/* Secondary: leader-provisioned youth */}
          <div className="border-t border-border pt-3 text-center">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-primary hover:underline"
              onClick={() => setShowGroupCode((v) => !v)}
            >
              {showGroupCode ? "Hide group code sign in" : "Have a group code from your leader?"}
            </button>
          </div>

          {showGroupCode && (
            <form className="space-y-3 rounded-[1.4rem] border border-white/10 bg-background/75 p-4" onSubmit={handleGroupLogin}>
              <div className="space-y-2">
                <Label htmlFor="troopCode">Group Code</Label>
                <Input id="troopCode" placeholder="e.g., GROUP42" value={troopCode} onChange={(e) => setTroopCode(e.target.value.toUpperCase())} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nickname">Nickname</Label>
                <Input id="nickname" placeholder="Your nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin">PIN (4–6 digits)</Label>
                <Input id="pin" type="password" inputMode="numeric" placeholder="••••" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} disabled={loading} />
              </div>
              <Button type="submit" variant="outline" className="w-full h-11 font-semibold" disabled={loading}>
                Enter group
              </Button>
            </form>
          )}

          {/* Legacy: email + password accounts created before username sign-in */}
          <div className="text-center">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-primary hover:underline"
              onClick={() => setShowEmailSignIn((v) => !v)}
            >
              {showEmailSignIn ? "Hide email sign in" : "Signed up with an email before?"}
            </button>
          </div>

          {showEmailSignIn && (
            <form className="space-y-3 rounded-[1.4rem] border border-white/10 bg-background/75 p-4" onSubmit={handleEmailLogin}>
              <div className="space-y-2">
                <Label htmlFor="legacy-email">Email</Label>
                <Input id="legacy-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legacy-password">Password</Label>
                <Input id="legacy-password" type="password" placeholder="Your password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} disabled={loading} />
              </div>
              <Button type="submit" variant="outline" className="w-full h-11 font-semibold" disabled={loading}>
                Sign in with email
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
