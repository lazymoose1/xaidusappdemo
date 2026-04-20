import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { goalsApi } from "@/api/endpoints";

export function WeeklyResetButton() {
  const handleReset = async () => {
    try {
      await goalsApi.weeklyReset(false);
      toast({ title: 'Weekly reset complete', description: 'Goals carried into the new week.' });
    } catch (err) {
      toast({ title: 'Reset failed', description: err instanceof Error ? err.message : 'Try again later.', variant: 'destructive' });
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleReset}>
      Reset week now
    </Button>
  );
}
