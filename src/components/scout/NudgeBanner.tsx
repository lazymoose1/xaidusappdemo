import { useState } from "react";
import { Button } from "@/components/ui/button";
import { scoutApi } from "@/api/endpoints";
import { toast } from "@/hooks/use-toast";
import type { ScoutNudge } from "@/types/api";

interface NudgeBannerProps {
  nudge: ScoutNudge;
  onDismiss: () => void;
}

export const NudgeBanner = ({ nudge, onDismiss }: NudgeBannerProps) => {
  const [loading, setLoading] = useState(false);

  const handleAcknowledge = async (goalCompleted?: boolean) => {
    setLoading(true);
    try {
      await scoutApi.nudgeBack(nudge.id, goalCompleted);
      onDismiss();
      if (goalCompleted) {
        toast({ title: "Nice! Your leader will see that.", description: "" });
      }
    } catch {
      toast({ title: "Couldn't send response", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <span className="text-lg">👋</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Your leader sent you a nudge</p>
          {nudge.message && (
            <p className="text-sm text-muted-foreground mt-0.5">{nudge.message}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 text-xs"
          disabled={loading}
          onClick={() => handleAcknowledge(true)}
        >
          Done! I checked in
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs"
          disabled={loading}
          onClick={() => handleAcknowledge(false)}
        >
          Got it, on it
        </Button>
      </div>
    </div>
  );
};
