// SocialSSOButtons.tsx
import React from "react";

// Brand assets: Use official SVGs or PNGs for each platform. Placeholder imports below.
// Replace with actual assets in /public or an assets folder.
import amazonLogo from "@/assets/social/amazon.svg";
import snapchatLogo from "@/assets/social/snapchat.svg";
import youtubeLogo from "@/assets/social/youtube.svg";
import facebookLogo from "@/assets/social/facebook.svg";
import instagramLogo from "@/assets/social/instagram.svg";
import xLogo from "@/assets/social/x.svg";
import linkedinLogo from "@/assets/social/linkedin.svg";

const SOCIALS = [
  { name: "Amazon", logo: amazonLogo, provider: "amazon" },
  { name: "Snapchat", logo: snapchatLogo, provider: "snapchat" },
  { name: "YouTube", logo: youtubeLogo, provider: "youtube" },
  { name: "Facebook", logo: facebookLogo, provider: "facebook" },
  { name: "Instagram", logo: instagramLogo, provider: "instagram" },
  { name: "X.com", logo: xLogo, provider: "x" },
  { name: "LinkedIn", logo: linkedinLogo, provider: "linkedin" },
];

// Recommended button size: 48x48px icon, 220x48px button (per most brand guidelines)
// Use accessible labels and alt text.
// Mobile: icon-only; Desktop: icon + label
export const SocialSSOButtons: React.FC<{ onClick: (provider: string, mode?: 'login' | 'link') => void, linkMode?: boolean }> = ({ onClick, linkMode }) => (
  <div className="grid grid-cols-2 gap-2 md:gap-3 w-full max-w-md mx-auto">
    {SOCIALS.map(({ name, logo, provider }) => (
      <button
        key={provider}
        type="button"
        className="flex items-center justify-center md:justify-start gap-2 px-3 py-2 rounded-xl border border-border bg-white hover:bg-accent/30 shadow-sm h-[44px]"
        aria-label={`${linkMode ? 'Link' : 'Sign up with'} ${name}`}
        onClick={() => onClick(provider, linkMode ? 'link' : 'login')}
      >
        <img src={logo} alt={name + ' logo'} className="h-7 w-7 object-contain flex-shrink-0" />
        <span className="hidden md:inline font-medium text-sm text-foreground whitespace-nowrap overflow-hidden text-ellipsis">
          {linkMode ? `Link ${name}` : `Sign up with ${name}`}
        </span>
      </button>
    ))}
  </div>
);
