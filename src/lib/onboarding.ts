import type { ApiUser } from "@/types/api";

export const userNeedsOnboarding = (user?: ApiUser | null) => {
  if (!user) {
    return true;
  }

  const interests = Array.isArray(user.interests) ? user.interests : [];
  const archetype = typeof user.archetype === "string" ? user.archetype.trim() : "";

  return interests.length < 3 || archetype.length === 0;
};

export const onboardingRouteForRole = (role?: string) => {
  if (role === "parent") {
    return "/onboarding/parent";
  }

  if (role === "scout_leader") {
    return "/onboarding/leader";
  }

  return "/onboarding";
};
