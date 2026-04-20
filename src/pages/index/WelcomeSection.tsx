import { useNavigate } from "react-router-dom";
import RewardsPanel from "@/components/RewardsPanel";
import type { TrophyBadge } from "@/lib/badges";

interface WelcomeSectionProps {
  username: string;
  profileImage: string;
  bio: string;
  lifetimeBadges: TrophyBadge[];
}

const WelcomeSection = ({
  username,
  profileImage,
  bio,
  lifetimeBadges,
}: WelcomeSectionProps) => {
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-2xl px-4">
      <div className="surface-panel p-4 sm:p-5 space-y-3">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate("/settings")}
            className="w-14 h-14 rounded-[1.2rem] overflow-hidden border border-white/10 bg-white/[0.04] shadow-soft flex-shrink-0 hover:border-white/20 transition-all duration-300"
          >
            <img
              src={profileImage}
              alt="Profile"
              className="w-full h-full object-cover"
              decoding="async"
              sizes="64px"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop";
              }}
            />
          </button>
          <div className="min-w-0">
            <p className="eyebrow">Your space</p>
            <h2 className="display-title text-[1.9rem] sm:text-[2.2rem] text-foreground tracking-tight break-words">
              {username}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
              {bio}
            </p>
          </div>
        </div>

        {lifetimeBadges.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {lifetimeBadges.map((badge) => (
              <span
                key={badge.label}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border border-white/10 bg-white/[0.04] shadow-soft break-words ${badge.className}`}
              >
                {badge.label}
              </span>
            ))}
          </div>
        )}

        <RewardsPanel />
      </div>
    </div>
  );
};

export default WelcomeSection;
