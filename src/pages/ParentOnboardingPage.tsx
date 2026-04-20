import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";

import { parentPortalApi, onboardingApi, settingsApi } from "@/api/endpoints";
import BrandWordmark from "@/components/BrandWordmark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";

const archetypes = [
  {
    id: "connector",
    title: "Connector",
    blurb: "You lead best by opening dialogue and helping your teen feel safe talking about progress.",
  },
  {
    id: "strategist",
    title: "Strategist",
    blurb: "You like a clear plan, simple signals, and gentle structure that keeps the week manageable.",
  },
  {
    id: "builder",
    title: "Builder",
    blurb: "You support best by focusing on repeatable habits and small actions that add up over time.",
  },
];

const focusOptions = [
  "school rhythm",
  "confidence",
  "time management",
  "consistent check-ins",
  "healthy routines",
  "creative momentum",
  "career curiosity",
  "community involvement",
];

const coachStyles = [
  { id: "calm", label: "Calm", detail: "Low-pressure prompts and gentle weekly nudges." },
  { id: "encouraging", label: "Encouraging", detail: "Celebrate effort and reinforce momentum early." },
  { id: "direct", label: "Direct", detail: "Clear next steps and simple accountability." },
];

const ParentOnboardingPage = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  const [archetype, setArchetype] = useState(archetypes[0].id);
  const [coachStyle, setCoachStyle] = useState(coachStyles[0].id);
  const [focuses, setFocuses] = useState<string[]>(focusOptions.slice(0, 3));
  const [teenNickname, setTeenNickname] = useState("");
  const [troopCode, setTroopCode] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => focuses.length >= 3 && archetype.length > 0, [focuses, archetype]);

  const toggleFocus = (focus: string) => {
    setFocuses((current) =>
      current.includes(focus) ? current.filter((item) => item !== focus) : [...current, focus],
    );
  };

  const handleFinish = async () => {
    if (!user) {
      navigate("/auth/parent");
      return;
    }

    if (focuses.length < 3) {
      toast({
        title: "Pick at least three focus areas",
        description: "This helps tailor your first parent dashboard view.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await onboardingApi.save({
        archetype,
        interests: focuses,
      });
      await settingsApi.savePreferences({
        coachStyle,
      });

      if (teenNickname.trim()) {
        await parentPortalApi.addChild(
          teenNickname.trim(),
          troopCode.trim() ? troopCode.trim().toUpperCase() : undefined,
        );
      }

      await refreshProfile();

      toast({
        title: "Parent setup complete",
        description: teenNickname.trim()
          ? "Your dashboard is ready and your first teen link has been added."
          : "Your dashboard is ready. You can link a teen any time from the parent portal.",
      });

      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Couldn't finish parent setup",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => navigate("/auth/parent")}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to parent auth
        </button>

        <Card className="border-white/10 shadow-strong">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex justify-center">
              <BrandWordmark />
            </div>
            <div className="text-center space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Parent onboarding</p>
              <CardTitle className="text-3xl text-foreground">Set the tone before you open the dashboard.</CardTitle>
              <CardDescription className="mx-auto max-w-2xl text-sm leading-6 text-muted-foreground">
                Xaidus is built to help parents support progress without turning into surveillance. This short setup tunes the experience around how you want to show up.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <ShieldCheck className="mb-3 h-5 w-5 text-accent" />
                <p className="text-sm font-medium text-foreground">Signals, not spying</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">You’ll see effort trends, goals, and conversation prompts. Not private content.</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <HeartHandshake className="mb-3 h-5 w-5 text-accent" />
                <p className="text-sm font-medium text-foreground">Coaching over conflict</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">We shape the dashboard around the support style you want to bring to the week.</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <Sparkles className="mb-3 h-5 w-5 text-accent" />
                <p className="text-sm font-medium text-foreground">Link now or later</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">You can connect a teen during setup, or skip it and do it from the parent portal later.</p>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold text-foreground">Choose your support archetype</Label>
              <div className="grid gap-3 md:grid-cols-3">
                {archetypes.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setArchetype(option.id)}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-colors",
                      archetype === option.id
                        ? "border-accent bg-accent/10"
                        : "border-border/60 bg-background hover:border-accent/40",
                    )}
                  >
                    <p className="text-sm font-medium text-foreground">{option.title}</p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{option.blurb}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold text-foreground">Pick at least three focus areas</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {focusOptions.map((focus) => (
                  <button
                    key={focus}
                    type="button"
                    onClick={() => toggleFocus(focus)}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
                      focuses.includes(focus)
                        ? "border-accent bg-accent/10 text-foreground"
                        : "border-border/60 bg-background text-muted-foreground hover:border-accent/40 hover:text-foreground",
                    )}
                  >
                    {focus}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Selected: {focuses.length}</p>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold text-foreground">Choose your coaching style</Label>
              <div className="grid gap-3 md:grid-cols-3">
                {coachStyles.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setCoachStyle(style.id)}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-colors",
                      coachStyle === style.id
                        ? "border-accent bg-accent/10"
                        : "border-border/60 bg-background hover:border-accent/40",
                    )}
                  >
                    <p className="text-sm font-medium text-foreground">{style.label}</p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{style.detail}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="teenNickname">Teen nickname or first name</Label>
                <Input
                  id="teenNickname"
                  placeholder="Optional: link someone now"
                  value={teenNickname}
                  onChange={(event) => setTeenNickname(event.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="troopCode">Troop / program code</Label>
                <Input
                  id="troopCode"
                  placeholder="Optional"
                  value={troopCode}
                  onChange={(event) => setTroopCode(event.target.value.toUpperCase())}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => navigate("/dashboard")} disabled={loading}>
                Skip for now
              </Button>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleFinish} disabled={!canSubmit || loading}>
                {loading ? "Saving..." : "Finish parent setup"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ParentOnboardingPage;
