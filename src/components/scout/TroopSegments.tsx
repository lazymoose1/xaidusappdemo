import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { troopApi } from "@/api/endpoints";
import { toast } from "@/hooks/use-toast";
import type { TroopSegmentEntry } from "@/types/api";

interface TroopSegmentsProps {
  segments: {
    active: TroopSegmentEntry[];
    at_risk: TroopSegmentEntry[];
    inactive: TroopSegmentEntry[];
  };
  onNudgeSent: () => void;
}

const SegmentSection = ({
  label,
  color,
  scouts,
  onNudge,
}: {
  label: string;
  color: string;
  scouts: TroopSegmentEntry[];
  onNudge: (id: string, nickname: string) => void;
}) => {
  if (!scouts.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <h3 className="text-sm font-medium text-foreground">{label}</h3>
        <span className="text-xs text-muted-foreground">({scouts.length})</span>
      </div>
      <div className="space-y-1.5">
        {scouts.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm text-foreground break-words">{s.nickname}</p>
              <p className="text-xs text-muted-foreground">{s.daysThisWeek} day{s.daysThisWeek !== 1 ? "s" : ""} this week</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 shrink-0 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onNudge(s.id, s.nickname)}
            >
              Nudge
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TroopSegments = ({ segments, onNudgeSent }: TroopSegmentsProps) => {
  const [nudgingId, setNudgingId] = useState<string | null>(null);
  const [nudgingName, setNudgingName] = useState("");
  const [nudgeMsg, setNudgeMsg] = useState("");
  const [sending, setSending] = useState(false);

  const openNudge = (id: string, nickname: string) => {
    setNudgingId(id);
    setNudgingName(nickname);
    setNudgeMsg("");
  };

  const sendNudge = async () => {
    if (!nudgingId) return;
    setSending(true);
    try {
      await troopApi.sendNudge(nudgingId, nudgeMsg.trim() || undefined);
      toast({ title: `Nudge sent to ${nudgingName}` });
      setNudgingId(null);
      onNudgeSent();
    } catch {
      toast({ title: "Couldn't send nudge", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <SegmentSection
        label="Active — checked in 3+ days"
        color="bg-green-500"
        scouts={segments.active}
        onNudge={openNudge}
      />
      <SegmentSection
        label="At risk — 1–2 days"
        color="bg-amber-400"
        scouts={segments.at_risk}
        onNudge={openNudge}
      />
      <SegmentSection
        label="Inactive — no check-ins yet"
        color="bg-muted-foreground"
        scouts={segments.inactive}
        onNudge={openNudge}
      />

      {/* Nudge compose modal */}
      {nudgingId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4" onClick={() => setNudgingId(null)}>
          <div
            className="w-full max-w-md rounded-2xl bg-card border border-border p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-foreground">Nudge {nudgingName}</h3>
            <Input
              placeholder="Optional message (max 200 chars)…"
              value={nudgeMsg}
              maxLength={200}
              onChange={(e) => setNudgeMsg(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Scout will see this in-app — they can reply or mark a goal done.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setNudgingId(null)} disabled={sending}>Cancel</Button>
              <Button className="flex-1" onClick={sendNudge} disabled={sending}>
                {sending ? "Sending…" : "Send nudge"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
