import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/i18n";

/** Compact EN/ES toggle. Persists choice via i18next's localStorage detector. */
const LanguageSwitcher = ({ className = "" }: { className?: string }) => {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage || i18n.language || "en";

  return (
    <div className={`inline-flex items-center gap-1 rounded-full border border-white/10 bg-background/60 p-1 ${className}`}>
      <Languages className="ml-1 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      {SUPPORTED_LANGUAGES.map(({ code, label }) => {
        const active = current.startsWith(code);
        return (
          <button
            key={code}
            type="button"
            onClick={() => i18n.changeLanguage(code)}
            aria-pressed={active}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
              active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSwitcher;
