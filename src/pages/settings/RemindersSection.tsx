import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell } from "lucide-react";
import { ApiGoal } from "@/types/api";
import { useToast } from "@/hooks/use-toast";

interface RemindersSectionProps {
  reminderWindows: string[];
  onToggleWindow: (w: string) => void;
  coachStyle: string;
  onCoachStyleChange: (v: string) => void;
  goalSchedules: ApiGoal[];
  onRefreshGoals: () => void;
  onUpdateGoalDay: (goalId: string, day: string, plannedDays: Record<string, boolean>) => void;
}

const RemindersSection = ({
  reminderWindows,
  onToggleWindow,
  coachStyle,
  onCoachStyleChange,
  goalSchedules,
  onRefreshGoals,
  onUpdateGoalDay,
}: RemindersSectionProps) => {
  return (
    <>
      <div className="space-y-3 border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-xl font-semibold">Reminders</h3>
        </div>
        <p className="text-sm text-muted-foreground">Pick when you want nudges.</p>
        <div className="flex flex-wrap gap-2">
          {["before_school", "after_school", "evening"].map((w) => (
            <Button
              key={w}
              type="button"
              variant={reminderWindows.includes(w) ? "default" : "outline"}
              onClick={() => onToggleWindow(w)}
            >
              {w === "before_school" && "Before school"}
              {w === "after_school" && "After school"}
              {w === "evening" && "Evening"}
            </Button>
          ))}
        </div>
        <div className="space-y-2">
          <Label>Coach style</Label>
          <Select value={coachStyle} onValueChange={onCoachStyleChange}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hype">Hype</SelectItem>
              <SelectItem value="calm">Calm</SelectItem>
              <SelectItem value="blunt">Blunt but kind</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border border-border rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Goal days</h3>
          <Button size="sm" onClick={onRefreshGoals}>
            Refresh
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Tap days to adjust when you want reminders.
        </p>
        <div className="space-y-3">
          {goalSchedules.map((g) => (
            <div key={g.id} className="rounded-lg border border-border p-3">
              <p className="font-semibold">{g.title}</p>
              <div className="mt-2 grid grid-cols-7 gap-2">
                {["sun", "mon", "tue", "wed", "thu", "fri", "sat"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`p-2 text-sm rounded border ${
                      g.plannedDays?.[d]
                        ? "border-accent bg-accent/10"
                        : "border-border"
                    }`}
                    onClick={() => onUpdateGoalDay(g.id, d, g.plannedDays || {})}
                  >
                    {d.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default RemindersSection;
