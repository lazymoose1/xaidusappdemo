import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import BrandWordmark from "@/components/BrandWordmark";
import { HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";
import { DEFAULT_ORGANIZATION_TYPE, ORGANIZATION_TYPE_OPTIONS } from "@/lib/organization-language";

const parentExpectationCards = [
  {
    icon: ShieldCheck,
    title: "Support without snooping",
    description:
      "You see momentum, goals, and supportive conversation cues, not private posts or messages.",
  },
  {
    icon: HeartHandshake,
    title: "A calmer weekly rhythm",
    description:
      "Parent support stays grounded in weekly snapshots and practical next steps instead of constant monitoring.",
  },
  {
    icon: Sparkles,
    title: "Clear wins you can recognize",
    description:
      "Streaks, check-ins, and completed goals make it easier to celebrate effort while it is still building.",
  },
] as const;

const ParentSignupPage = () => {
  const navigate = useNavigate();
  const { signUpParent } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [childName, setChildName] = useState("");
  const [organizationType, setOrganizationType] = useState(DEFAULT_ORGANIZATION_TYPE);
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

    setLoading(true);
    const { error } = await signUpParent(email, password, displayName, childName, organizationType);
    setLoading(false);

    if (error) {
      toast({ title: "Sign up failed", description: error?.message || "Try again", variant: "destructive" });
      return;
    }

    toast({ title: "Welcome to Xaidus", description: "Parent account created." });
    navigate("/parent-portal");
  };

  return (
    <div className="min-h-screen bg-background px-2 py-5 sm:px-4 sm:py-7">
      <div className="mx-auto grid w-full max-w-6xl gap-3 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-6">
        <Card className="order-2 border-white/10 shadow-strong lg:order-1">
          <CardHeader className="space-y-3 pb-5">
            <div className="flex justify-center lg:justify-start">
              <BrandWordmark />
            </div>
            <div className="space-y-2 text-left">
              <p className="eyebrow">What parents can expect</p>
              <CardTitle className="text-[1.8rem] font-serif leading-tight text-foreground sm:text-3xl">
                Weekly clarity without private-content access
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-relaxed lg:text-base">
                Xaidus helps families see momentum, effort trends, and supportive next steps without turning the relationship into surveillance.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            {parentExpectationCards.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-[1.6rem] border border-white/10 bg-card/95 p-4 shadow-soft sm:p-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.25rem] bg-muted/80 xl:h-20 xl:w-20">
                    <Icon className="h-9 w-9 text-foreground/90" />
                  </div>
                  <div className="min-w-0 max-w-none space-y-2">
                    <h3 className="max-w-none text-xl font-semibold leading-tight text-foreground xl:text-2xl">
                      {title}
                    </h3>
                    <p className="max-w-none text-base leading-7 text-muted-foreground xl:text-lg">
                      {description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="order-1 border-white/10 shadow-strong lg:order-2">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-serif text-foreground text-center lg:text-left">
              Parent sign up
            </CardTitle>
            <CardDescription className="text-center lg:text-left">
              Connect to weekly snapshots, effort trends, and calmer conversations.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                <Label htmlFor="displayName">Your name (optional)</Label>
                <Input
                  id="displayName"
                  placeholder="e.g., Alex Garcia"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="childName">Teen's name (optional)</Label>
                <Input
                  id="childName"
                  placeholder="Helps us label the first profile"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label>Organization type</Label>
                <Select value={organizationType} onValueChange={setOrganizationType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose organization type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORGANIZATION_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
    </div>
  );
};

export default ParentSignupPage;
