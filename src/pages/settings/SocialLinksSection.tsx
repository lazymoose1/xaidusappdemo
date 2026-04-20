import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SocialSSOButtons } from "@/components/SocialSSOButtons";
import type { ApiUser } from "@/types/api";

interface SocialLinksSectionProps {
  user: ApiUser | null;
  onRefreshProfile: () => void;
}

const SocialLinksSection = ({ user, onRefreshProfile }: SocialLinksSectionProps) => {
  return (
    <div className="space-y-3 pb-6 border-b border-border">
      <h3 className="text-center font-serif text-xl text-foreground">Link Socials</h3>
      <p className="text-sm text-muted-foreground text-center leading-relaxed px-4">
        Link your profiles to sign in faster and personalize recommendations.
      </p>
      <div className="flex justify-center">
        <SocialSSOButtons
          onClick={(provider, mode) => {
            const path =
              mode === "link"
                ? `/api/auth/${provider}/link`
                : `/api/auth/${provider}/login`;
            window.location.href = path;
          }}
          linkMode={true}
        />
      </div>
      <div className="flex flex-wrap gap-2 justify-center mt-3">
        {["google", "facebook", "twitter", "linkedin", "amazon", "snapchat"].map((p) => {
          const userRecord = user as Record<string, unknown> | null;
          const social = userRecord?.social as Record<string, unknown> | undefined;
          const linked = !!(social && social[`${p}Id`]);
          return (
            <Badge
              key={p}
              variant={linked ? "default" : "outline"}
              className={`${linked ? "bg-accent text-accent-foreground" : ""} capitalize`}
            >
              {p}: {linked ? "linked" : "not linked"}
            </Badge>
          );
        })}
      </div>
      <div className="flex justify-center mt-2">
        <Button variant="outline" size="sm" onClick={onRefreshProfile}>
          Refresh
        </Button>
      </div>
    </div>
  );
};

export default SocialLinksSection;
