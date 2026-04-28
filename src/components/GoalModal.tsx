import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { API_BASE } from "@/api/client";
import { useAuth } from "@/providers/AuthProvider";
import { callAiWrapper } from "@/services/aiClient";

interface SuggestedGoal {
  id?: string;
  title: string;
  category?: string;
  reason?: string;
}

interface GoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedGoals?: SuggestedGoal[];
  onCreateGoal?: (title: string) => void;
}

const GoalModal = ({ open, onOpenChange, suggestedGoals = [], onCreateGoal }: GoalModalProps) => {
  const { user } = useAuth();
  const [goal, setGoal] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [whyText, setWhyText] = useState("");
  const [showWhy, setShowWhy] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [refining, setRefining] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestedGoal | null>(null);
  const [attachments, setAttachments] = useState<{ name: string; url: string; type: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session: sess } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/api/posts/upload`, {
        method: 'POST',
        headers: sess?.access_token ? { Authorization: `Bearer ${sess.access_token}` } : undefined,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Upload failed');
      setAttachments((prev) => [...prev, { name: file.name, url: data.mediaUrl, type: data.mediaType }]);
    } catch (err) {
      toast({ title: 'Upload failed', description: err instanceof Error ? err.message : 'Could not upload file', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const analyzeGoal = async () => {
    if (!user) {
      toast({ title: "Please log in to use Tiny.", variant: "destructive" });
      return;
    }

    setAnalyzing(true);
    setSuggestion("");
    setWhyText("");
    setShowWhy(false);

    // callAiWrapper never throws — fallback is built in.
    const response = await callAiWrapper({
      goal,
      archetype: typeof user.archetype === 'string' ? user.archetype : undefined,
      interests: Array.isArray(user.interests) ? user.interests : [],
      ageGroup: '14-18',
      socialContext: attachments.length > 0 ? `User attached ${attachments.length} file(s).` : undefined,
    });

    const parts = [response.suggestion];
    if (response.nextStep) parts.push(`Next step: ${response.nextStep}`);
    if (response.timingSuggestion) parts.push(`Timing: ${response.timingSuggestion}`);
    setSuggestion(parts.join('\n\n'));
    setWhyText(response.rationale || "");

    setAnalyzing(false);
  };

  const refineGoal = async () => {
    if (!user) return;

    setRefining(true);

    const response = await callAiWrapper({
      goal: followUp ? `${goal}\n\nAdditional context: ${followUp}` : goal,
      archetype: typeof user.archetype === 'string' ? user.archetype : undefined,
      interests: Array.isArray(user.interests) ? user.interests : [],
      ageGroup: '14-18',
    });

    const parts = [response.suggestion];
    if (response.nextStep) parts.push(`Next step: ${response.nextStep}`);
    if (response.timingSuggestion) parts.push(`Timing: ${response.timingSuggestion}`);
    setSuggestion(parts.join('\n\n'));
    setWhyText(response.rationale || "");
    setShowWhy(false);

    setFollowUp("");
    setRefining(false);
  };

  const handleClose = () => {
    setGoal("");
    setSuggestion("");
    setWhyText("");
    setShowWhy(false);
    setFollowUp("");
    setSelectedSuggestion(null);
    setAttachments([]);
    onOpenChange(false);
  };

  return (
      <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-lg flex-col overflow-hidden rounded-3xl border-white/10 bg-background px-4 py-4 sm:h-[min(44rem,calc(100dvh-2rem))] sm:w-full sm:px-6 sm:py-6">
        <DialogHeader className="gradient-card border-b border-white/10 -mx-4 -mt-4 mb-4 rounded-t-3xl px-4 py-5 flex-shrink-0 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-6">
          <DialogTitle className="text-lg sm:text-xl font-serif text-foreground text-center break-words">
            What's your goal today?
          </DialogTitle>
          <div className="space-y-2 text-center">
            <DialogDescription className="text-xs text-muted-foreground break-words sm:text-sm">
              Share your focus and get personalized guidance
            </DialogDescription>
            {suggestedGoals.length > 0 && (
              <p className="text-xs text-muted-foreground">
                💡 TINY suggests goals based on your progress and interests
              </p>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1 px-1">
          <div className="space-y-4 pb-2 pt-2 overscroll-contain">
          {suggestedGoals.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Suggested Goals</p>
              <div className="grid gap-2">
                {suggestedGoals.map((g, idx) => (
                  <Button key={idx} variant={selectedSuggestion?.title === g.title ? 'default' : 'outline'} className="justify-start h-auto whitespace-normal break-words text-left py-2" onClick={() => { setSelectedSuggestion(g); setGoal(g.title); }}>
                    {g.title}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <div>
            <Textarea
              id="goal"
              placeholder="e.g., Finish my Xaidus landing page..."
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="min-h-[120px] resize-none border-accent/30 focus:border-accent rounded-2xl"
              disabled={analyzing}
            />
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              className="rounded-full h-auto whitespace-normal break-words"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                input.onchange = () => handleFileSelect(input.files?.[0] || undefined);
                input.click();
              }}
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : 'Attach file/image'}
            </Button>
            {attachments.length > 0 && (
              <span className="text-xs text-muted-foreground sm:shrink-0">{attachments.length} attached</span>
            )}
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs text-foreground">
              {attachments.map((file, idx) => (
                <div key={idx} className="flex max-w-full items-center gap-2 rounded-full border border-accent/30 px-3 py-1 bg-accent/5 min-w-0">
                  <span className="truncate max-w-[140px]">{file.name}</span>
                  <button
                    aria-label="Remove attachment"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {!suggestion && (
            <Button
              onClick={analyzeGoal}
              disabled={!goal.trim() || analyzing}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-full py-6"
            >
              {analyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  Ask Tiny
                </>
              )}
            </Button>
          )}

          {suggestion && (
            <div className="space-y-4 animate-fade-in flex-1 min-h-0 flex flex-col">
              <div className="w-full flex-1 min-h-[200px] max-h-[50dvh] overflow-y-auto pr-3 sm:max-h-[70vh]">
                <div className="speech-bubble border-2 border-accent/20">
                  <p className="text-accent leading-relaxed font-medium break-words whitespace-pre-wrap">{suggestion}</p>
                </div>
              </div>

              {whyText && (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowWhy((prev) => !prev)}
                    className="w-full rounded-full border-accent/30 text-foreground h-auto whitespace-normal break-words"
                  >
                    {showWhy ? "Hide why" : "Why"}
                  </Button>

                  {showWhy && (
                    <div className="rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Why this matters
                      </p>
                      <p className="mt-2 text-sm text-foreground leading-relaxed break-words">
                        {whyText}
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="space-y-3">
                <Textarea
                  placeholder="Add more details to refine the suggestion..."
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  className="min-h-[80px] resize-none border-accent/30 focus:border-accent rounded-2xl"
                  disabled={refining}
                />
                
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={refineGoal}
                    disabled={!followUp.trim() || refining}
                    className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-full h-auto whitespace-normal"
                  >
                    {refining ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Refining...
                      </>
                    ) : (
                      "Refine"
                    )}
                  </Button>

                  <Button
                    onClick={handleClose}
                    variant="ghost"
                    className="flex-1 text-accent hover:bg-accent/10 rounded-full h-auto whitespace-normal"
                  >
                    Got it ✓
                  </Button>
                </div>
                {onCreateGoal && goal.trim() && (
                  <Button
                    onClick={() => {
                      onCreateGoal(goal.trim());
                      handleClose();
                    }}
                    variant="outline"
                    className="w-full rounded-full border-accent/30 text-foreground h-auto whitespace-normal break-words"
                  >
                    Set this as a goal →
                  </Button>
                )}
              </div>
            </div>
          )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default GoalModal;
