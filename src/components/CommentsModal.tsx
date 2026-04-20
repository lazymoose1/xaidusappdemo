import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Paperclip } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CommentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postContent: string;
}

const CommentsModal = ({ open, onOpenChange, postContent }: CommentsModalProps) => {
  const [comment, setComment] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file.name);
    }
  };

  const handleSubmit = () => {
    console.log({ comment, file: selectedFile });
    onOpenChange(false);
    setComment("");
    setSelectedFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-background border-border p-0 max-h-[85vh] overflow-hidden">
        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="font-serif text-4xl text-foreground">comments</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>

          <ScrollArea className="max-h-[65vh]">
            {/* Post Preview */}
            <div className="p-6 border-b border-border">
              <p className="text-foreground">{postContent}</p>
            </div>

            {/* Comment Input */}
            <div className="p-6 space-y-4">
              <Textarea
                placeholder="Enter Comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[150px] resize-none"
              />

              {selectedFile && (
                <div className="text-sm text-muted-foreground">
                  Selected file: {selectedFile}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleSubmit}
                  className="flex-1 bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]/90 text-accent-foreground py-6 text-base font-semibold rounded-lg"
                >
                  post
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1 bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]/90 text-accent-foreground py-6 text-base font-semibold rounded-lg"
                >
                  <label htmlFor="comment-file" className="flex items-center gap-2 cursor-pointer w-full justify-center">
                    <Paperclip className="w-5 h-5" />
                    add file
                    <input
                      type="file"
                      id="comment-file"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </Button>
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommentsModal;
