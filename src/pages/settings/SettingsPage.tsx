import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MessageSquare, User, ChevronRight, ImageIcon, VideoIcon, TypeIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import { WeeklyResetButton } from "@/components/WeeklyResetButton";
import { authApi } from "@/api/endpoints";
import BrandWordmark from "@/components/BrandWordmark";
import ProfileFormSection from "./ProfileFormSection";
import ArchetypeSection from "./ArchetypeSection";
import InterestsSection from "./InterestsSection";
import RemindersSection from "./RemindersSection";
import SocialLinksSection from "./SocialLinksSection";
import { useSettingsForm } from "./useSettingsForm";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signOut } = useAuth();

  const form = useSettingsForm();

  // Role change state
  const [pendingRole, setPendingRole] = useState(form.role);
  const [roleCode, setRoleCode] = useState("");
  const [leaderInviteCode, setLeaderInviteCode] = useState("");
  const [roleError, setRoleError] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isApplyingRole, setIsApplyingRole] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  useEffect(() => {
    setPendingRole(form.role);
    setRoleCode("");
    setLeaderInviteCode("");
    setRoleError(null);
    setCodeSent(false);
  }, [form.role]);

  const handleSendRoleCode = async () => {
    if (!pendingRole || pendingRole === form.role) {
      setRoleError("Select a different role first.");
      return;
    }
    setRoleError(null);
    setIsSendingCode(true);
    try {
      await authApi.sendRoleCode(pendingRole);
      setCodeSent(true);
      toast({ title: "Code sent", description: "Check your email for a 6-digit verification code." });
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : "Failed to send code. Try again.");
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleApplyRoleChange = async () => {
    setRoleError(null);
    if (roleCode.trim().length !== 10 || !/^\d{10}$/.test(roleCode.trim())) {
      setRoleError("Enter the 10-digit code from your email.");
      return;
    }
    if (pendingRole === "scout_leader" && !leaderInviteCode.trim()) {
      setRoleError("A leader invite code is required to switch to the Leader role.");
      return;
    }
    setIsApplyingRole(true);
    try {
      await authApi.applyRoleChange(
        pendingRole,
        roleCode.trim(),
        pendingRole === "scout_leader" ? leaderInviteCode.trim() : undefined,
      );
      await form.refreshProfile();
      setRoleCode("");
      setLeaderInviteCode("");
      setCodeSent(false);
      toast({ title: "Role updated", description: `You are now signed in as ${pendingRole}.` });
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : "Invalid or expired code.");
    } finally {
      setIsApplyingRole(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen pb-16 bg-background">
      <header className="app-shell-header h-[15vh] fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center justify-center h-full relative">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Go back"
            onClick={() => navigate(-1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground hover:bg-white/[0.06]"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <BrandWordmark compact />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Messages"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground hover:bg-white/[0.06]"
          >
            <MessageSquare className="w-6 h-6" />
          </Button>
        </div>
        <div className="flex justify-end">
          <WeeklyResetButton />
        </div>
      </header>

      <main className="p-4 pt-[calc(15vh+1rem)] pb-24 space-y-8">
        <h2 className="font-serif text-4xl text-center text-foreground mb-6">
          account settings
        </h2>

        {/* Profile Avatar */}
        <div className="flex flex-col items-center gap-4 pb-6 border-b border-border">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-4 border-border overflow-hidden">
              {form.profileImage ? (
                <img
                  src={form.profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-16 h-16 text-muted-foreground" />
              )}
            </div>
            <label
              htmlFor="profile-pic-upload"
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 cursor-pointer"
            >
              <ChevronRight className="w-8 h-8 text-accent" />
            </label>
            <input
              type="file"
              id="profile-pic-upload"
              accept="image/*"
              onChange={form.handleImageChange}
              className="hidden"
            />
          </div>
          <div className="text-center">
            <h3 className="font-bold text-2xl text-foreground">
              {form.fullname || "Lazy Moose"}
            </h3>
            <p className="text-foreground">{form.username || "lazymoose1"}</p>
          </div>
        </div>

        {/* User Role */}
        <div className="space-y-4 pb-6 border-b border-border">
          <h3 className="text-center font-serif text-xl text-foreground">User Role</h3>
          <p className="text-sm text-muted-foreground text-center leading-relaxed px-4">
            Current role: <span className="font-medium text-foreground capitalize">{form.role?.replace("_", " ")}</span>.
            Select a new role, request a code to your email, then enter it below.
          </p>
          <div className="flex justify-center gap-3 py-2 flex-wrap">
            {(["teen", "parent", "scout_leader"] as const).map((r) => (
              <Button
                key={r}
                variant={pendingRole === r ? "default" : "outline"}
                size="sm"
                className={`capitalize h-11 px-4 text-base ${
                  pendingRole === r ? "bg-accent text-accent-foreground" : ""
                }`}
                onClick={() => { setPendingRole(r); setRoleCode(""); setRoleError(null); setCodeSent(false); }}
                disabled={r === form.role}
              >
                {r === "scout_leader" ? "Leader" : r}
              </Button>
            ))}
          </div>

          {pendingRole !== form.role && (
            <div className="px-4 space-y-3">
              {!codeSent ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleSendRoleCode}
                  disabled={isSendingCode}
                >
                  {isSendingCode ? "Sending..." : `Send code to my email`}
                </Button>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground text-center">
                    A 10-digit code was sent to your email. It expires in 15 minutes.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="role-code" className="text-sm text-foreground font-medium">
                      Verification code
                    </Label>
                    <Input
                      id="role-code"
                      placeholder="10-digit code"
                      inputMode="numeric"
                      maxLength={10}
                      value={roleCode}
                      onChange={(e) => setRoleCode(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>

                  {pendingRole === "scout_leader" && (
                    <div className="space-y-2">
                      <Label htmlFor="leader-invite" className="text-sm text-foreground font-medium">
                        Leader invite code
                      </Label>
                      <Input
                        id="leader-invite"
                        placeholder="Enter leader invite code"
                        value={leaderInviteCode}
                        onChange={(e) => setLeaderInviteCode(e.target.value)}
                      />
                    </div>
                  )}

                  {roleError && <p className="text-xs text-destructive">{roleError}</p>}

                  <Button
                    type="button"
                    className="w-full"
                    onClick={handleApplyRoleChange}
                    disabled={isApplyingRole}
                  >
                    {isApplyingRole ? "Applying..." : `Switch to ${pendingRole === "scout_leader" ? "Leader" : pendingRole}`}
                  </Button>

                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-primary hover:underline w-full text-center"
                    onClick={handleSendRoleCode}
                    disabled={isSendingCode}
                  >
                    {isSendingCode ? "Resending..." : "Resend code"}
                  </button>
                </>
              )}

              {roleError && !codeSent && <p className="text-xs text-destructive">{roleError}</p>}
            </div>
          )}
        </div>

        {/* Feed Type */}
        <div className="space-y-4 pb-6 border-b border-border">
          <h3 className="text-center font-serif text-xl text-foreground">Feed Type</h3>
          <div className="flex justify-center gap-4 py-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Text feed"
              className={`h-12 w-12 ${form.contentMode === "text" ? "border-accent bg-accent/10" : ""}`}
              onClick={() => form.handleContentModeChange("text")}
            >
              <TypeIcon className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Image feed"
              className={`h-12 w-12 ${form.contentMode === "image" ? "border-accent bg-accent/10" : ""}`}
              onClick={() => form.handleContentModeChange("image")}
            >
              <ImageIcon className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Video feed"
              className={`h-12 w-12 ${form.contentMode === "video" ? "border-accent bg-accent/10" : ""}`}
              onClick={() => form.handleContentModeChange("video")}
            >
              <VideoIcon className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="All feed types"
              className={`h-12 w-12 ${form.contentMode === "all" ? "border-accent bg-accent/10" : ""}`}
              onClick={() => form.handleContentModeChange("all")}
            >
              <span className="text-xs font-bold">ALL</span>
            </Button>
          </div>
        </div>

        {/* Form Fields */}
        <ProfileFormSection
          email={form.email}
          onEmailChange={form.setEmail}
          username={form.username}
          onUsernameChange={form.setUsername}
          fullname={form.fullname}
          onFullnameChange={form.setFullname}
          bio={form.bio}
          onBioChange={form.setBio}
          wallet={form.wallet}
          onWalletChange={form.setWallet}
          goals={form.goals}
          onGoalsChange={form.setGoals}
          social={form.social}
          onSocialChange={form.setSocial}
          profileImage={form.profileImage}
          onImageChange={form.handleImageChange}
        />

        {/* Social Links */}
        <SocialLinksSection user={form.user} onRefreshProfile={form.refreshProfile} />

        {/* Archetype */}
        <ArchetypeSection
          archetype={form.archetype}
          onArchetypeChange={form.setArchetype}
        />

        {/* Interests */}
        <InterestsSection
          selectedInterests={form.selectedInterests}
          onToggleInterest={form.toggleInterest}
        />

        {/* Reminders + Goal Days */}
        <RemindersSection
          reminderWindows={form.reminderWindows}
          onToggleWindow={form.toggleReminderWindow}
          coachStyle={form.coachStyle}
          onCoachStyleChange={form.setCoachStyle}
          goalSchedules={form.goalSchedules}
          onRefreshGoals={form.refreshGoalSchedules}
          onUpdateGoalDay={form.updateGoalDay}
        />

        {/* Save Button */}
        <Button
          onClick={form.handleSave}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg py-6 text-base font-semibold mt-8"
        >
          save
        </Button>

        {/* Sign Out */}
        <div className="mt-8 bg-primary/20 rounded-lg p-6 space-y-4">
          <h3 className="font-serif text-2xl text-center text-foreground">
            Time to go?
          </h3>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full py-6 text-base font-semibold border-2"
          >
            SIGN OUT
          </Button>
        </div>

        <div className="text-center py-4">
          <button className="text-muted-foreground text-sm font-semibold tracking-wide hover:text-foreground transition-colors">
            DELETE ACCOUNT
          </button>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
