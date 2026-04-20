import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { troopApi, scoutAuthApi } from "@/api/endpoints";
import type { TroopDashboard, TroopSegmentEntry, ScoutPortableRecord } from "@/types/api";
import { TroopSegments } from "@/components/scout/TroopSegments";
import { useAuth } from "@/providers/AuthProvider";
import { ArrowLeft, Award, Clock, Shield, ChevronRight } from "lucide-react";
import { userNeedsOnboarding } from "@/lib/onboarding";

const BADGE_FAMILIES = [
  "Cookie Entrepreneur", "STEM", "Outdoor Adventure", "Leadership",
  "Community Service", "Arts & Crafts", "Gold Award Prep", "Life Skills",
];

const CREDENTIAL_TYPES = [
  { value: "bronze_award", label: "Bronze Award", icon: "🥉", description: "Girl Scout Bronze Award completion" },
  { value: "silver_award", label: "Silver Award", icon: "🥈", description: "Girl Scout Silver Award completion" },
  { value: "gold_award", label: "Gold Award", icon: "🥇", description: "Girl Scout Gold Award completion" },
  { value: "badge_milestone", label: "Badge milestone", icon: "📛", description: "Official badge completion" },
  { value: "troop_award", label: "Troop award", icon: "⭐", description: "Leader-issued troop recognition" },
] as const;

const credentialLabel: Record<string, string> = {
  bronze_award: "Bronze Award 🥉",
  silver_award: "Silver Award 🥈",
  gold_award: "Gold Award 🥇",
  badge_milestone: "Badge 📛",
  troop_award: "Troop Award ⭐",
  service_hours: "Service Hours 🤝",
  streak: "Streak 🔥",
  goal_complete: "Goal Complete ✅",
  badge: "Badge 📛",
};

type View = "dashboard" | "create_troop" | "add_scout" | "award_credential" | "scout_record";

