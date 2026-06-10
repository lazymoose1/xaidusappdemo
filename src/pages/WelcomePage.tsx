import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Heart, Users, ArrowRight } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BrandWordmark from "@/components/BrandWordmark";

type RoleCard = {
  key: string;
  title: string;
  blurb: string;
  to: string;
  icon: typeof GraduationCap;
};

const ROLE_CARDS: RoleCard[] = [
  {
    key: "teen",
    title: "Teen",
    blurb: "Set one goal, get a next step you can actually do today.",
    to: "/auth",
    icon: GraduationCap,
  },
  {
    key: "parent",
    title: "Parent",
    blurb: "See effort trends and goals — never private messages or monitoring.",
    to: "/auth/parent",
    icon: Heart,
  },
  {
    key: "leader",
    title: "Leader",
    blurb: "Support your group with weekly resets and check-ins, role-based and logged.",
    to: "/auth/leader",
    icon: Users,
  },
];

const WelcomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    document.title = "Xaidus | Welcome";
  }, []);

  // If a session is already established, get out of the public entry.
  useEffect(() => {
    if (user) {
      navigate(user.role === "scout_leader" ? "/leader" : "/", { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-3 py-6 sm:px-5 sm:py-8">
      <Card className="w-full max-w-md overflow-hidden border-white/10 shadow-strong">
        <CardHeader className="space-y-4 pb-4 pt-7 text-center">
          <div className="flex justify-center">
            <BrandWordmark />
          </div>
          <div className="space-y-2">
            <p className="eyebrow">Teen-led. Trust-first.</p>
            <CardTitle className="text-2xl text-foreground normal-case tracking-[-0.02em]">
              Log in or sign up
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Choose how you’re joining Xaidus.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pb-6">
          {ROLE_CARDS.map(({ key, title, blurb, to, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => navigate(to)}
              className="group flex w-full items-center gap-4 rounded-[1.4rem] border border-white/10 bg-background/75 px-4 py-4 text-left transition hover:border-accent/50 hover:bg-accent/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[1.1rem] bg-muted/75 text-foreground/90">
                <Icon className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-foreground">I’m a {title}</span>
                <span className="block text-xs leading-5 text-muted-foreground break-words">{blurb}</span>
              </span>
              <ArrowRight className="h-5 w-5 flex-shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-accent" />
            </button>
          ))}

          <div className="flex items-center justify-center gap-1.5 pt-2 text-xs text-muted-foreground">
            <span>Already have an account?</span>
            <Button
              variant="link"
              className="h-auto p-0 text-xs text-accent"
              onClick={() => navigate("/auth")}
            >
              Log in
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WelcomePage;
