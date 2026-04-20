import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { onboardingApi, goalsApi } from "@/api/endpoints";
import { useAuth } from "@/providers/AuthProvider";

type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

const goalTemplates = [
  "Turn in missing work",
  "Study 20 min",
  "Check my grades once",
  "Practice (music/sport/skill)",
  "Get outside for 10 min",
  "Message my teacher/coach",
];

const archetypes = [
  {
    id: "strategist",
    title: "Strategist",
    blurb: "Likes planning the next move; treats life like a board game and wins by thinking ahead."
  },
  {
    id: "builder",
    title: "Builder",
    blurb: "Learns by doing; stacks small actions to unlock bigger levels."
  },
  {
    id: "explorer",
    title: "Explorer",
    blurb: "Tests, learns, and pivots fast; plays the game of life by discovering new paths."
  },
  {
    id: "connector",
    title: "Connector",
    blurb: "Team-first; gets energy from sharing and co-op play."
  }
];

const baseInterestOptions = [
  "learning",
  "sports",
  "music",
  "art",
  "coding",
  "writing",
  "health",
  "science",
  "gaming",
  "making money",
  "volunteering",
];

const archetypeInterestMap: Record<string, string[]> = {
  strategist: ["planning", "productivity", "study hacks", "debate", "math", "logic puzzles", "finance", "making money", "coding"],
  builder: ["projects", "crafting", "diy", "woodworking", "3d printing", "coding", "design", "robotics", "making money"],
  explorer: ["travel", "new foods", "photography", "nature", "science", "history", "language learning", "music", "art"],
  connector: ["friends", "community", "volunteering", "mentoring", "public speaking", "clubs", "events", "music", "sports"],
};

const avatars = ["🙂", "😎", "🤓", "🌟", "🎧", "🎮", "🏀", "🎨"];

const dayLabels: Record<DayKey, string> = {
  sun: "Sun",
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
};

function defaultPlannedDays(): Record<DayKey, boolean> {
  const todayIdx = new Date().getDay(); // 0-6 Sun-Sat
  const tomorrowIdx = (todayIdx + 1) % 7;
  const keys: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const map: Record<DayKey, boolean> = {
    sun: false,
    mon: false,
    tue: false,
    wed: false,
    thu: false,
    fri: false,
    sat: false,
  };
  map[keys[todayIdx]] = true;
  map[keys[tomorrowIdx]] = true;
  return map;
}

