export type TrophyBadge = {
  label: string;
  className: string;
};

export function getLifetimeBadges(completedGoals: number, seasonComplete: boolean): TrophyBadge[] {
  const tiers = [
    {
      threshold: 10_000_000_000,
      label: "Pure Gold",
      className: "bg-gradient-to-r from-amber-200 via-amber-300 to-yellow-200 text-amber-900 border-amber-300",
    },
    {
      threshold: 1_000_000,
      label: "Platinum",
      className: "bg-gradient-to-r from-slate-100 via-slate-200 to-slate-50 text-slate-900 border-slate-300",
    },
    {
      threshold: 10_000,
      label: "Gold",
      className: "bg-gradient-to-r from-yellow-200 to-amber-200 text-amber-900 border-amber-300",
    },
  ];

  const badges: TrophyBadge[] = [];

  tiers.forEach((tier) => {
    if (completedGoals >= tier.threshold) {
      badges.push({ label: tier.label, className: tier.className });
    }
  });

  if (seasonComplete) {
    badges.push({
      label: "Silver Trophy",
      className: "bg-gradient-to-r from-slate-200 to-slate-100 text-slate-800 border-slate-300",
    });
  }

  return badges;
}
