import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Award, Compass, Users } from "lucide-react";

import { onboardingApi, settingsApi } from "@/api/endpoints";
import BrandWordmark from "@/components/BrandWordmark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";

const archetypes = [
  {
    id: "strategist",
    title: "Strategist",
    blurb: "You like clear structure, visible progress, and steady weekly routines across the whole group.",
  },
  {
    id: "connector",
    title: "Connector",
    blurb: "You lead through belonging, encouragement, and small signals that keep people engaged.",
  },
  {
    id: "builder",
    title: "Builder",
    blurb: "You focus on systems that make consistent action easier for everyone in the cohort.",
  },
];

const focusAreas = [
  "badge progress",
  "community service",
  "leadership growth",
  "school readiness",
  "wellness routines",
  "creative confidence",
  "attendance and follow-through",
  "group momentum",
];

const coachStyles = [
  { id: "calm", label: "Calm", detail: "Gentle prompts, low drama, and room for recovery." },
  { id: "structured", label: "Structured", detail: "Clear cadence, clearer expectations, and visible checkpoints." },
  { id: "celebratory", label: "Celebratory", detail: "Highlight wins early and use recognition to build momentum." },
];

const LeaderOnboardingPage = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  const [archetype, setArchetype] = useState(archetypes[0].id);
  const [coachStyle, setCoachStyle] = useState(coachStyles[1].id);
  const [focuses, setFocuses] = useState(focusAreas.slice(0, 3));
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => focuses.length >= 3 && archetype.length > 0, [focuses, archetype]);

  const toggleFocus = (focus: string) => {
    setFocuses((current) =>
      current.includes(focus) ? current.filter((item) => item !== focus) : [...current, focus],
    );
  };

  const handleFinish = async () => {
    if (!user) {
      navigate("/auth/leader");
      return;
    }

    if (focuses.length < 3) {
      toast({
        title: "Pick at least three focus areas",
        description: "This helps tailor your leader dashboard and next steps.",
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
      await refreshProfile();

      toast({
        title: "Leader setup complete",
        description: "Your dashboard is ready for troop or program setup.",
      });

      navigate("/leader");
    } catch (error) {
      toast({
        title: "Couldn't finish leader setup",
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
          onClick={() => navigate("/auth/leader")}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to leader auth
        </button>

        <Card className="border-white/10 shadow-strong">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex justify-center">
              <BrandWordmark />
            </div>
            <div className="text-center space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Leader onboarding</p>
              <CardTitle className="text-3xl text-foreground">Shape the leadership experience before launch.</CardTitle>
              <CardDescription className="mx-auto max-w-2xl text-sm leading-6 text-muted-foreground">
                This setup tells Xaidus how you guide your cohort so the dashboard, nudges, and recognition flows feel intentional from day one.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <Users className="mb-3 h-5 w-5 text-accent" />
                <p className="text-sm font-medium text-foreground">Set up your group space</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">After onboarding, you’ll land in the leader dashboard ready to create a troop or program hub.</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <Compass className="mb-3 h-5 w-5 text-accent" />
                <p className="text-sm font-medium text-foreground">Guide with the right tone</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Your coaching style influences how nudges and week-to-week momentum feel for the group.</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <Award className="mb-3 h-5 w-5 text-accent" />
                <p className="text-sm font-medium text-foreground">Recognize progress with proof</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Badges, service hours, and milestones become part of a portable record instead of staying trapped in chat.</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-base font-semibold text-foreground">Choose your leader archetype</p>
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
              <p className="text-base font-semibold text-foreground">Pick at least three focus areas</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {focusAreas.map((focus) => (
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
              <p className="text-base font-semibold text-foreground">Choose your coaching style</p>
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

            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">What happens next</p>
              <div className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
                <p>1. Open the leader dashboard.</p>
                <p>2. Create your troop, school, or program space.</p>
                <p>3. Add scouts or students, then start issuing nudges and credentials.</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => navigate("/leader")} disabled={loading}>
                Skip for now
              </Button>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleFinish} disabled={!canSubmit || loading}>
                {loading ? "Saving..." : "Finish leader setup"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeaderOnboardingPage;
