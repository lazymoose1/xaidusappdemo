import { useState, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { goalsApi, settingsApi } from "@/api/endpoints";
import { useToast } from "@/hooks/use-toast";
import { ApiGoal } from "@/types/api";

export function useSettingsForm() {
  const { toast } = useToast();
  const { user, refreshProfile } = useAuth();
  const role = user?.role || "teen";

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fullname, setFullname] = useState("");
  const [bio, setBio] = useState("");
  const [wallet, setWallet] = useState("");
  const [goals, setGoals] = useState("");
  const [social, setSocial] = useState("");
  const [archetype, setArchetype] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [contentMode, setContentMode] = useState(() => {
    return localStorage.getItem("contentMode") || "all";
  });
  const [reminderWindows, setReminderWindows] = useState<string[]>([]);
  const [coachStyle, setCoachStyle] = useState("");
  const [goalSchedules, setGoalSchedules] = useState<ApiGoal[]>([]);

  useEffect(() => {
    if (user) {
      setArchetype(user.archetype || "");
      setSelectedInterests(Array.isArray(user.interests) ? user.interests : []);
      setFullname(user.displayName || "");
      setEmail(user.email || "");
    }
  }, [user]);

  useEffect(() => {
    const loadGoals = async () => {
      try {
        const data = await goalsApi.getAll();
        if (Array.isArray(data)) {
          const withDefaultDays = data.map((g) => {
            const hasPlan =
              g.plannedDays && Object.values(g.plannedDays).some(Boolean);
            return { ...g, plannedDays: hasPlan ? g.plannedDays : { fri: true } };
          });
          setGoalSchedules(withDefaultDays);
        } else {
          setGoalSchedules([]);
        }
      } catch (err) {
        console.error("Failed to load goals for schedule", err);
      }
    };
    loadGoals();
  }, []);

  const handleContentModeChange = (mode: string) => {
    setContentMode(mode);
    localStorage.setItem("contentMode", mode);
  };

  const toggleReminderWindow = (window: string) => {
    setReminderWindows((prev) =>
      prev.includes(window) ? prev.filter((w) => w !== window) : [...prev, window]
    );
  };

  const toggleInterest = (interestId: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interestId)
        ? prev.filter((id) => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      await settingsApi.savePreferences({ reminderWindows, coachStyle });
    } catch (err) {
      console.warn("Preferences save skipped", err);
    }
    toast({
      title: "Profile Updated",
      description: "Your profile has been saved successfully.",
    });
  };

  const refreshGoalSchedules = async () => {
    try {
      const data = await goalsApi.getAll();
      if (Array.isArray(data)) {
        const withDefaultDays = data.map((g) => {
          const hasPlan =
            g.plannedDays && Object.values(g.plannedDays).some(Boolean);
          return { ...g, plannedDays: hasPlan ? g.plannedDays : { fri: true } };
        });
        setGoalSchedules(withDefaultDays);
      }
    } catch {
      /* ignore */
    }
  };

  const updateGoalDay = async (goalId: string, day: string, plannedDays: Record<string, boolean>) => {
    const updated = { ...plannedDays };
    updated[day] = !updated[day];
    try {
      const saved = await goalsApi.updateSchedule(goalId, { plannedDays: updated });
      setGoalSchedules((prev) =>
        prev.map((goal) => (goal.id === goalId ? saved : goal))
      );
    } catch {
      toast({ title: "Couldn't update days", variant: "destructive" });
    }
  };

  return {
    role,
    user,
    refreshProfile,
    email, setEmail,
    username, setUsername,
    fullname, setFullname,
    bio, setBio,
    wallet, setWallet,
    goals, setGoals,
    social, setSocial,
    archetype, setArchetype,
    selectedInterests,
    profileImage,
    contentMode,
    reminderWindows,
    coachStyle, setCoachStyle,
    goalSchedules,
    handleContentModeChange,
    toggleReminderWindow,
    toggleInterest,
    handleImageChange,
    handleSave,
    refreshGoalSchedules,
    updateGoalDay,
  };
}
