import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Eye, EyeOff, Sparkles, Target } from "lucide-react";
import BrandWordmark from "@/components/BrandWordmark";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import AuthLoadingOverlay from "@/components/auth/AuthLoadingOverlay";

const introSteps = [
  { icon: Target, titleKey: "auth.introSetGoalTitle", descKey: "auth.introSetGoalDesc" },
  { icon: CheckCircle2, titleKey: "auth.introCheckInTitle", descKey: "auth.introCheckInDesc" },
  { icon: Sparkles, titleKey: "auth.introGrowTitle", descKey: "auth.introGrowDesc" },
] as const;

/** A passphrase must be at least two words and 6+ characters. */
function isValidPassphrase(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 6 && trimmed.split(/\s+/).filter(Boolean).length >= 2;
}

const AuthPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
    document.title = `Xaidus | ${t("auth.title")}`;
  }, [t]);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().length < 2) {
      toast({ title: t("auth.toastPickUsername"), description: t("auth.toastPickUsernameDesc"), variant: "destructive" });
      return;
    }
    if (!/^[a-zA-Z0-9 _-]+$/.test(username.trim())) {
      toast({ title: t("auth.toastCheckUsername"), description: t("auth.toastCheckUsernameDesc"), variant: "destructive" });
      return;
    }
    if (!isValidPassphrase(passphrase)) {
      toast({ title: t("auth.toastPassphrase"), description: t("auth.toastPassphraseDesc"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await scoutSelfSignUp(username.trim(), passphrase.trim(), reason.trim() || undefined, inviteCode.trim() || undefined);
      if (error) {
        toast({ title: t("auth.toastSignupFailed"), description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: t("auth.toastSignupSuccess"), description: t("auth.toastSignupSuccessDesc") });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !passphrase.trim()) {
      toast({ title: t("auth.toastEnterDetails"), description: t("auth.toastEnterDetailsDesc"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await scoutSelfSignIn(username.trim(), passphrase.trim());
      if (error) {
        toast({ title: t("auth.toastLoginFailed"), description: error.message, variant: "destructive" });
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGroupLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!troopCode.trim() || !nickname.trim() || !/^\d{4,6}$/.test(pin)) {
      toast({ title: t("auth.toastGroupDetails"), description: t("auth.toastGroupDetailsDesc"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await scoutSignIn(troopCode.trim(), nickname.trim(), pin);
      if (error) {
        toast({ title: t("auth.toastSignInFailed"), description: error.message, variant: "destructive" });
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !emailPassword) {
      toast({ title: t("auth.toastEnterDetails"), description: t("auth.toastEmailDetailsDesc"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await signIn(email.trim(), emailPassword);
      if (error) {
        toast({ title: t("auth.toastSignInFailed"), description: t("auth.toastSignInFailedDesc"), variant: "destructive" });
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const passphraseField = (
    <div className="space-y-2">
      <Label htmlFor="passphrase">{t("auth.passphrase")}</Label>
      <div className="relative">
        <Input
          id="passphrase"
          type={showPassphrase ? "text" : "password"}
          placeholder={t("auth.passphrasePlaceholder")}
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => setShowPassphrase((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={showPassphrase ? t("auth.hidePassphrase") : t("auth.showPassphrase")}
        >
          {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  const instructions = (
    <div className="space-y-3 rounded-[1.4rem] border border-white/10 bg-background/75 p-4">
      <p className="eyebrow">{t("auth.introTitle")}</p>
      {introSteps.map(({ icon: Icon, titleKey, descKey }) => (
        <div key={titleKey} className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/75 text-foreground/90">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{t(titleKey)}</p>
            <p className="text-xs text-muted-foreground">{t(descKey)}</p>
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
            title={mode === "signup" ? t("auth.loadingSignup") : t("auth.loadingLogin")}
            description={mode === "signup" ? t("auth.loadingSignupDesc") : t("auth.loadingLoginDesc")}
            variant="teen"
          />
        )}

        <CardHeader className="space-y-4 pb-4 pt-7">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => navigate("/welcome")}
              className="rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={t("common.back")}
            >
              <BrandWordmark />
            </button>
            <LanguageSwitcher />
          </div>
          <div className="text-center space-y-1">
            <p className="eyebrow">{t("common.tagline")}</p>
            <CardTitle className="text-2xl text-foreground normal-case tracking-[-0.02em]">
              {mode === "login" ? t("auth.welcomeBack") : t("auth.createAccount")}
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
                {m === "login" ? t("auth.tabLogin") : t("auth.tabSignup")}
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
                  <Label htmlFor="username">{t("auth.username")}</Label>
                  <Input id="username" placeholder={t("auth.usernamePlaceholder")} value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} />
                  <p className="text-xs text-muted-foreground">{t("auth.usernameHelper")}</p>
                </div>
                {passphraseField}
                <p className="text-xs text-muted-foreground">{t("auth.passphraseHelper")}</p>
                <div className="space-y-2">
                  <Label htmlFor="reason">{t("auth.reasonLabel")}</Label>
                  <Textarea
                    id="reason"
                    placeholder={t("auth.reasonPlaceholder")}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="min-h-[80px] resize-none rounded-2xl"
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">{t("auth.reasonHelper")}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">{t("auth.inviteCodeLabel")} <span className="font-normal text-muted-foreground">{t("auth.optional")}</span></Label>
                  <Input
                    id="inviteCode"
                    placeholder={t("auth.inviteCodePlaceholder")}
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    disabled={loading}
                    autoCapitalize="characters"
                  />
                  <p className="text-xs text-muted-foreground">{t("auth.inviteCodeHelper")}</p>
                </div>
                <Button type="submit" className="w-full h-11 font-semibold bg-accent hover:bg-accent/90 text-accent-foreground" disabled={loading}>
                  {t("auth.createBtn")}
                </Button>
              </form>
            </>
          ) : (
            // Log in: form on top, instructions below.
            <>
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <Label htmlFor="login-username">{t("auth.username")}</Label>
                  <Input id="login-username" placeholder={t("auth.usernameLoginPlaceholder")} value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} />
                </div>
                {passphraseField}
                <Button type="submit" className="w-full h-11 font-semibold bg-accent hover:bg-accent/90 text-accent-foreground" disabled={loading}>
                  {t("auth.loginBtn")}
                </Button>
              </form>
              {instructions}
            </>
          )}

          {/* Legacy: email + password accounts created before username sign-in.
              Kept visible (not buried) so returning email users can find it. */}
          <div className="flex items-center gap-3 pt-1">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">{t("auth.orDivider")}</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 font-semibold"
            onClick={() => setShowEmailSignIn((v) => !v)}
          >
            {showEmailSignIn ? t("auth.hideEmailSignIn") : t("auth.signInWithEmail")}
          </Button>

          {showEmailSignIn && (
            <form className="space-y-3 rounded-[1.4rem] border border-white/10 bg-background/75 p-4" onSubmit={handleEmailLogin}>
              <div className="space-y-2">
                <Label htmlFor="legacy-email">{t("auth.email")}</Label>
                <Input id="legacy-email" type="email" placeholder={t("auth.emailPlaceholder")} value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legacy-password">{t("auth.password")}</Label>
                <Input id="legacy-password" type="password" placeholder={t("auth.passwordPlaceholder")} value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} disabled={loading} />
              </div>
              <Button type="submit" className="w-full h-11 font-semibold bg-accent hover:bg-accent/90 text-accent-foreground" disabled={loading}>
                {t("auth.signInWithEmail")}
              </Button>
            </form>
          )}

          {/* Secondary: leader-provisioned youth */}
          <div className="border-t border-border pt-3 text-center">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-primary hover:underline"
              onClick={() => setShowGroupCode((v) => !v)}
            >
              {showGroupCode ? t("auth.hideGroupCode") : t("auth.haveGroupCode")}
            </button>
          </div>

          {showGroupCode && (
            <form className="space-y-3 rounded-[1.4rem] border border-white/10 bg-background/75 p-4" onSubmit={handleGroupLogin}>
              <div className="space-y-2">
                <Label htmlFor="troopCode">{t("auth.groupCode")}</Label>
                <Input id="troopCode" placeholder={t("auth.groupCodePlaceholder")} value={troopCode} onChange={(e) => setTroopCode(e.target.value.toUpperCase())} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nickname">{t("auth.nickname")}</Label>
                <Input id="nickname" placeholder={t("auth.nicknamePlaceholder")} value={nickname} onChange={(e) => setNickname(e.target.value)} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin">{t("auth.pin")}</Label>
                <Input id="pin" type="password" inputMode="numeric" placeholder="••••" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} disabled={loading} />
              </div>
              <Button type="submit" variant="outline" className="w-full h-11 font-semibold" disabled={loading}>
                {t("auth.enterGroup")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
