import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { scoutApi } from "@/api/endpoints";
import type { ScoutCredential, AnchorStatus } from "@/types/api";

const BADGE_EMOJI: Record<string, string> = {
  momentum_spark: "⚡",
  comeback_core: "💪",
  shrink_to_win: "🎯",
  two_tap_titan: "🌅",
  study_switch: "📚",
  skill_session: "🎸",
  service_signal: "🤝",
  leader_lift: "🌟",
  quiet_power: "🌙",
  plan_true: "✅",
  focus_forge: "🔥",
  proof_pulse: "🏅",
  team_current: "⚡",
  insight_drop: "💡",
  boundary_boss: "🛑",
  future_maker: "🚀",
};

const STREAK_EMOJI = "🔥";

interface ScoutCredentialCardProps {
  credential: ScoutCredential;
  onAcknowledged: () => void;
}

export const ScoutCredentialCard = ({ credential, onAcknowledged }: ScoutCredentialCardProps) => {
  const [loading, setLoading] = useState(false);
  const [anchorStatus, setAnchorStatus] = useState<AnchorStatus>(
    credential.anchorStatus ?? 'none'
  );
  const [anchorHandle, setAnchorHandle] = useState<string | undefined>(
    credential.anchorHandle
  );

  const emoji =
    credential.credentialType === "streak"
      ? STREAK_EMOJI
      : BADGE_EMOJI[credential.badgeKey || ""] || "🏆";

  // On mount, if already submitted, check once for confirmation
  useEffect(() => {
    if (anchorStatus === 'submitted') {
      scoutApi.getAnchorStatus(credential.id).then((res) => {
        setAnchorStatus(res.anchorStatus);
        if (res.anchorHandle) setAnchorHandle(res.anchorHandle);
      }).catch(() => {/* ignore */});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClaim = async () => {
    setLoading(true);
    try {
      const res = await scoutApi.anchorCredential(credential.id);
      setAnchorStatus(res.anchorStatus);
      if (res.anchorHandle) setAnchorHandle(res.anchorHandle);
      onAcknowledged();
    } finally {
      setLoading(false);
    }
  };

  const renderAnchorState = () => {
    if (anchorStatus === 'confirmed') {
      return (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
          <span>Verified on chain ✓</span>
          {anchorHandle && (
            <span className="font-mono text-muted-foreground truncate">
              {anchorHandle.slice(0, 12)}…
            </span>
          )}
        </div>
      );
    }
    if (anchorStatus === 'submitted') {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 text-xs px-2 py-0.5 font-medium">
          Anchored — verification pending (~60 min)
        </span>
      );
    }
    if (anchorStatus === 'failed') {
      return (
        <Button size="sm" variant="destructive" className="w-full text-xs" onClick={handleClaim} disabled={loading}>
          {loading ? "Retrying..." : "Retry"}
        </Button>
      );
    }
    // none
    return (
      <Button size="sm" className="w-full text-xs" onClick={handleClaim} disabled={loading}>
        {loading ? "Claiming..." : "Claim this badge"}
      </Button>
    );
  };

  return (
    <div className="rounded-xl border border-accent/40 bg-accent/5 p-4 space-y-3 animate-in slide-in-from-bottom-2">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{emoji}</span>
        <div className="flex-1">
          <p className="font-semibold text-foreground">{credential.title}</p>
          {credential.badgeFocus && (
            <p className="text-xs text-muted-foreground">{credential.badgeFocus}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            Earned {new Date(credential.earnedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground font-mono truncate" title="Proof hash">
        {credential.proofHash.slice(0, 16)}…
      </p>
      {renderAnchorState()}
    </div>
  );
};
