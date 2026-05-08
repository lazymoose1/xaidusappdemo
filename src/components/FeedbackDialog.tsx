import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquareHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { feedbackApi } from "@/api/endpoints";
import { toast } from "@/hooks/use-toast";

type FeedbackCategory = "bug" | "confusing" | "idea" | "praise" | "safety" | "other";
type FeedbackSentiment = "blocked" | "frustrated" | "neutral" | "happy";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryOptions: Array<{ value: FeedbackCategory; label: string; helper: string }> = [
  { value: "bug", label: "Something broke", helper: "A button, page, login, layout, or flow did not work." },
  { value: "confusing", label: "Confusing", helper: "The app worked, but the next step or wording was unclear." },
  { value: "idea", label: "Idea", helper: "A feature, workflow, or improvement you want us to consider." },
  { value: "praise", label: "Working well", helper: "Something feels useful, clear, or worth keeping." },
  { value: "safety", label: "Trust or safety", helper: "Privacy, age-fit, boundaries, or content concern." },
  { value: "other", label: "Other", helper: "Anything else we should know." },
];

const sentimentOptions: Array<{ value: FeedbackSentiment; label: string }> = [
  { value: "blocked", label: "Blocked" },
  { value: "frustrated", label: "Frustrated" },
  { value: "neutral", label: "Neutral" },
  { value: "happy", label: "Happy" },
];

const FeedbackDialog = ({ open, onOpenChange }: FeedbackDialogProps) => {
  const location = useLocation();
  const [category, setCategory] = useState<FeedbackCategory>("confusing");
  const [sentiment, setSentiment] = useState<FeedbackSentiment>("neutral");
  const [message, setMessage] = useState("");
  const [contactAllowed, setContactAllowed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCategory("confusing");
    setSentiment("neutral");
    setMessage("");
    setContactAllowed(false);
  }, [open]);

  const submitFeedback = async () => {
    const trimmed = message.trim();
    if (trimmed.length < 5) {
      toast({
        title: "Add a little more detail",
        description: "A sentence or two helps us understand what to fix.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await feedbackApi.submit({
        category,
        sentiment,
        message: trimmed,
        page: location.pathname,
        contactAllowed,
      });
      toast({
        title: "Feedback received",
        description: "Thank you. This helps us make Xaidus calmer and clearer.",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Couldn't send feedback",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <MessageSquareHeart className="h-5 w-5 text-foreground" />
          </div>
          <DialogTitle>Share feedback</DialogTitle>
          <DialogDescription>
            Tell us what felt broken, confusing, helpful, or worth improving. Keep private details out of the message.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-2">
            <p className="text-sm font-semibold text-foreground">What kind of feedback is this?</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {categoryOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCategory(option.value)}
                  className={`rounded-[1.15rem] border px-4 py-3 text-left transition-colors ${
                    category === option.value
                      ? "border-accent bg-accent/10"
                      : "border-white/10 bg-white/[0.025] hover:bg-white/[0.05]"
                  }`}
                >
                  <p className="text-sm font-semibold text-foreground">{option.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{option.helper}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-sm font-semibold text-foreground">How did it feel?</p>
            <div className="flex flex-wrap gap-2">
              {sentimentOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSentiment(option.value)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    sentiment === option.value
                      ? "border-accent bg-accent/10 text-foreground"
                      : "border-white/10 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <label htmlFor="app-feedback-message" className="text-sm font-semibold text-foreground">
              What should we know?
            </label>
            <Textarea
              id="app-feedback-message"
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, 2000))}
              placeholder="Example: On mobile, the check-in button was hard to find after I finished a goal."
              rows={6}
            />
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>Current page: {location.pathname}</span>
              <span>{message.length}/2000</span>
            </div>
          </section>

          <label className="flex items-start gap-3 rounded-[1rem] border border-white/10 bg-white/[0.025] px-4 py-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={contactAllowed}
              onChange={(event) => setContactAllowed(event.target.checked)}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <span>You can contact me about this if follow-up would help.</span>
          </label>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={submitFeedback} disabled={submitting}>
              {submitting ? "Sending..." : "Send feedback"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDialog;
