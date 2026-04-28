import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { goalsApi } from "@/api/endpoints";

type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

const BADGE_FAMILIES = [
  { key: "cookie_entrepreneur", label: "Cookie Entrepreneur", emoji: "🍪" },
  { key: "stem", label: "STEM", emoji: "🔬" },
  { key: "outdoor_adventure", label: "Outdoor Adventure", emoji: "🌲" },
  { key: "leadership", label: "Leadership", emoji: "⭐" },
  { key: "community_service", label: "Community Service", emoji: "🤝" },
  { key: "arts_crafts", label: "Arts & Crafts", emoji: "🎨" },
  { key: "gold_award", label: "Gold Award Prep", emoji: "🏅" },
  { key: "life_skills", label: "Life Skills", emoji: "🌱" },
];

const CHECK_IN_WINDOWS = [
  { key: "morning", label: "Morning", time: "Before school" },
  { key: "afternoon", label: "Afternoon", time: "After school" },
  { key: "evening", label: "Evening", time: "Before bed" },
];

const SIZE_PRESETS = [
  { key: "5min", label: "5 min", desc: "Quick, daily habit" },
  { key: "10min", label: "10 min", desc: "Short focus session" },
  { key: "20min", label: "20 min", desc: "Full practice block" },
  { key: "custom", label: "My own pace", desc: "No time pressure" },
];

const GOAL_CATEGORIES = [
  { key: "personal", label: "Personal goal" },
  { key: "school", label: "School / academics" },
  { key: "skill", label: "Skill practice" },
  { key: "community", label: "Community / service" },
];

const dayLabels: Record<DayKey, string> = {
  sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat",
};

function defaultDays(): Record<DayKey, boolean> {
  return { sun: false, mon: true, tue: false, wed: true, thu: false, fri: false, sat: false };
}

const ScoutOnboardingPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [badgeFocus, setBadgeFocus] = useState(BADGE_FAMILIES[0].key);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalCategoryTag, setGoalCategoryTag] = useState<string>("personal");
  const [sizePreset, setSizePreset] = useState<string>("10min");
  const [plannedDays, setPlannedDays] = useState<Record<DayKey, boolean>>(defaultDays());
  const [checkInWindows, setCheckInWindows] = useState<string[]>(["morning"]);
  const [loading, setLoading] = useState(false);

  const nextStep = () => setStep((s) => Math.min(s + 1, 5));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const toggleDay = (key: DayKey) =>
    setPlannedDays((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleWindow = (w: string) =>
    setCheckInWindows((prev) =>
      prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]
    );

  const hasDay = Object.values(plannedDays).some(Boolean);

  const handleFinish = async () => {
    if (!goalTitle.trim()) {
      toast({ title: "Add a goal", description: "What are you working on this week?", variant: "destructive" });
      return;
    }
    if (!hasDay) {
      toast({ title: "Pick a day", description: "Choose at least one day this week.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await goalsApi.create({
        title: goalTitle.trim(),
        category: "weekly",
        plannedDays,
        source: "manual",
        badgeFocus,
        goalCategoryTag: goalCategoryTag as 'school' | 'skill' | 'community' | 'personal',
        sizePreset: sizePreset as '5min' | '10min' | '20min' | 'custom',
        checkInWindows,
      });

      toast({ title: "You're in!", description: "First tiny step is ready." });
      navigate("/");
    } catch (err) {
      toast({
        title: "Couldn't save",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-3 py-6 sm:px-5 sm:items-center sm:py-8">
      <Card className="w-full max-w-2xl border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-serif">
            {step === 1 && "What badge are you working on?"}
            {step === 2 && "Set your goal for this week"}
            {step === 3 && "How big is your step?"}
            {step === 4 && "Which days this week?"}
            {step === 5 && "When do you check in?"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress bar */}
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-muted"}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">Pick the badge family you're focusing on. You can change this anytime.</p>
              <div className="grid grid-cols-2 gap-2">
                {BADGE_FAMILIES.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setBadgeFocus(b.key)}
                    className={`p-3 rounded-xl border text-left text-sm transition ${
                      badgeFocus === b.key ? "border-accent bg-accent/10" : "border-border bg-muted/20"
                    }`}
                  >
                    <span className="text-xl mr-2">{b.emoji}</span>
                    {b.label}
                  </button>
                ))}
              </div>
              <Button className="w-full" onClick={nextStep}>Continue</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="goalTitle">What's your goal this week?</Label>
                <Input
                  id="goalTitle"
                  placeholder="e.g., Practice cookie pitch 3 times"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>What kind of goal is this?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {GOAL_CATEGORIES.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setGoalCategoryTag(c.key)}
                      className={`p-2 rounded-lg border text-sm ${
                        goalCategoryTag === c.key ? "border-accent bg-accent/10" : "border-border"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={prevStep}>Back</Button>
                <Button className="flex-1" onClick={nextStep} disabled={!goalTitle.trim()}>Continue</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">How long will your check-in session be? Smaller is better — you can always do more.</p>
              <div className="grid grid-cols-2 gap-3">
                {SIZE_PRESETS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSizePreset(s.key)}
                    className={`p-4 rounded-xl border text-left transition ${
                      sizePreset === s.key ? "border-accent bg-accent/10" : "border-border bg-muted/20"
                    }`}
                  >
                    <div className="font-semibold text-sm">{s.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={prevStep}>Back</Button>
                <Button className="flex-1" onClick={nextStep}>Continue</Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">Which days will you work on this goal?</p>
              <div className="grid grid-cols-7 gap-1">
                {(Object.keys(dayLabels) as DayKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleDay(key)}
                    className={`p-2 rounded-lg border text-xs ${
                      plannedDays[key] ? "border-accent bg-accent/10 text-accent-foreground" : "border-border text-foreground"
                    }`}
                  >
                    {dayLabels[key]}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={prevStep}>Back</Button>
                <Button className="flex-1" onClick={nextStep} disabled={!hasDay}>Continue</Button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">When works best for you to check in? (Pick all that work.)</p>
              <div className="space-y-2">
                {CHECK_IN_WINDOWS.map((w) => (
                  <button
                    key={w.key}
                    type="button"
                    onClick={() => toggleWindow(w.key)}
                    className={`w-full p-3 rounded-xl border text-left flex justify-between items-center text-sm transition ${
                      checkInWindows.includes(w.key) ? "border-accent bg-accent/10" : "border-border"
                    }`}
                  >
                    <span className="font-medium">{w.label}</span>
                    <span className="text-muted-foreground text-xs">{w.time}</span>
                  </button>
                ))}
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                No notifications — Xaidus will remind you in-app when you open it on your check-in days.
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={prevStep}>Back</Button>
                <Button className="flex-1" disabled={loading} onClick={handleFinish}>
                  {loading ? "Saving..." : "Start tracking"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScoutOnboardingPage;
