import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { ApiTodayGoal } from "@/types/api";
import type { TeenHomePrimaryAction } from "@/pages/index/resolveTeenHomePrimaryAction";

interface CrystalBallProps {
  progress: number;
  todayGoals?: ApiTodayGoal[];
  onTinyClick: () => void;
  onAddGoalClick: () => void;
  primaryAction: TeenHomePrimaryAction;
}

const CrystalBall = ({
  progress,
  onTinyClick,
  onAddGoalClick,
  primaryAction,
}: CrystalBallProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleTinyClick = async () => {
    setIsLoading(true);
    try {
      onTinyClick();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex items-end justify-center w-full max-w-[420px] mx-auto min-h-[380px] pt-4">
      <div className="relative flex flex-col items-center breathing">
        <div className="relative w-[290px] h-[290px] rounded-full">
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.24)_0%,rgba(255,255,255,0.14)_16%,rgba(175,184,193,0.1)_40%,rgba(52,56,61,0.92)_100%)] shadow-[0_36px_80px_rgba(0,0,0,0.55)]" />
          <div className="absolute inset-[6px] rounded-full border border-white/20 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.18)_0%,rgba(230,234,238,0.08)_36%,rgba(111,115,120,0.08)_60%,rgba(13,15,18,0.92)_100%)] backdrop-blur-sm overflow-hidden">
            <div className="absolute left-[8%] right-[8%] top-[9%] h-[36%] rounded-full bg-white/10 blur-xl" />
            <div className="absolute left-[16%] top-[14%] w-[24%] h-[32%] rounded-full bg-white/18 blur-md" />
            <div className="absolute right-[15%] top-[12%] w-[20%] h-[28%] rounded-full bg-white/10 blur-md" />
            <div className="absolute inset-x-[7%] bottom-[18%] h-[36%] rounded-[50%] bg-[linear-gradient(180deg,rgba(255,255,255,0.01)_0%,rgba(45,50,56,0.55)_100%)]" />
            <div className="absolute left-[12%] right-[12%] bottom-[24%] h-px bg-white/10" />
          </div>

          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="145"
              cy="145"
              r="126"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx="145"
              cy="145"
              r="126"
              stroke="rgba(255, 255, 255, 0.92)"
              strokeWidth="10"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 126}`}
              strokeDashoffset={`${2 * Math.PI * 126 * (1 - progress / 100)}`}
              className="transition-all duration-700 ease-out"
              strokeLinecap="round"
            />
          </svg>

          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 px-6">
            <span className="font-bold text-white tracking-tight text-5xl drop-shadow-sm">{progress}%</span>
          </div>
        </div>

        <div className="relative -mt-4 w-[150px] h-[28px] rounded-full bg-[linear-gradient(180deg,#3d3d40_0%,#242427_55%,#111114_100%)] shadow-[inset_0_3px_6px_rgba(255,255,255,0.12),0_8px_18px_rgba(0,0,0,0.45)]" />
        <Button
          id="tiny-primary-cta"
          data-testid="tiny-primary-cta"
          data-primary-action={primaryAction}
          onClick={handleTinyClick}
          disabled={isLoading}
          variant="ghost"
          className="relative -mt-2 w-[232px] h-[76px] rounded-[999px] border border-white/12 bg-[linear-gradient(180deg,#f5f5f5_0%,#d7d7da_48%,#bababe_100%)] text-black hover:text-black hover:bg-[linear-gradient(180deg,#ffffff_0%,#ececef_48%,#d0d0d4_100%)] shadow-[inset_0_10px_18px_rgba(255,255,255,0.4),0_18px_32px_rgba(0,0,0,0.35),0_0_0_6px_rgba(255,255,255,0.04)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[inset_0_10px_18px_rgba(255,255,255,0.42),0_22px_36px_rgba(0,0,0,0.42),0_0_0_8px_rgba(255,255,255,0.06)] disabled:opacity-60"
        >
          <div className="absolute left-[14%] right-[14%] top-[16%] h-[36%] rounded-full bg-white/30 blur-sm" />
          <span className="relative z-10 flex items-center gap-2 text-center text-[1.15rem] sm:text-[1.35rem] font-bold tracking-[0.18em] leading-tight uppercase">
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                TINY
              </>
            ) : (
              <>
                <span>TINY</span>
              </>
            )}
          </span>
        </Button>
      </div>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Add goal"
        onClick={onAddGoalClick}
        className="absolute right-[18px] top-1/2 -translate-y-[36%] bg-black/70 border-2 border-white/14 text-white hover:bg-white hover:text-black hover:border-white w-11 h-11 rounded-full transition-all duration-300 shadow-soft"
      >
        <span className="text-xl font-light">+</span>
      </Button>
    </div>
  );
};

export default CrystalBall;
