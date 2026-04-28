import { cn } from "@/lib/utils";

type AuthLoadingVariant = "teen" | "parent" | "leader";

type AuthLoadingOverlayProps = {
  title: string;
  description: string;
  variant?: AuthLoadingVariant;
  className?: string;
};

const pulseDelays = ["0ms", "180ms", "360ms"] as const;

export default function AuthLoadingOverlay({
  title,
  description,
  variant = "teen",
  className,
}: AuthLoadingOverlayProps) {
  const variantMap = {
    teen: {
      outerRing: "animate-[spin_4.6s_linear_infinite] border-t-accent border-r-accent/50",
      coreGlow: "bg-accent/15",
      dots: ["bg-accent", "bg-foreground", "bg-accent/70"],
      eyebrow: "Syncing your next move",
    },
    parent: {
      outerRing: "animate-[pulse_2.4s_ease-in-out_infinite] border-accent/40",
      coreGlow: "bg-accent/10",
      dots: ["bg-foreground/80", "bg-accent/70", "bg-foreground/55"],
      eyebrow: "Gathering a calm snapshot",
    },
    leader: {
      outerRing: "animate-[spin_8s_linear_infinite] border-t-foreground/75 border-r-transparent border-b-accent/45 border-l-transparent",
      coreGlow: "bg-foreground/10",
      dots: ["bg-foreground", "bg-foreground/75", "bg-accent/70"],
      eyebrow: "Opening your workspace",
    },
  } as const;

  const selected = variantMap[variant];

  return (
    <div
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] border border-white/10 bg-background/92 p-6 backdrop-blur-md",
        className,
      )}
    >
      <div className="w-full max-w-xs text-center">
        <div className="relative mx-auto mb-5 flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-border/80 bg-gradient-to-br from-muted/70 via-background to-accent/10 shadow-medium" />
          <div className="absolute inset-2 rounded-full border border-white/10" />
          <div className={cn("absolute h-16 w-16 rounded-full border", selected.outerRing)} />
          <div className={cn("absolute h-10 w-10 rounded-full blur-sm", selected.coreGlow)} />
          <div className="absolute flex items-center gap-1.5">
            {pulseDelays.map((delay, index) => (
              <span
                key={delay}
                className={cn(
                  "h-2.5 w-2.5 rounded-full shadow-[0_0_18px_rgba(255,255,255,0.22)] animate-[bounce_1.2s_infinite]",
                  selected.dots[index],
                )}
                style={{ animationDelay: delay }}
              />
            ))}
          </div>
        </div>
        <p className="eyebrow mb-2">{selected.eyebrow}</p>
        <p className="text-lg font-semibold tracking-[-0.02em] text-foreground">{title}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
