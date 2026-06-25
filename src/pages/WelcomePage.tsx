import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GraduationCap, Heart, Users, ArrowRight } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BrandWordmark from "@/components/BrandWordmark";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const ROLE_CARDS = [
  { key: "teen", roleKey: "welcome.roleTeen", blurbKey: "welcome.blurbTeen", to: "/auth", icon: GraduationCap },
  { key: "parent", roleKey: "welcome.roleParent", blurbKey: "welcome.blurbParent", to: "/auth/parent", icon: Heart },
  { key: "leader", roleKey: "welcome.roleLeader", blurbKey: "welcome.blurbLeader", to: "/auth/leader", icon: Users },
] as const;

const WelcomePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get("reason") === "session-expired";
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
          <div className="flex items-center justify-between gap-2">
            <BrandWordmark />
            <LanguageSwitcher />
          </div>
          <div className="space-y-2">
            <p className="eyebrow">{t("common.tagline")}</p>
            <CardTitle className="text-2xl text-foreground normal-case tracking-[-0.02em]">
              {t("welcome.title")}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {t("welcome.subtitle")}
            </CardDescription>
            {sessionExpired && (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                {t("welcome.sessionExpired")}
              </p>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pb-6">
          {ROLE_CARDS.map(({ key, roleKey, blurbKey, to, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => navigate(to)}
              className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-background/75 p-4 text-left transition hover:border-accent/50 hover:bg-accent/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 basis-0">
                <span className="block text-base font-semibold text-foreground">
                  {t("welcome.imA", { role: t(roleKey) })}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{t(blurbKey)}</span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-accent" />
            </button>
          ))}

          <div className="flex items-center justify-center gap-1.5 pt-2 text-xs text-muted-foreground">
            <span>{t("welcome.haveAccount")}</span>
            <Button
              variant="link"
              className="h-auto p-0 text-xs text-accent"
              onClick={() => navigate("/auth")}
            >
              {t("welcome.logIn")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WelcomePage;
