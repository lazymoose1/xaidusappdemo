import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ThemeModeRow from "@/components/ThemeModeRow";
import { useAuth } from "@/providers/AuthProvider";
import { authApi, settingsApi } from "@/api/endpoints";
import { useToast } from "@/hooks/use-toast";
import { ORGANIZATION_TYPE_OPTIONS, normalizeOrganizationType } from "@/lib/organization-language";

const ParentSettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [organizationType, setOrganizationType] = useState(normalizeOrganizationType(user?.organizationType));

  // Role-change state (OTP flow)
  const [pendingRole, setPendingRole] = useState<string>(user?.role || "parent");
  const [roleCode, setRoleCode] = useState("");
  const [leaderInviteCode, setLeaderInviteCode] = useState("");
  const [roleError, setRoleError] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isApplyingRole, setIsApplyingRole] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  useEffect(() => {
    if (user) setDisplayName(user.displayName || "");
    if (user) setOrganizationType(normalizeOrganizationType(user.organizationType));
  }, [user]);

  const handleSave = async () => {
    try {
      await settingsApi.savePreferences({ displayName, organizationType });
      await refreshProfile();
      toast({ title: "Saved", description: "Settings updated." });
    } catch (error) {
      toast({ title: "Couldn't save settings", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleSendRoleCode = async () => {
    if (!pendingRole || pendingRole === user?.role) {
      setRoleError("Select a different role first.");
      return;
    }
    setRoleError(null);
    setIsSendingCode(true);
    try {
      await authApi.sendRoleCode(pendingRole);
      setCodeSent(true);
      toast({ title: "Code sent", description: "Check your email for a 10-digit verification code." });
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : "Failed to send code.");
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleApplyRoleChange = async () => {
    setRoleError(null);
    if (!/^\d{10}$/.test(roleCode.trim())) {
      setRoleError("Enter the 10-digit code from your email.");
      return;
    }
    if (pendingRole === "scout_leader" && !leaderInviteCode.trim()) {
      setRoleError("Leader invite code is required.");
      return;
    }
    setIsApplyingRole(true);
    try {
      await authApi.applyRoleChange(
        pendingRole,
        roleCode.trim(),
        pendingRole === "scout_leader" ? leaderInviteCode.trim() : undefined,
      );
      await refreshProfile();
      setRoleCode("");
      setLeaderInviteCode("");
      setCodeSent(false);
      toast({ title: "Role updated", description: `You are now signed in as ${pendingRole.replace("_", " ")}.` });
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : "Invalid or expired code.");
    } finally {
      setIsApplyingRole(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary border-b border-border h-[15vh] fixed top-0 left-0 right-0 z-40 flex items-center px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="text-accent hover:bg-accent/20"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="font-serif text-2xl text-accent mx-auto">settings</h1>
      </header>

      <main className="pt-[calc(15vh+2rem)] pb-24 px-4 max-w-lg mx-auto space-y-8">
        <h2 className="font-serif text-3xl text-center text-foreground">Account</h2>

        {/* Profile */}
        <div className="flex flex-col items-center gap-3 pb-6 border-b border-border">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border">
            <User className="w-10 h-10 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Role: <span className="font-medium text-foreground">Parent</span>
          </p>
          {user?.email && (
            <p className="text-sm text-muted-foreground">{user.email}</p>
          )}
        </div>

        {/* Display name */}
        <div className="space-y-3 pb-6 border-b border-border">
          <h3 className="font-serif text-lg text-foreground">Display name</h3>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
          <Button onClick={handleSave} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
            Save
          </Button>
        </div>

        <div className="space-y-3 pb-6 border-b border-border">
          <h3 className="font-serif text-lg text-foreground">Organization type</h3>
          <Select value={organizationType} onValueChange={(value) => setOrganizationType(normalizeOrganizationType(value))}>
            <SelectTrigger>
              <SelectValue placeholder="Choose organization type" />
            </SelectTrigger>
            <SelectContent>
              {ORGANIZATION_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            This updates organization-specific language across family and staff-facing screens.
          </p>
          <Button onClick={handleSave} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
            Save preferences
          </Button>
        </div>

        {/* Role change */}
        <div className="space-y-4 pb-6 border-b border-border">
          <h3 className="font-serif text-lg text-foreground">Change role</h3>
          <p className="text-sm text-muted-foreground">
            Current role: <span className="font-medium text-foreground">Parent</span>.
            Use this to switch to a different account type.
          </p>
          <div className="flex gap-2 flex-wrap">
            {(["teen", "parent", "scout_leader"] as const).map((r) => (
              <Button
                key={r}
                variant={pendingRole === r ? "default" : "outline"}
                size="sm"
                onClick={() => { setPendingRole(r); setRoleCode(""); setRoleError(null); setCodeSent(false); }}
                disabled={r === user?.role}
              >
                {r === "scout_leader" ? "Leader" : r.charAt(0).toUpperCase() + r.slice(1)}
              </Button>
            ))}
          </div>

          {pendingRole !== user?.role && (
            <div className="space-y-3">
              {!codeSent ? (
                <Button variant="outline" className="w-full" onClick={handleSendRoleCode} disabled={isSendingCode}>
                  {isSendingCode ? "Sending..." : "Send code to my email"}
                </Button>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">A 10-digit code was sent to your email. Expires in 15 minutes.</p>
                  <div className="space-y-2">
                    <Label htmlFor="role-code">Verification code</Label>
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
                      <Label htmlFor="leader-invite">Leader invite code</Label>
                      <Input
                        id="leader-invite"
                        placeholder="Enter leader invite code"
                        value={leaderInviteCode}
                        onChange={(e) => setLeaderInviteCode(e.target.value)}
                      />
                    </div>
                  )}
                  {roleError && <p className="text-xs text-destructive">{roleError}</p>}
                  <Button className="w-full" onClick={handleApplyRoleChange} disabled={isApplyingRole}>
                    {isApplyingRole ? "Applying..." : `Switch to ${pendingRole === "scout_leader" ? "Leader" : pendingRole}`}
                  </Button>
                  <button
                    className="text-xs text-muted-foreground hover:underline w-full text-center"
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

        <div className="space-y-4 pb-6 border-b border-border">
          <ThemeModeRow />
        </div>

        {/* Sign out */}
        <div className="space-y-4">
          <Button variant="outline" onClick={handleSignOut} className="w-full py-6 text-base font-semibold border-2">
            Sign out
          </Button>
          <div className="text-center">
            <button className="text-muted-foreground text-sm hover:text-foreground transition-colors">
              Delete account
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ParentSettingsPage;
