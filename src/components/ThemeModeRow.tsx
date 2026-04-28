import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";

interface ThemeModeRowProps {
  className?: string;
}

const ThemeModeRow = ({ className }: ThemeModeRowProps) => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div className={className}>
      <div className="flex items-start justify-between gap-4 rounded-[1.25rem] border border-border/80 bg-card/90 px-4 py-4 shadow-soft">
        <div className="min-w-0">
          <p className="eyebrow">Appearance</p>
          <h3 className="mt-2 text-base font-semibold text-foreground">Dark mode</h3>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            Default is light mode. Turn on dark mode any time if you want the higher-contrast shell.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 pt-1">
          {isDark ? (
            <Moon className="h-4 w-4 text-foreground" />
          ) : (
            <Sun className="h-4 w-4 text-muted-foreground" />
          )}
          <Switch
            checked={isDark}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            aria-label="Toggle dark mode"
          />
        </div>
      </div>
    </div>
  );
};

export default ThemeModeRow;