export const LeaderDashboardPage = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [dashboard, setDashboard] = useState<TroopDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetLoading, setResetLoading] = useState(false);
  const [view, setView] = useState<View>("dashboard");

  // Troop creation form
  const [troopName, setTroopName] = useState("");
  const [troopCode, setTroopCode] = useState("");
  const [creatingTroop, setCreatingTroop] = useState(false);

  // Add scout form
  const [scoutNickname, setScoutNickname] = useState("");
  const [scoutPin, setScoutPin] = useState("");
  const [scoutBadge, setScoutBadge] = useState(BADGE_FAMILIES[0]);
  const [addingScout, setAddingScout] = useState(false);

  // Award credential form
  const [credentialScoutId, setCredentialScoutId] = useState("");
  const [credentialType, setCredentialType] = useState<string>("badge_milestone");
  const [credentialTitle, setCredentialTitle] = useState("");
  const [serviceHours, setServiceHours] = useState("");
  const [serviceProject, setServiceProject] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [awarding, setAwarding] = useState(false);

  // Scout record view
  const [scoutRecord, setScoutRecord] = useState<ScoutPortableRecord | null>(null);
  const [recordLoading, setRecordLoading] = useState(false);

  const fetchDashboard = async () => {
    try {
      const d = await troopApi.getDashboard();
      setDashboard(d);
    } catch (err: any) {
      const msg = err.message || '';
      // Only redirect to create-troop if the server explicitly says there's no troop.
      // Network errors, 403s, and 500s during restarts should not wipe the view.
      if (msg.includes('No troop found') || msg.includes('No troop')) {
        setView("create_troop");
      }
      // Otherwise keep the current view so a transient error doesn't lose state.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "scout_leader" && userNeedsOnboarding(user)) {
      navigate("/onboarding/leader");
      return;
    }
    fetchDashboard();
  }, [navigate, user]);

  const allScouts: TroopSegmentEntry[] = dashboard
    ? [
        ...dashboard.segments.active,
        ...dashboard.segments.at_risk,
        ...dashboard.segments.inactive,
      ]
    : [];

  const handleCreateTroop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!troopName.trim() || !troopCode.trim()) {
      toast({ title: "Fill in both fields", variant: "destructive" });
      return;
    }
    setCreatingTroop(true);
    try {
      await troopApi.create({ name: troopName.trim(), troopCode: troopCode.trim() });
      toast({ title: "Troop created!" });
      setView("dashboard");
      fetchDashboard();
    } catch (err: any) {
      toast({ title: "Couldn't create troop", description: err.message, variant: "destructive" });
    } finally {
      setCreatingTroop(false);
    }
  };

  const handleAddScout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scoutNickname.trim() || !/^\d{4,6}$/.test(scoutPin)) {
      toast({ title: "Nickname and 4–6 digit PIN required", variant: "destructive" });
      return;
    }
    setAddingScout(true);
    try {
      const result = await scoutAuthApi.createScout({
        nickname: scoutNickname.trim(),
        pin: scoutPin,
        badgeFocus: scoutBadge,
      });
      toast({
        title: `${result.nickname} added!`,
        description: `Troop code: ${result.troopCode} — share with the scout.`,
      });
      setScoutNickname("");
      setScoutPin("");
      setView("dashboard");
      fetchDashboard();
    } catch (err: any) {
      toast({ title: "Couldn't add scout", description: err.message, variant: "destructive" });
    } finally {
      setAddingScout(false);
    }
  };

  const handleWeeklyReset = async () => {
    if (!confirm("Trigger the weekly reset for your whole troop? This marks the end of the week for everyone.")) return;
    setResetLoading(true);
    try {
      const result = await troopApi.weeklyReset();
      toast({
        title: "Weekly reset complete",
        description: `${result.completedCount}/${result.totalScouts} scouts reset (${Math.round(result.completionRate * 100)}%)`,
      });
      fetchDashboard();
    } catch {
      toast({ title: "Reset failed", variant: "destructive" });
    } finally {
      setResetLoading(false);
    }
  };

  const handleAwardCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentialScoutId) {
      toast({ title: "Select a scout first", variant: "destructive" });
      return;
    }
    setAwarding(true);
    try {
      if (credentialType === "service_hours") {
        // handled by separate form below — shouldn't reach here
      } else {
        await troopApi.awardBadge({
          toUserId: credentialScoutId,
          badgeTitle: credentialTitle.trim() || CREDENTIAL_TYPES.find((c) => c.value === credentialType)?.label || credentialType,
          credentialType: credentialType as any,
        });
      }
      toast({ title: "Credential awarded", description: "It's now part of their permanent, verifiable record." });
      setCredentialTitle("");
      setCredentialScoutId("");
      setView("dashboard");
      fetchDashboard();
    } catch (err: any) {
      toast({ title: "Award failed", description: err.message, variant: "destructive" });
    } finally {
      setAwarding(false);
    }
  };

  const handleLogServiceHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentialScoutId || !serviceHours) {
      toast({ title: "Select a scout and enter hours", variant: "destructive" });
      return;
    }
    setAwarding(true);
    try {
      await troopApi.logServiceHours({
        toUserId: credentialScoutId,
        hours: parseFloat(serviceHours),
        projectName: serviceProject.trim() || undefined,
        description: serviceDesc.trim() || undefined,
      });
      toast({ title: "Service hours logged", description: "Added to their verifiable record." });
      setServiceHours("");
      setServiceProject("");
      setServiceDesc("");
      setCredentialScoutId("");
      setView("dashboard");
      fetchDashboard();
    } catch (err: any) {
      toast({ title: "Couldn't log hours", description: err.message, variant: "destructive" });
    } finally {
      setAwarding(false);
    }
  };

  const openScoutRecord = async (scoutId: string) => {
    setView("scout_record");
    setRecordLoading(true);
    try {
      const record = await troopApi.getScoutRecord(scoutId);
      setScoutRecord(record);
    } catch {
      toast({ title: "Couldn't load record", variant: "destructive" });
      setView("dashboard");
    } finally {
      setRecordLoading(false);
    }
  };

  const isServiceHoursMode = credentialType === ("service_hours");

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="bg-primary border-b border-border py-3 px-4 flex items-center justify-between gap-3 sticky top-0 z-40">
        <div className="flex items-center gap-2 min-w-0">
          {view !== "dashboard" && view !== "create_troop" && (
            <button onClick={() => setView("dashboard")} className="text-accent mr-1">
              <ArrowLeft size={18} />
            </button>
          )}
          <h1 className="font-serif text-lg sm:text-xl text-accent truncate">xaidus — Leader</h1>
        </div>
        <button onClick={() => navigate("/settings/leader")} className="text-xs text-muted-foreground hover:text-foreground shrink-0">Settings</button>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        )}

        {/* ── Create troop ─────────────────────────────────────────────── */}
        {!loading && view === "create_troop" && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-serif break-words">Set up your troop</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Xaidus works as a digital extension of your badge work — every goal and check-in becomes a verifiable record that travels with each girl.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTroop} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="troopName">Troop name</Label>
                  <Input id="troopName" placeholder="e.g., Troop 42" value={troopName} onChange={(e) => setTroopName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="troopCode">Choose a troop code</Label>
                  <Input
                    id="troopCode"
                    placeholder="e.g., GS-TROOP42"
                    value={troopCode}
                    onChange={(e) => setTroopCode(e.target.value.toUpperCase())}
                  />
                  <p className="text-xs text-muted-foreground break-words">Scouts use this code to log in. You can also use your council's official troop number.</p>
                </div>
                <Button type="submit" className="w-full" disabled={creatingTroop}>
                  {creatingTroop ? "Creating…" : "Create troop"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── Add scout ────────────────────────────────────────────────── */}
        {!loading && view === "add_scout" && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-serif">Add a scout</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddScout} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="scoutNickname">Nickname</Label>
                  <Input id="scoutNickname" placeholder="Scout's nickname" value={scoutNickname} onChange={(e) => setScoutNickname(e.target.value)} />
                  <p className="text-xs text-muted-foreground">No last names needed — this is what they'll see in the app.</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="scoutPin">Set a PIN (4–6 digits)</Label>
                  <Input id="scoutPin" type="password" inputMode="numeric" maxLength={6} placeholder="••••" value={scoutPin} onChange={(e) => setScoutPin(e.target.value.replace(/\D/g, ''))} />
                  <p className="text-xs text-muted-foreground">Share this PIN with the scout directly — not over chat.</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="scoutBadge">Badge focus</Label>
                  <select
                    id="scoutBadge"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={scoutBadge}
                    onChange={(e) => setScoutBadge(e.target.value)}
                  >
                    {BADGE_FAMILIES.map((b) => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="outline" className="flex-1" type="button" onClick={() => setView("dashboard")}>Cancel</Button>
                  <Button type="submit" className="flex-1" disabled={addingScout}>
                    {addingScout ? "Adding…" : "Add scout"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── Award credential / log service hours ─────────────────────── */}
        {!loading && view === "award_credential" && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-lg text-foreground">Document achievement</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Every entry is hashed and permanently recorded — Bronze, Silver, and Gold awards become independently verifiable credentials that transfer if a girl moves to a new troop.
              </p>
            </div>

            {/* Credential type selector */}
            <div className="grid grid-cols-1 gap-2">
              {CREDENTIAL_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  onClick={() => setCredentialType(ct.value)}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    credentialType === ct.value
                      ? "border-accent bg-accent/5"
                      : "border-border bg-background hover:bg-muted/40"
                  }`}
                >
                  <span className="text-2xl">{ct.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{ct.label}</p>
                    <p className="text-xs text-muted-foreground">{ct.description}</p>
                  </div>
                </button>
              ))}
              <button
                onClick={() => setCredentialType("service_hours")}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                  credentialType === ("service_hours")
                    ? "border-accent bg-accent/5"
                    : "border-border bg-background hover:bg-muted/40"
                }`}
              >
                <span className="text-2xl">🤝</span>
                <div>
                  <p className="text-sm font-medium">Service hours</p>
                  <p className="text-xs text-muted-foreground">Log and verify community service time</p>
                </div>
              </button>
            </div>

            {/* Scout selector */}
            <div className="space-y-1">
              <Label>Scout</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={credentialScoutId}
                onChange={(e) => setCredentialScoutId(e.target.value)}
              >
                <option value="">Select a scout…</option>
                {allScouts.map((s) => (
                  <option key={s.id} value={s.id}>{s.nickname}</option>
                ))}
              </select>
            </div>

            {/* Service hours form */}
            {isServiceHoursMode ? (
              <form onSubmit={handleLogServiceHours} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="serviceHours">Hours</Label>
                  <Input
                    id="serviceHours"
                    type="number"
                    min="0.5"
                    step="0.5"
                    placeholder="e.g., 4"
                    value={serviceHours}
                    onChange={(e) => setServiceHours(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="serviceProject">Project name (optional)</Label>
                  <Input
                    id="serviceProject"
                    placeholder="e.g., Community Garden"
                    value={serviceProject}
                    onChange={(e) => setServiceProject(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="serviceDesc">Notes (optional)</Label>
                  <Input
                    id="serviceDesc"
                    placeholder="Brief description of the work"
                    value={serviceDesc}
                    onChange={(e) => setServiceDesc(e.target.value)}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="outline" className="flex-1" type="button" onClick={() => setView("dashboard")}>Cancel</Button>
                  <Button type="submit" className="flex-1" disabled={awarding}>
                    {awarding ? "Logging…" : "Log service hours"}
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAwardCredential} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="credTitle">Custom title (optional)</Label>
                  <Input
                    id="credTitle"
                    placeholder={CREDENTIAL_TYPES.find((c) => c.value === credentialType)?.label || "Award title"}
                    value={credentialTitle}
                    onChange={(e) => setCredentialTitle(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" type="button" onClick={() => setView("dashboard")}>Cancel</Button>
                  <Button type="submit" className="flex-1" disabled={awarding}>
                    {awarding ? "Awarding…" : "Award & record"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── Scout portable record ─────────────────────────────────────── */}
        {!loading && view === "scout_record" && (
          <div className="space-y-4">
            {recordLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              </div>
            ) : scoutRecord ? (
              <>
                <div>
                  <h2 className="font-serif text-lg text-foreground break-words">{scoutRecord.nickname}</h2>
                  <p className="text-xs text-muted-foreground">
                    Troop <span className="font-mono">{scoutRecord.troopCode}</span> · {scoutRecord.credentials.length} credentials
                  </p>
                </div>

                <Card className="border-accent/20 bg-accent/5">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-start gap-2">
                      <Shield className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        This record is portable. If {scoutRecord.nickname} transfers to another troop, every credential here — including awards and service hours — moves with her and remains independently verifiable.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {scoutRecord.credentials.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No credentials yet.</p>
                ) : (
                  <div className="space-y-2">
                    {scoutRecord.credentials.map((c) => (
                      <Card key={c.id} className="border-0 shadow-sm">
                        <CardContent className="pt-3 pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium break-words">{c.title}</p>
                              <p className="text-xs text-muted-foreground break-words">
                                {credentialLabel[c.credentialType] || c.credentialType} · {new Date(c.earnedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              {c.anchorStatus === 'confirmed' && (
                                <span className="text-xs text-green-600 font-medium">Verified ✓</span>
                              )}
                              {c.anchorStatus === 'submitted' && (
                                <span className="text-xs text-muted-foreground">Pending</span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono mt-1 truncate opacity-60">
                            {c.proofHash.slice(0, 20)}…
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* ── Main dashboard ────────────────────────────────────────────── */}
        {!loading && view === "dashboard" && dashboard && (
          <>
            {/* Troop header */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground break-words">{dashboard.troop.name}</h2>
                <p className="text-xs text-muted-foreground break-words">Code: <span className="font-mono">{dashboard.troop.troopCode}</span> · {dashboard.totalScouts} scouts</p>
              </div>
              <Button size="sm" className="shrink-0 whitespace-normal" onClick={() => setView("add_scout")}>+ Scout</Button>
            </div>

            {/* Weekly reset */}
            <Card className="border-0 shadow-sm border-accent/20 bg-accent/5">
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-semibold text-foreground">Weekly reset</span>
                  <span className="font-semibold shrink-0">{Math.round(dashboard.weeklyResetRate * 100)}%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Close the week clearly so scouts come back to one fresh goal and one next step.
                </p>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${dashboard.weeklyResetRate >= 0.7 ? "bg-green-500" : "bg-accent"}`}
                    style={{ width: `${Math.round(dashboard.weeklyResetRate * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {dashboard.weeklyResetRate >= 0.7
                    ? "Most of the troop is current this week."
                    : `${Math.round((0.7 - dashboard.weeklyResetRate) * dashboard.totalScouts)} more resets needed to keep the whole troop current.`}
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleWeeklyReset}
                  disabled={resetLoading}
                >
                  {resetLoading ? "Resetting…" : "Run weekly reset"}
                </Button>
              </CardContent>
            </Card>

            {/* Participation and nudges */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground">Participation and nudges</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <TroopSegments segments={dashboard.segments} onNudgeSent={fetchDashboard} />
                {/* Scout record links */}
                {allScouts.length > 0 && (
                  <div className="pt-3 border-t border-border mt-3 space-y-1">
                    {allScouts.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => openScoutRecord(s.id)}
                        className="w-full flex items-center justify-between gap-3 py-1.5 px-1 text-left hover:bg-muted/40 rounded"
                      >
                        <span className="text-sm text-foreground break-words min-w-0">{s.nickname}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {s.credentialCount !== undefined && s.credentialCount > 0 && (
                            <span>{s.credentialCount} credentials</span>
                          )}
                          <ChevronRight size={14} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Document achievement */}
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-accent" />
                  <h3 className="text-sm font-semibold text-foreground">Document achievement</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Award Bronze, Silver, or Gold achievements and log service hours. Each entry is permanently hashed — no paperwork needed to prove it later.
                </p>
                <Button variant="outline" className="w-full" onClick={() => setView("award_credential")}>
                  Award credential or log service hours
                </Button>
              </CardContent>
            </Card>


            {/* Verifiable record note */}
            <Card className="border-0 shadow-sm bg-muted/30">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-foreground">Portable leadership records</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Every badge, award, and service hour logged here is independently verifiable and travels with each girl — even if she moves to another troop. It reduces your admin burden and gives scouts a credential that stands on its own.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Privacy note */}
            <p className="text-xs text-muted-foreground text-center">
              You see effort and credentials only — not what scouts write in their reflections.
            </p>
          </>
        )}

        {/* No troop */}
        {!loading && view === "dashboard" && !dashboard && (
          <div className="text-center py-12 space-y-3">
            <p className="text-muted-foreground text-sm">No troop set up yet.</p>
            <Button onClick={() => setView("create_troop")}>Create your troop</Button>
          </div>
        )}

      </div>
    </div>
  );
};

export default LeaderDashboardPage;