function generateTinyStep(goal: string) {
  const lower = goal.toLowerCase();
  if (lower.includes("study") || lower.includes("homework")) {
    return "Open your notes and set a 10-minute timer.";
  }
  if (lower.includes("practice")) {
    return "Warm up for 5 minutes, then do one short rep.";
  }
  if (lower.includes("grade")) {
    return "Open your grade portal and check one class.";
  }
  if (lower.includes("message")) {
    return "Draft one short message and hit send.";
  }
  return "Do a 5–10 minute starter step right now.";
}

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  const [step, setStep] = useState(1);
  const [cohortCode, setCohortCode] = useState("");
  const [troopCode, setTroopCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState(avatars[0]);
  const [archetype, setArchetype] = useState<string>(archetypes[0]?.id || "strategist");
  const [interests, setInterests] = useState<string[]>([]);
  const [selectedGoal, setSelectedGoal] = useState(goalTemplates[0]);
  const [customGoal, setCustomGoal] = useState("");
  const [plannedDays, setPlannedDays] = useState<Record<DayKey, boolean>>(defaultPlannedDays());
  const [tinyStep, setTinyStep] = useState(generateTinyStep(goalTemplates[0]));
  const [showGoalTutorial, setShowGoalTutorial] = useState(true);
  const [loading, setLoading] = useState(false);

  const goalTitle = useMemo(() => (customGoal.trim() ? customGoal.trim() : selectedGoal), [customGoal, selectedGoal]);

  // Interest options adapt to archetype; fall back to base list when unknown
  const interestChoices = useMemo(() => {
    return archetypeInterestMap[archetype] || baseInterestOptions;
  }, [archetype]);

  const toggleDay = (key: DayKey) => {
    setPlannedDays((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 6));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  // When archetype changes, keep only interests that still exist in the new set
  // to avoid showing stale tags from another playstyle.
  useEffect(() => {
    setInterests((prev) => prev.filter((i) => interestChoices.includes(i)));
  }, [interestChoices]);

  const handleFinish = async () => {
    if (!user) {
      toast({ title: "Please sign in", description: "Login to finish onboarding.", variant: "destructive" });
      navigate("/auth");
      return;
    }
    if (!goalTitle) {
      toast({ title: "Pick a goal", description: "Choose a template or write your own.", variant: "destructive" });
      return;
    }
    const hasDay = Object.values(plannedDays).some(Boolean);
    if (!hasDay) {
      toast({ title: "Pick days", description: "Choose at least one day for this week.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Save user basics
      await onboardingApi.save({
        cohortCode,
        troopCode,
        nickname: nickname || user.displayName || "",
        avatar,
        interests: interests || [],
        archetype: archetype || "strategist",
      });
      // Refresh local user so needsOnboarding clears immediately
      await refreshProfile();

      // Create goal with planned days + micro step
      await goalsApi.create({
        title: goalTitle,
        category: "weekly",
        description: "First-week goal",
        plannedDays,
        microStep: tinyStep,
      });

      toast({
        title: "You’re in!",
        description: "We’ll nudge you on your days. First tiny step ready.",
      });

      // Cache profile locally for quick reads
      const profile = {
        username: nickname || user.email?.split("@")![0],
        avatar,
        cohortCode,
        troopCode,
        interests,
        archetype,
      };
      sessionStorage.setItem("onboardingSeen", "true");
      navigate("/");
    } catch (err) {
      toast({
        title: "Couldn't finish setup",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-0 shadow-lg max-h-[95vh] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="text-center text-2xl font-serif">
            {step === 1 && "Join your group"}
            {step === 2 && "Pick a nickname"}
            {step === 3 && "Your playstyle"}
            {step === 4 && "Choose one goal"}
            {step === 5 && "Which days this week?"}
            {step === 6 && "You’re set"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 overflow-y-auto flex-1 min-h-0">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-muted"}`}
              />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">Enter your class or troop code. You can add either later if you don’t have it yet.</p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="cohortCode">Class / program code</Label>
                  <Input
                    id="cohortCode"
                    placeholder="e.g., XAIDUS2024"
                    value={cohortCode}
                    onChange={(e) => setCohortCode(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="troopCode">Troop code</Label>
                  <Input
                    id="troopCode"
                    placeholder="e.g., GS-TROOP42"
                    value={troopCode}
                    onChange={(e) => setTroopCode(e.target.value.toUpperCase())}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button className="flex-1" onClick={nextStep}>
                  Start in 1 minute
                </Button>
                <Button variant="ghost" className="flex-1" onClick={nextStep}>
                  Continue as guest
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">What should we call you?</p>
              <div className="space-y-2">
                <Label htmlFor="nickname">Nickname</Label>
                <Input
                  id="nickname"
                  placeholder="Your nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Pick an avatar</Label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {avatars.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAvatar(a)}
                      className={`h-14 rounded-lg border text-2xl ${
                        avatar === a ? "border-accent bg-accent/10" : "border-border"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={prevStep}>
                  Back
                </Button>
                <Button className="flex-1" onClick={nextStep}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">Pick the archetype that matches how you play the game of life.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(archetypes.length ? archetypes : [{ id: "strategist", title: "Strategist", blurb: "Thinks ahead and plans the next move." }]).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setArchetype(a.id)}
                    className={`text-left p-4 rounded-xl border transition hover:shadow-sm ${
                      archetype === a.id ? "border-accent bg-accent/10" : "border-border bg-muted/30"
                    }`}
                  >
                    <div className="font-semibold text-foreground">{a.title}</div>
                    <div className="text-sm text-muted-foreground mt-1 leading-relaxed">{a.blurb}</div>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <Label>What are you into?</Label>
                <div className="flex flex-wrap gap-2">
                  {(interestChoices.length ? interestChoices : ["learning", "sports", "music"]).map((opt) => {
                    const active = interests.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setInterests((prev) =>
                            prev.includes(opt) ? prev.filter((i) => i !== opt) : [...prev, opt]
                          );
                        }}
                        className={`px-3 py-2 rounded-full text-sm border transition ${
                          active ? "border-accent bg-accent/10 text-accent-foreground" : "border-border text-foreground"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Options adapt to your archetype so suggestions feel on-genre.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={prevStep}>
                  Back
                </Button>
                <Button className="flex-1" onClick={nextStep}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              {showGoalTutorial && (
                <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        First goal tutorial
                      </p>
                      <h3 className="text-base font-semibold text-foreground mt-1 break-words">
                        Start with one goal you can actually do this week.
                      </h3>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-xs"
                      onClick={() => setShowGoalTutorial(false)}
                    >
                      Skip tutorial
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>1. Pick one thing that feels realistic, not perfect.</p>
                    <p>2. Choose the days you want to show up for it.</p>
                    <p>3. We’ll turn it into one tiny first step for you.</p>
                  </div>
                </div>
              )}
              <p className="text-center text-muted-foreground">Pick one for this week. You can change it anytime.</p>
              <div className="grid grid-cols-2 gap-2">
                {goalTemplates.map((g) => (
                  <Button
                    key={g}
                    type="button"
                    variant={selectedGoal === g && !customGoal ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => {
                      setSelectedGoal(g);
                      setCustomGoal("");
                      setTinyStep(generateTinyStep(g));
                    }}
                  >
                    {g}
                  </Button>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="customGoal">Or write your own</Label>
                <Input
                  id="customGoal"
                  placeholder="e.g., Finish my history outline"
                  value={customGoal}
                  onChange={(e) => {
                    setCustomGoal(e.target.value);
                    setTinyStep(generateTinyStep(e.target.value));
                  }}
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={prevStep}>
                  Back
                </Button>
                <Button className="flex-1" onClick={nextStep} disabled={!goalTitle}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">Which days this week?</p>
              <div className="grid grid-cols-7 gap-1">
                {(Object.keys(dayLabels) as DayKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleDay(key)}
                    className={`py-2 px-1 rounded-lg border text-xs font-medium ${
                      plannedDays[key] ? "border-accent bg-accent/10 text-accent-foreground" : "border-border text-foreground"
                    }`}
                  >
                    {dayLabels[key]}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={prevStep}>
                  Back
                </Button>
                <Button className="flex-1" onClick={nextStep}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">
                You’re in. We’ll nudge you on your days. First tiny step:
              </p>
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                {tinyStep}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  className="w-full"
                  disabled={loading}
                  onClick={handleFinish}
                >
                  {loading ? "Saving..." : "Do it now"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                  onClick={handleFinish}
                >
                  {loading ? "Saving..." : "Later today"}
                </Button>
              </div>
              <Button variant="ghost" onClick={() => navigate("/")}>Skip for now</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingPage;
