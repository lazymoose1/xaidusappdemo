import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import BrandWordmark from "@/components/BrandWordmark";
import { AuthExplainer } from "@/components/AuthExplainer";

const ParentSignupPage = () => {
  const navigate = useNavigate();
  const { signUpParent } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Xaidus | Parent sign up";
  }, []);

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const validatePassword = (value: string) => value.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      toast({ title: "Invalid email", description: "Enter a valid email.", variant: "destructive" });
      return;
    }
    if (!validatePassword(password)) {
      toast({ title: "Password too short", description: "Minimum 6 characters.", variant: "destructive" });
      return;
    }

    if (!displayName.trim()) {
      toast({ title: "Your name is required", description: "Enter your name to create a parent account.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await signUpParent(email, password, displayName.trim());
    setLoading(false);

    if (error) {
      toast({ title: "Sign up failed", description: error?.message || "Try again", variant: "destructive" });
      return;
    }

    toast({ title: "Welcome to Xaidus", description: "Parent account created. Next we'll tailor your dashboard." });
    navigate("/onboarding/parent");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md shadow-strong border-white/10">
        <CardHeader className="space-y-2">
          <div className="flex justify-center">
            <BrandWordmark />
          </div>
          <CardTitle className="text-2xl font-serif text-foreground text-center">Parent sign up</CardTitle>
          <CardDescription className="text-center">Connect to weekly snapshots, effort trends, and calmer conversations.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthExplainer variant="parent" />
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Your name</Label>
              <Input
                id="displayName"
                placeholder="e.g., Alex Garcia"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? "Creating..." : "Create parent account"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate("/auth")}
            >
              I’m a teen — take me to regular sign up
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParentSignupPage;
