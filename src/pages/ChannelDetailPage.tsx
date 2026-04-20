import { useState } from "react";
import { ArrowLeft, List, Search, MoreVertical, Send, Image as ImageIcon, Users, Info, Paperclip } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { API_BASE } from "@/api/client";
import { supabase } from "@/integrations/supabase/client";
interface Message {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
  attachments?: { url: string; type: string; name?: string }[];
}
const ChannelDetailPage = () => {
  const navigate = useNavigate();
  const {
    channelId
  } = useParams();
  const [message, setMessage] = useState("");
  const [isChannelInfoOpen, setIsChannelInfoOpen] = useState(false);
  const [isMember, setIsMember] = useState(true);

  // Mock channel data
  const channels: Record<string, {
    name: string;
    tag: string;
    members: number;
    messages: Message[];
  }> = {
    "policy-shapers": {
      name: "Policy Shapers",
      tag: "#PolicyShapers",
      members: 2,
      messages: [{
        id: "1",
        author: "Sophia Thomas",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
        content: "Discussion Starter: Today's topic for discussion is the impact of technology on democracy. How do you think advancements in technology are shaping democratic processes in our societies? Are there benefits or drawbacks you've noticed or are particularly concerned about?",
        timestamp: "3/2/2024 10:03 AM"
      }, {
        id: "2",
        author: "Liam Jackson",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
        content: "Weekly Insight: This week we're highlighting an important legislative development: [insert a relevant and recent legislative proposal or enactment]. What are your thoughts on this? How do you see it affecting our community and beyond?",
        timestamp: "3/2/2024 10:03 AM"
      }, {
        id: "3",
        author: "Mia Moore",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
        content: "Debate Invitation: Let's have a friendly debate! The motion: 'The voting age should be lowered to 16.' Whether you're for or against, share your reasoning and let's discuss!",
        timestamp: "3/2/2024 10:03 AM"
      }]
    },
    "announcements": {
      name: "Announcements",
      tag: "#announcements",
      members: 2,
      messages: []
    },
    "general": {
      name: "General",
      tag: "#general",
      members: 8,
      messages: []
    }
  };
  const channel = channels[channelId || ""] || channels["policy-shapers"];
  const [messages, setMessages] = useState<Message[]>(channel.messages);
  const [attachments, setAttachments] = useState<{ url: string; type: string; name?: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const handleSend = () => {
    if (message.trim() || attachments.length > 0) {
      const now = new Date();
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}`,
          author: "You",
          avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop",
          content: message,
          timestamp: now.toLocaleString(),
          attachments
        }
      ]);
      setMessage("");
      setAttachments([]);
    }
  };

  const handleFileSelect = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/api/posts/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Upload failed');
      setAttachments((prev) => [...prev, { url: data.mediaUrl, type: data.mediaType, name: file.name }]);
    } catch (err) {
      console.error('Upload failed', err);
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };
  return <div className="min-h-screen pb-20 bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary border-b border-border h-[15vh] fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center justify-center h-full relative px-4">
          <button aria-label="Go back" onClick={() => navigate(-1)} className="absolute left-4 top-1/2 -translate-y-1/2 text-accent">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="display-title text-2xl text-foreground">xaidus</h1>
        </div>
      </header>

      {/* Channel header */}
      <div className="pt-[15vh] px-4 py-4 border-b border-border bg-background sticky top-[15vh] z-30">
        <div className="flex items-center justify-between my-0">
          <h2 className="font-semibold text-foreground">
            {channel.tag} - {channel.members} peeps
          </h2>
          <div className="flex items-center gap-2">
            <button aria-label="Channel list" className="text-accent">
              <List className="w-5 h-5" />
            </button>
            <button aria-label="Search messages" className="text-accent">
              <Search className="w-5 h-5" />
            </button>
            <Popover open={isChannelInfoOpen} onOpenChange={setIsChannelInfoOpen}>
              <PopoverTrigger asChild>
                <button aria-label="Channel info" className="text-accent">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-background border-border" align="end">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Channel Info
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{channel.members} members</span>
                      </div>
                      <p className="text-muted-foreground">Announcements for the wider Xaidus community.</p>
                      <div className="bg-muted p-2 rounded">
                        <p className="text-xs font-medium text-foreground">Combined Attributes</p>
                        <p className="text-lg font-semibold text-accent">
                          {channel.members * 15} points
                        </p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <Button onClick={() => setIsMember(!isMember)} variant={isMember ? "outline" : "default"} className="w-full">
                      {isMember ? "Leave Channel" : "Join Channel"}
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Messages */}
      <main className="flex-1 px-4 overflow-y-auto my-0 py-px">
        {messages.length === 0 ? <p className="text-center text-muted-foreground py-8">No messages yet</p> : <div className="space-y-6">
            {messages.map(msg => <div key={msg.id} className="flex gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                  <img src={msg.avatar} alt={msg.author} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-semibold text-foreground">{msg.author}</span>
                    <span className="text-xs text-muted-foreground">{msg.timestamp}</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{msg.content}</p>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {msg.attachments.map((att, idx) => (
                        <div key={idx} className="border border-accent/30 rounded-lg p-2 bg-accent/5">
                          {att.type === 'photo' || att.url.match(/\.(png|jpg|jpeg|gif|webp)$/i) ? (
                            <img src={att.url} alt={att.name || 'attachment'} className="max-h-32 rounded" />
                          ) : (
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <Paperclip className="w-4 h-4" />
                              <span className="truncate max-w-[180px]">{att.name || 'file'}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>)}
          </div>}
      </main>

      {/* Message input */}
      <div className="px-4 py-3 border-t border-border bg-background">
        <div className="flex items-center gap-2">
          <Input placeholder="Enter message" value={message} onChange={e => setMessage(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} className="flex-1 border-0 bg-background focus-visible:ring-0" />
          <button
            aria-label="Attach file"
            className="text-muted-foreground"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*,application/pdf';
              input.onchange = () => handleFileSelect(input.files?.[0] || undefined);
              input.click();
            }}
            disabled={uploading}
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <button aria-label="Send message" onClick={handleSend} className="text-accent">
            <Send className="w-5 h-5" />
          </button>
        </div>
        {attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {attachments.map((att, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded-full border border-accent/30 px-3 py-1 bg-accent/5 text-xs text-foreground">
                <span className="truncate max-w-[140px]">{att.name || 'attachment'}</span>
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
      </div>
    </div>;
};
export default ChannelDetailPage;
