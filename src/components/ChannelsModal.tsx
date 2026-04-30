import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, Users, MessageSquare, Check, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { threadsApi } from "@/api/endpoints";
import { apiFetch } from "@/api/client";
import { getRoleLabel } from "@/lib/organization-language";

interface ChannelsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserResult {
  id: string;
  displayName: string;
  role?: string;
}

const ChannelsModal = ({ open, onOpenChange }: ChannelsModalProps) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"dm" | "group">("dm");
  const [searchQuery, setSearchQuery] = useState("");
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state and auto-focus search on open
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setUserResults([]);
      setGroupTitle("");
      setSelectedIds([]);
      setSelectedNames([]);
      setTab("dm");
      // Small delay lets the dialog finish mounting
      setTimeout(() => searchRef.current?.focus(), 80);
    }
  }, [open]);

  // User search with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = searchQuery.trim();
    if (!q) {
      setUserResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await apiFetch<{ users: UserResult[] }>(
          `/api/users?q=${encodeURIComponent(q)}&limit=10`,
        );
        setUserResults(data.users || []);
      } catch {
        setUserResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const startDM = async (user: UserResult) => {
    setCreating(true);
    try {
      const resp = await threadsApi.create({
        participantIds: [user.id],
        title: user.displayName,
        type: "dm",
      });
      const threadId = resp.thread?.id;
      if (threadId) navigate(`/messages/${threadId}`);
      onOpenChange(false);
    } catch {
      alert("Could not start chat. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const toggleGroupMember = (user: UserResult) => {
    if (selectedIds.includes(user.id)) {
      const idx = selectedIds.indexOf(user.id);
      setSelectedIds((p) => p.filter((_, i) => i !== idx));
      setSelectedNames((p) => p.filter((_, i) => i !== idx));
    } else {
      setSelectedIds((p) => [...p, user.id]);
      setSelectedNames((p) => [...p, user.displayName]);
    }
  };

  const createGroup = async () => {
    if (selectedIds.length < 1 || !groupTitle.trim()) return;
    setCreating(true);
    try {
      const resp = await threadsApi.create({
        participantIds: selectedIds,
        title: groupTitle.trim(),
        type: "group",
      });
      const threadId = resp.thread?.id;
      if (threadId) navigate(`/messages/${threadId}`);
      onOpenChange(false);
    } catch {
      alert("Could not create group. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        - p-0 overrides default padding
        - gap-0 overrides the default grid gap-4 (prevents extra spacing between children)
        - [&>button:last-child]:hidden suppresses the built-in DialogContent close button
          (it renders as the last direct <button> child, after our {children})
      */}
      <DialogContent className="max-w-md p-0 gap-0 border-border bg-background max-h-[85vh] flex flex-col [&>button:last-child]:hidden sm:rounded-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
          <h2 className="font-serif text-xl text-foreground">New Chat</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-5 pb-3 gap-2 flex-shrink-0">
          {(["dm", "group"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-colors ${
                tab === t
                  ? "bg-accent text-accent-foreground border-accent"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "dm" ? <MessageSquare className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
              {t === "dm" ? "Message" : "Group"}
            </button>
          ))}
        </div>

        {/* Search — sticky, always visible, above scroll area */}
        <div className="px-5 pb-3 flex-shrink-0 space-y-2">
          {tab === "group" && (
            <Input
              placeholder="Group name"
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value.slice(0, 60))}
              className="h-10 text-sm"
            />
          )}
          <div className="flex items-center gap-2 h-10 rounded-lg bg-muted px-3 focus-within:ring-1 focus-within:ring-accent focus-within:bg-background transition-colors">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              ref={searchRef}
              placeholder="Search by name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-muted-foreground hover:text-foreground flex-shrink-0"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Group: selected member chips */}
          {tab === "group" && selectedNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectedNames.map((name, i) => (
                <span
                  key={selectedIds[i]}
                  className="inline-flex items-center gap-1 text-xs bg-accent/10 border border-accent/30 rounded-full px-2.5 py-1 text-foreground"
                >
                  {name}
                  <button
                    onClick={() => {
                      const idx = i;
                      setSelectedIds((p) => p.filter((_, j) => j !== idx));
                      setSelectedNames((p) => p.filter((_, j) => j !== idx));
                    }}
                    className="text-muted-foreground hover:text-foreground ml-0.5"
                    aria-label={`Remove ${name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-border mx-5 flex-shrink-0" />

        {/* Scrollable results */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {searching && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!searching && !searchQuery.trim() && (
            <p className="text-center text-sm text-muted-foreground py-10">
              {tab === "dm" ? "Search for someone to message" : "Search to add people"}
            </p>
          )}

          {!searching && searchQuery.trim() && userResults.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-10">No users found</p>
          )}

          {!searching && userResults.length > 0 && (
            <div>
              {userResults.map((user) => {
                const isSelected = selectedIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    onClick={() => tab === "dm" ? startDM(user) : toggleGroupMember(user)}
                    disabled={creating}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-accent">
                        {user.displayName.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{user.displayName}</p>
                      {user.role && (
                        <p className="text-xs text-muted-foreground">{getRoleLabel(user.role)}</p>
                      )}
                    </div>
                    {tab === "group" && (
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected ? "bg-accent border-accent" : "border-border"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-accent-foreground" strokeWidth={3} />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Group create footer */}
        {tab === "group" && (
          <div className="px-5 py-4 border-t border-border flex-shrink-0">
            <Button
              className="w-full h-10"
              disabled={creating || selectedIds.length < 1 || !groupTitle.trim()}
              onClick={createGroup}
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {selectedIds.length > 0
                ? `Create "${groupTitle || "group"}" with ${selectedIds.length} ${selectedIds.length === 1 ? "person" : "people"}`
                : "Select at least one person"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ChannelsModal;
