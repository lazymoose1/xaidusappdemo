import { Compass, HeartHandshake, ShieldCheck, Sparkles, Users, Waypoints } from "lucide-react";

type Variant = "teen" | "adult" | "parent" | "leader";

const content: Record<
  Variant,
  {
    title: string;
    items: Array<{
      label: string;
      detail: string;
      icon: typeof Sparkles;
    }>;
  }
> = {
  teen: {
    title: "How new users get started",
    items: [
      {
        label: "Pick one small goal",
        detail: "New users start with a short setup flow that turns big pressure into one clear next step.",
        icon: Compass,
      },
      {
        label: "Check in fast",
        detail: "The daily rhythm is designed to take seconds, not become another thing to manage.",
        icon: Sparkles,
      },
      {
        label: "Build a record",
        detail: "Progress, streaks, and achievements stack into a record that feels useful beyond the app.",
        icon: Waypoints,
      },
    ],
  },
  adult: {
    title: "Choose the path that fits you",
    items: [
      {
        label: "Parents get signals, not surveillance",
        detail: "The parent path focuses on effort trends, conversation prompts, and calmer support.",
        icon: ShieldCheck,
      },
      {
        label: "Leaders guide the whole group",
        detail: "The leader path is built for troop and program setup, nudges, weekly resets, and credentials.",
        icon: Users,
      },
      {
        label: "Everyone gets onboarding",
        detail: "Each role now gets its own tutorial and first-run setup instead of being dropped straight into the app.",
        icon: HeartHandshake,
      },
    ],
  },
  parent: {
    title: "What parents can expect",
    items: [
      {
        label: "Support without snooping",
        detail: "You see momentum, goals, and suggested conversation starters, not private posts or messages.",
        icon: ShieldCheck,
      },
      {
        label: "A calmer weekly rhythm",
        detail: "The parent onboarding flow helps you pick a coaching style before your first dashboard visit.",
        icon: HeartHandshake,
      },
      {
        label: "Link your teen when ready",
        detail: "You can connect a teen during onboarding or come back and do it later from the dashboard.",
        icon: Users,
      },
    ],
  },
  leader: {
    title: "What leaders set up first",
    items: [
      {
        label: "Choose your coaching style",
        detail: "Leader onboarding tunes the experience before you start managing scouts, students, or cohorts.",
        icon: Compass,
      },
      {
        label: "Prepare your program space",
        detail: "After onboarding, you land in the leader dashboard ready to create a troop or organization space.",
        icon: Users,
      },
      {
        label: "Guide progress with proof",
        detail: "The workflow is built around nudges, weekly resets, and verifiable achievements instead of admin sprawl.",
        icon: Waypoints,
      },
    ],
  },
};

export const AuthExplainer = ({ variant }: { variant: Variant }) => {
  const block = content[variant];

  return (
    <div className="mb-6 space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{block.title}</p>
      <div className="space-y-3">
        {block.items.map(({ label, detail, icon: Icon }) => (
          <div key={label} className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 p-3">
            <div className="mt-0.5 rounded-xl bg-accent/10 p-2 text-accent">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs leading-5 text-muted-foreground">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
