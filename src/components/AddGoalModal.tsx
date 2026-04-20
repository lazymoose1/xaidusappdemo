import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { goalsApi } from "@/api/endpoints";
import { useAuth } from "@/providers/AuthProvider";
import { ARCHETYPE_SUGGESTIONS, DEFAULT_ARCHETYPE, normalizeArchetype } from "@/lib/archetypes";

interface AddGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoalAdded?: () => void;
  initialTitle?: string;
  initialMicroStep?: string;
}

const DAY_LABELS = [
  { key: 'mon', label: 'Mo' },
  { key: 'tue', label: 'Tu' },
  { key: 'wed', label: 'We' },
  { key: 'thu', label: 'Th' },
  { key: 'fri', label: 'Fr' },
  { key: 'sat', label: 'Sa' },
  { key: 'sun', label: 'Su' },
];

const CATEGORIES = [
  { value: 'health', label: 'Health' },
  { value: 'learning', label: 'Learning' },
  { value: 'career', label: 'Career' },
  { value: 'creativity', label: 'Creativity' },
  { value: 'relationships', label: 'Relationships' },
  { value: 'personal', label: 'Personal' },
];

function getDefaultDays() {
  const today = new Date().getDay();
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const tomorrow = (today + 1) % 7;
  const result: Record<string, boolean> = {};
  DAY_LABELS.forEach((d) => (result[d.key] = false));
  result[dayKeys[today]] = true;
  result[dayKeys[tomorrow]] = true;
  return result;
}

const AddGoalModal = ({
  open,
  onOpenChange,
  onGoalAdded,
  initialTitle = '',
  initialMicroStep = '',
}: AddGoalModalProps) => {
  const { user } = useAuth();
  const archetype = normalizeArchetype(user?.archetype) || DEFAULT_ARCHETYPE;

  const [title, setTitle] = useState(initialTitle);
  const [plannedDays, setPlannedDays] = useState<Record<string, boolean>>(getDefaultDays());
  const [category, setCategory] = useState('personal');
  const [microStep, setMicroStep] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setPlannedDays(getDefaultDays());
      setCategory('personal');
      setMicroStep(initialMicroStep);
    }
  }, [open, initialTitle, initialMicroStep]);

  const toggleDay = (key: string) => {
    setPlannedDays((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedCount = Object.values(plannedDays).filter(Boolean).length;

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "What's the goal?", description: "Enter a goal title to continue.", variant: "destructive" });
      return;
    }
    if (selectedCount === 0) {
      toast({ title: "Pick at least one day", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await goalsApi.create({
        title: title.trim(),
        category,
        microStep: microStep.trim() || undefined,
        plannedDays,
      });
      toast({ title: "Goal set." });
      onOpenChange(false);
      onGoalAdded?.();
    } catch {
      toast({ title: "Couldn't save goal", description: "Try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const suggestions = (
    ARCHETYPE_SUGGESTIONS[archetype as keyof typeof ARCHETYPE_SUGGESTIONS] ||
    ARCHETYPE_SUGGESTIONS[DEFAULT_ARCHETYPE]
  ).slice(0, 4);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md bg-background border-primary rounded-3xl max-h-[90vh] overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
        <DialogHeader className="bg-primary -mx-4 -mt-4 px-4 py-5 mb-4 rounded-t-3xl sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-6">
          <DialogTitle className="text-lg sm:text-xl font-serif text-accent text-center break-words">Set a goal</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pb-2">
          {/* Quick-start suggestions */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Quick start</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s.title}
                  onClick={() => {
                    setTitle(s.title);
                    if (s.category) setCategory(s.category as string);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-normal break-words text-left ${
                    title === s.title
                      ? 'bg-accent text-accent-foreground border-accent'
                      : 'border-accent/20 text-foreground hover:border-accent/40'
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Goal</label>
            <Input
              autoFocus
              placeholder="e.g., Read for 15 minutes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-accent/20 focus:border-accent"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>

          {/* Day picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Which days?</label>
            <div className="flex gap-1.5">
              {DAY_LABELS.map((d) => (
                <button
                  key={d.key}
                  onClick={() => toggleDay(d.key)}
                  className={`flex-1 min-w-0 h-10 rounded-lg text-xs font-semibold transition-colors ${
                    plannedDays[d.key]
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedCount} day{selectedCount !== 1 ? 's' : ''}/week
            </p>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Category <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-normal break-words text-left ${
                    category === c.value
                      ? 'bg-accent/20 border-accent text-foreground font-medium'
                      : 'border-border text-muted-foreground hover:border-accent/30'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Micro-step */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              First small action <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              placeholder="The smallest step to start (e.g., open the book)"
              value={microStep}
              onChange={(e) => setMicroStep(e.target.value)}
              className="border-accent/20 focus:border-accent"
              maxLength={100}
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !title.trim() || selectedCount === 0}
            className="w-full rounded-full py-5 sm:py-6 font-semibold text-sm sm:text-base whitespace-normal break-words"
          >
            {saving ? 'Saving…' : 'Set goal'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddGoalModal;
