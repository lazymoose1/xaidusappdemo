import { X, MapPin, Upload, MessageSquare, Search, Film, Image as ImageIcon, Type } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { postsApi, authApi } from "@/api/endpoints";
import { API_BASE, apiFetch } from "@/api/client";
import { useAuth } from "@/providers/AuthProvider";

interface NewPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const NewPostModal = ({ open, onOpenChange, onCreated }: NewPostModalProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [postType, setPostType] = useState<'text' | 'photo' | 'video'>('text');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setSelectedImagePreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Please enter content");
      return;
    }

    if (!user) {
      toast.error("Please sign in to post");
      return;
    }

    setIsSubmitting(true);

    try {
      let mediaUrl: string | undefined;
      let mediaType: 'photo' | 'video' | undefined;

      if (postType !== 'text' && selectedFile) {
        const form = new FormData();
        form.append('file', selectedFile);
        // Use apiFetch-style auth for upload (needs manual fetch for FormData)
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { session: sess } } = await supabase.auth.getSession();
        const uploadRes = await fetch(`${API_BASE}/api/posts/upload`, {
          method: 'POST',
          headers: sess?.access_token ? { Authorization: `Bearer ${sess.access_token}` } : {},
          body: form
        });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadJson?.error || 'Upload failed');
        mediaUrl = uploadJson.mediaUrl;
        mediaType = uploadJson.mediaType;
      }

      await postsApi.create({
        content,
        mediaUrl,
        mediaType,
        visibility: 'public',
        location
      });

      // persist preferred type
      await authApi.saveSettings({ preferredPostType: postType });

      toast.success('Post created!');
      onOpenChange(false);
      setContent('');
      setLocation('');
      setSelectedFile(null);
      setSelectedImagePreview(null);
      onCreated?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Create new post" className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <header className="bg-primary border-b border-border h-14">
        <div className="flex items-center justify-center h-full relative">
          <button
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-accent"
          >
            <X className="w-6 h-6" />
          </button>
          <h1 className="display-title text-2xl text-foreground">xaidus</h1>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-accent" />
            <Search className="w-6 h-6 text-accent" />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-6 pb-20 overflow-y-auto">
        {/* New Post Card */}
        <div className="bg-card rounded-2xl shadow-soft p-6 space-y-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-center relative">
            <h2 className="font-serif text-3xl text-foreground">new post</h2>
            <button
              aria-label="Close"
              onClick={() => onOpenChange(false)}
              className="absolute right-0 top-1/2 -translate-y-1/2"
            >
              <X className="w-6 h-6 text-muted-foreground" />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">content</label>
            <Textarea
              placeholder="Enter content..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none text-base"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">where</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by name or address..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-10 text-base"
              />
            </div>
          </div>

          {/* Post type selector */}
          <div className="grid grid-cols-3 gap-3">
            <Button variant={postType === 'text' ? 'default' : 'outline'} className="flex items-center gap-2" onClick={() => setPostType('text')}><Type className="w-4 h-4" /> Text</Button>
            <Button variant={postType === 'photo' ? 'default' : 'outline'} className="flex items-center gap-2" onClick={() => setPostType('photo')}><ImageIcon className="w-4 h-4" /> Photo</Button>
            <Button variant={postType === 'video' ? 'default' : 'outline'} className="flex items-center gap-2" onClick={() => setPostType('video')}><Film className="w-4 h-4" /> Video</Button>
          </div>

          {/* Media upload for photo/video */}
          {postType !== 'text' && (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">{postType === 'photo' ? 'photo' : 'video'}</label>
              <div className="relative">
                <input
                  type="file"
                  accept={postType === 'photo' ? 'image/*' : 'video/*'}
                  onChange={handleFileChange}
                  className="hidden"
                  id="post-file-upload"
                />
                <label
                  htmlFor="post-file-upload"
                  className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:border-accent transition-colors"
                >
                  {selectedImagePreview ? (
                    <img src={selectedImagePreview} alt="Preview" className="max-h-48 rounded-lg object-cover" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-accent mb-2" />
                      <p className="text-accent text-lg">{postType === 'photo' ? 'Choose Photo' : 'Choose Video'}</p>
                    </>
                  )}
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Create Button - below card */}
        <div className="max-w-2xl mx-auto mt-6">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-14 bg-accent hover:bg-accent/90 text-accent-foreground text-base font-bold rounded-full uppercase tracking-wide disabled:opacity-60"
          >
            {isSubmitting ? 'Posting...' : postType === 'text' ? 'CREATE TEXT POST' : postType === 'photo' ? 'CREATE PHOTO POST' : 'CREATE VIDEO POST'}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default NewPostModal;
