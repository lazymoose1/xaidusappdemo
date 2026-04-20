import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ParentDisclaimerModalProps {
  open: boolean;
  onClose: () => void;
}

const ParentDisclaimerModal = ({ open, onClose }: ParentDisclaimerModalProps) => {
  const [hasSeenDisclaimer, setHasSeenDisclaimer] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem('parentPortalDisclaimerSeen');
    setHasSeenDisclaimer(!!seen);
  }, []);

  const handleAccept = () => {
    sessionStorage.setItem('parentPortalDisclaimerSeen', 'true');
    setHasSeenDisclaimer(true);
    onClose();
  };

  if (hasSeenDisclaimer) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Welcome to Parent Portal</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[55vh] pr-3">
          <div className="text-sm text-muted-foreground leading-relaxed pt-4 space-y-4">
            <p>
              This space is designed to help you support progress through calm weekly snapshots and better conversations.
            </p>
            <p>
              Please use these insights to notice effort, ask thoughtful questions, and build trust rather than inspect private moments.
            </p>
            <p className="text-sm text-muted-foreground">
              You’ll see respectful summaries here, not private messages or detailed reflections.
            </p>
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAccept}>
            I Understand
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ParentDisclaimerModal;
