import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { goalsApi, scoutApi } from "@/api/endpoints";
import { toast } from "@/hooks/use-toast";
import type { ScoutGoalSummary } from "@/types/api";

interface ScoutCheckinCardProps {
  goal: ScoutGoalSummary;
  onCheckin: () => void;
}

const EFFORT_LABELS: Record<number, string> = {
  1: "Light — I started",
  2: "Medium — I got going",
  3: "Full — I went all in",
};

const REFLECTION_PROMPTS = [
  "What helped you show up today?",
  "What felt hard? What made it easier?",
  "What's one thing you want to remember?",
];

export const ScoutCheckinCard = ({ goal, onCheckin }: ScoutCheckinCardProps) => {
  const [effortLevel, setEffortLevel] = useState<1 | 2 | 3>(2);
  const [reflection, setReflection] = useState("");
  const [loading, setLoading] = useState(false);
  const [prompt] = useState(() => REFLECTION_PROMPTS[Math.floor(Math.random() * REFLECTION_PROMPTS.length)]);

  const handleCheckin = async (status: "yes" | "not_yet") => {
    setLoading(true);
    try {
      const response = await goalsApi.checkin(goal.id, {
        status,
        ...(status === "yes" ? { effortLevel, reflection: reflection.trim() || undefined } : {}),
      } as any) as any;

      if (status === "yes") {
        await scoutApi.sessionClose();
      }

      const rewardEarned = response?.rewardEarned;
      if (status === "yes") {
        toast({
          title: rewardEarned === "moova" ? "Moova unlocked! 🏆" : "Mark it! 🫸🏾",
          description: rewardEarned === "moova"
            ? "You hit your streak goal. You earned Moova."
            : rewardEarned
            ? "You earned a Mark. Keep going."
            : "Streak keeps going.",
        });
      } else {
        toast({ title: "Noted — you can still check in today." });
      }
      onCheckin();
    } catch (err) {
      toast({ title: "Couldn't save check-in", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Today's goal</p>
        <h3 className="text-base font-semibold text-foreground mt-1">{goal.title}</h3>
        {goal.badgeFocus && (
          <p className="text-xs text-muted-foreground mt-0.5">{goal.badgeFocus}</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">How much effort did you put in?</p>
        <div className="grid grid-cols-3 gap-2">
          {([1, 2, 3] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setEffortLevel(level)}
              className={`p-2 rounded-lg border text-xs text-center transition ${
                effortLevel === level ? "border-accent bg-accent/10" : "border-border"
              }`}
            >
              {EFFORT_LABELS[level]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">{prompt} <span className="italic">(optional — only you can see this)</span></p>
        <Textarea
          placeholder="A few words…"
          value={reflection}
          onChange={(e) => setReflection(e.target.value.slice(0, 500))}
          rows={2}
          className="resize-none text-sm"
        />
      </div>

      <div className="flex gap-3">
        <Button
          className="flex-1 h-11 font-semibold"
          disabled={loading}
          onClick={() => handleCheckin("yes")}
        >
          I did it
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-11"
          disabled={loading}
          onClick={() => handleCheckin("not_yet")}
        >
          Not yet
        </Button>
      </div>
    </div>
  );
};
