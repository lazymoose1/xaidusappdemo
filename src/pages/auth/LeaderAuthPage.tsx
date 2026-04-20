import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import BrandWordmark from "@/components/BrandWordmark";
import { SupabaseConfigNotice } from "@/components/SupabaseConfigNotice";

const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const LeaderAuthPage = () => {
  const navigate = useNavigate();
  const { signIn, signUpLeader } = useAuth();

  const [loading, setLoading] = useState(false);

  // Sign-in fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Create-account fields
  const [organizationName, setOrganizationName] = useState("");
  const [fullName, setFullName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [organizationCode, setOrganizationCode] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [activeTab, setActiveTab] = useState<"signin" | "create">("signin");

  useEffect(() => {
    document.title = "Xaidus | Leader Sign In";
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      toast({ title: "Invalid email", description: "Enter a valid email address.", variant: "destructive" });
      return;
    }
    if (!password) {
      toast({ title: "Password required", description: "Password is required.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Sign in failed", description: "We couldn't sign you in with those details.", variant: "destructive" });
        return;
      }
      navigate("/leader");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationName.trim()) {
      toast({ title: "Organization name required", description: "Organization name is required.", variant: "destructive" });
      return;
    }
    if (!fullName.trim()) {
      toast({ title: "Full name required", description: "Full name is required.", variant: "destructive" });
      return;
    }
    if (!validateEmail(createEmail)) {
      toast({ title: "Invalid email", description: "Enter a valid email address.", variant: "destructive" });
      return;
    }
    if (!organizationCode.trim()) {
      toast({ title: "Organization code required", description: "Enter a valid troop, school, or program code.", variant: "destructive" });
      return;
    }
    if (createPassword.length < 8) {
      toast({ title: "Password too short", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    if (createPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await signUpLeader(createEmail, createPassword, fullName, organizationCode);
      if (error) {
        toast({ title: "Account creation failed", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Account created", description: "Leader account created. You can now sign in and manage your organization space." });
      navigate("/leader");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-white/10 shadow-strong">
        <CardHeader className="space-y-2 pb-4">
          <Link
            to="/auth"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            ← Back
          </Link>
          <div className="flex justify-center">
            <BrandWordmark />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-serif text-center text-foreground break-words">
            Welcome to Xaidus
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground text-xs sm:text-sm break-words">
            {activeTab === "signin"
              ? "Guide cohorts with calmer, privacy-first progress signals."
              : "Set up your organization space and support groups without extra admin sprawl."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <SupabaseConfigNotice />
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "signin" | "create")}
          >
            <TabsList className="w-full mb-6">
              <TabsTrigger value="signin" className="flex-1 min-w-0 text-xs sm:text-sm">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="create" className="flex-1 min-w-0 text-xs sm:text-sm">
                Create Account
              </TabsTrigger>
            </TabsList>

            {/* ── Sign In ── */}
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@organization.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
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

                <Button
                  type="submit"
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-11 font-semibold"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? "Signing in..." : "Sign In"}
                </Button>

                <p className="text-center text-sm text-muted-foreground pt-2">
                  Need a leader account?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setActiveTab("create")}
                  >
                    Create one
                  </button>
                </p>
              </form>
            </TabsContent>

            {/* ── Create Account ── */}
            <TabsContent value="create">
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="organizationName">Organization Name</Label>
                  <Input
                    id="organizationName"
                    type="text"
                    placeholder="Girl Scouts Troop 4521"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    This can be a troop, school, club, or program name.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Your Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="createEmail">Email</Label>
                  <Input
                    id="createEmail"
                    type="email"
                    placeholder="you@organization.org"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Use the email you want to sign in with.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organizationCode">
                    Troop / School / Program Code
                  </Label>
                  <Input
                    id="organizationCode"
                    type="text"
                    placeholder="Enter your code"
                    value={organizationCode}
                    onChange={(e) => setOrganizationCode(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    This connects you to the correct organization space.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="createPassword">Create Password</Label>
                  <div className="relative">
                    <Input
                      id="createPassword"
                      type={showCreatePassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      disabled={loading}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      disabled={loading}
                    >
                      {showCreatePassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={loading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">
                    Leader accounts are used to manage weekly reset, check-ins, and group support. Actions are role-based and logged for accountability.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-11 font-semibold"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? "Creating account..." : "Create Leader Account"}
                </Button>

                <p className="text-center text-sm text-muted-foreground pt-2">
                  Already have a leader account?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setActiveTab("signin")}
                  >
                    Sign In
                  </button>
                </p>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-xs text-muted-foreground text-center border-t border-border pt-4">
            Xaidus helps leaders guide progress with simple workflows, not extra admin burden.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaderAuthPage;
