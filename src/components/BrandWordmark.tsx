import { cn } from "@/lib/utils";

interface BrandWordmarkProps {
  className?: string;
  compact?: boolean;
  inverted?: boolean;
}

const BrandWordmark = ({ className, compact = false, inverted = false }: BrandWordmarkProps) => {
  return (
    <div className={cn("inline-flex items-center gap-3.5", className)}>
      <img
        src="/xaidus-mark.svg"
        alt="Xaidus"
        className={cn(compact ? "h-8 w-8" : "h-10 w-10")}
      />
      <span
        className={cn(
          "font-sans text-[1.55rem] font-semibold lowercase leading-none tracking-[-0.065em] sm:text-[1.9rem]",
          compact && "text-lg tracking-[-0.06em] sm:text-xl",
          inverted ? "text-primary-foreground" : "text-foreground/95",
        )}
      >
        xaidus
      </span>
    </div>
  );
};

export default BrandWordmark;
