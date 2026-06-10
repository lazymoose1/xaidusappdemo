import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Heart, Users, ArrowRight } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="p-4 rounded-[1.5rem] bg-white/[0.04] border border-white/10 backdrop-blur-md">
            <BrandWordmark compact />
          </div>
          <p className="eyebrow text-white/60">Teen-led. Trust-first.</p>
          <h1 className="text-2xl font-serif">Log in or sign up</h1>
          <p className="text-sm text-white/70">Choose how you’re joining Xaidus.</p>
        </div>

        <div className="space-y-3">
          {ROLE_CARDS.map(({ key, title, blurb, to, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => navigate(to)}
              className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-left transition hover:border-accent/50 hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-white">I’m a {title}</span>
                <span className="block text-xs text-white/60 break-words">{blurb}</span>
              </span>
              <ArrowRight className="h-5 w-5 flex-shrink-0 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-accent" />
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-white/50">
          <span>Already have an account?</span>
          <Button
            variant="link"
            className="h-auto p-0 text-xs text-accent"
            onClick={() => navigate("/auth")}
          >
            Log in
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
