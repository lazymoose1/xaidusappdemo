import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { toast } from "@/hooks/use-toast";
import { troopApi, scoutAuthApi } from "@/api/endpoints";
import type { CreateLeaderSupportNoteInput, LeaderSupportProfile, TroopDashboard, TroopSegmentEntry, ScoutPortableRecord } from "@/types/api";
import { TroopSegments } from "@/components/scout/TroopSegments";
import { useAuth } from "@/providers/AuthProvider";
import { exportLeaderReport } from "@/lib/leader-report-export";
import { getOrganizationTerms, type OrganizationTerms } from "@/lib/organization-language";
import { ArrowLeft, Award, Shield, ChevronRight, TrendingUp, Users, Sparkles, Search, CalendarClock, AlertCircle, ClipboardList, Download, Gift, HeartHandshake, BookOpen } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

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

const SUPPORT_TAG_OPTIONS: NonNullable<CreateLeaderSupportNoteInput["tags"]> = [
  "outreach_attempted",
  "youth_responded",
  "missed_appointment",
  "goal_planning_help",
  "accountability_support",
  "needs_escalation",
  "resolved",
];

type View = "dashboard" | "create_troop" | "add_scout" | "award_credential" | "scout_record" | "support_profile";
type QueueFilter = "needs_attention" | "follow_up_due" | "stalled" | "all_ok" | "all";
type QueueSort = "urgency" | "inactivity" | "follow_up" | "name";

const buildLeaderGuideSteps = (terms: OrganizationTerms) => [
  {
    title: "What this workspace is for",
    body: `This is a ${terms.workspaceEyebrow.toLowerCase()} for ${terms.leaderPlural}. Start here when you need to see who needs support, what follow-up is due, and what the next practical action should be.`,
    takeaways: [`Support ${terms.youthPlural} without adding admin burden.`, "Use the portal to prioritize next steps, not to monitor private life."],
  },
  {
    title: "What you can do here",
    body: "You can review progress signals, document support work, assign follow-up, and recognize effort. The portal is designed for coaching and continuity, not surveillance.",
    takeaways: [`${terms.notesLabel} and follow-up are core actions.`, "Recognition matters just as much as intervention."],
  },
  {
    title: `Who appears in your ${terms.queueCollectionLabel}`,
    body: `You’ll see ${terms.youthPlural} connected to your program, group, or cohort. The main queue is built so you can scan many ${terms.youthPlural} quickly before opening an individual support view.`,
    takeaways: ["Use the queue first.", `Open a ${terms.supportViewLabel.toLowerCase()} only when you need more context.`],
  },
  {
    title: "What data is shown",
    body: `The portal highlights goal progress, check-in consistency, follow-up dates, support status, service hours, recognitions, and staff notes. These are the signals most useful for ${terms.youthSingular} support work.`,
    takeaways: ["You are seeing support signals, not a raw activity feed.", "The goal is fast context for follow-up."],
  },
  {
    title: "What is intentionally not shown",
    body: `You will not see private reflections in full, browsing history, private messages, or hidden monitoring data. The portal stays within role-safe boundaries so ${terms.youthSingular} dignity stays intact.`,
    takeaways: ["This is not a forensic profile.", "Private content stays private unless product rules explicitly say otherwise."],
  },
  {
    title: "Start with Needs attention now",
    body: `This is the main action queue. It surfaces ${terms.youthPlural} who may need outreach, have missed check-ins, show stalled momentum, or already have follow-up waiting.`,
    takeaways: ["If you only have a minute, start here.", "This section should tell you who needs support right now."],
  },
  {
    title: "Use filters to narrow your day",
    body: `Use search, status filters, and sorting to move from a full ${terms.queueCollectionLabel} view to the exact ${terms.youthPlural} who need action first. This is especially useful when you are triaging a busy day.`,
    takeaways: ["Filter by urgency, follow-up due, or stalled progress.", "Sort when you need the clearest action order."],
  },
  {
    title: "Follow-ups due",
    body: `This section shows ${terms.youthPlural} who already have a next step or follow-up date connected to ${terms.notesLabel.toLowerCase()}. It helps you keep promises, close loops, and avoid losing track of outreach.`,
    takeaways: ["Use this to keep support work moving.", "Overdue follow-up usually deserves attention before new reporting."],
  },
  {
    title: "Recognition stays visible",
    body: `Recognition is placed high on purpose. It helps you see whether ${terms.youthPlural} are being acknowledged for progress, completions, service, and consistency, not only contacted when something slips.`,
    takeaways: ["Recognition is part of support, not an extra.", "A healthy support rhythm includes positive reinforcement."],
  },
  {
    title: "Use Give recognition",
    body: `Use this action to document milestones, awards, and service hours. It strengthens the ${terms.youthSingular}'s record and helps staff reinforce effort instead of only reacting to setbacks.`,
    takeaways: ["Use it when growth deserves to be named.", "Recognition builds the record a young person can carry forward."],
  },
  {
    title: `Open the ${terms.supportViewLabel.toLowerCase()}`,
    body: `Open an individual ${terms.supportViewLabel.toLowerCase()} when you need a fuller picture. It brings together recent activity, active goals, notes, recognitions, support signals, and next follow-up in one place.`,
    takeaways: ["This is your one-person support page.", "It should answer what is going on and what to do next."],
  },
  {
    title: `Keep ${terms.notesLabel.toLowerCase()} short`,
    body: `${terms.notesLabel} are meant to be practical, not essay-length. Use them to log outreach, record what happened, set a next step, and assign a follow-up date.`,
    takeaways: ["Short notes are easier to maintain.", "A note is strongest when it ends with a clear next step."],
  },
  {
    title: "Use charts for planning, not triage",
    body: "The trend views summarize completions, check-ins, and support status across the group. They help with reporting and planning, but they should not pull attention away from the support queue.",
    takeaways: ["Charts come after action.", "Use them to explain patterns, not to replace judgment."],
  },
  {
    title: "Exports and reporting",
    body: "Export report creates a support summary in Excel, Word, or PDF. Use it when you need to brief supervisors, county partners, or program stakeholders with clean outcome-oriented reporting.",
    takeaways: ["Export after your notes and follow-up are current.", "The report is meant to save staff time, not create extra formatting work."],
  },
  {
    title: "Best day-to-day workflow",
    body: `A strong rhythm is: review the queue, open a ${terms.supportViewLabel.toLowerCase()}, log a note, set a follow-up, recognize progress when it is earned, and export a report only when you actually need to brief someone.`,
    takeaways: ["Queue first.", "Follow-up second.", "Recognition and reporting support the work instead of replacing it."],
  },
] as const;

export const LeaderDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const orgTerms = getOrganizationTerms(user?.organizationType);
  const guideSteps = useMemo(() => buildLeaderGuideSteps(orgTerms), [orgTerms]);
  const supportTagLabel = useMemo(
    () => ({
      outreach_attempted: "Outreach attempted",
      youth_responded: `${orgTerms.youthSingular.charAt(0).toUpperCase()}${orgTerms.youthSingular.slice(1)} responded`,
      missed_appointment: "Missed appointment",
      goal_planning_help: "Goal planning help",
      accountability_support: "Accountability support",
      needs_escalation: "Needs added support",
      resolved: "Resolved",
    }),
    [orgTerms],
  );
  const [dashboard, setDashboard] = useState<TroopDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetLoading, setResetLoading] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [showGuide, setShowGuide] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const guideContentRef = useRef<HTMLDivElement | null>(null);
  const guideDesktopStepsRef = useRef<HTMLDivElement | null>(null);
  const guideMobileStepsRef = useRef<HTMLDivElement | null>(null);

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
  const [supportProfile, setSupportProfile] = useState<LeaderSupportProfile | null>(null);
  const [supportProfileLoading, setSupportProfileLoading] = useState(false);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("needs_attention");
  const [queueSort, setQueueSort] = useState<QueueSort>("urgency");
  const [searchQuery, setSearchQuery] = useState("");
  const [supportNote, setSupportNote] = useState("");
  const [supportNextStep, setSupportNextStep] = useState("");
  const [supportFollowUpDate, setSupportFollowUpDate] = useState("");
  const [supportStatus, setSupportStatus] = useState<CreateLeaderSupportNoteInput["status"]>("needs_support");
  const [supportTags, setSupportTags] = useState<NonNullable<CreateLeaderSupportNoteInput["tags"]>>([]);
  const [savingSupportNote, setSavingSupportNote] = useState(false);

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
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const guideSeen = window.localStorage.getItem("leader-portal-guide-seen");
    if (!guideSeen) {
      setShowGuide(true);
    }
  }, []);

  useEffect(() => {
    if (!showGuide) return;
    guideContentRef.current?.scrollTo({ top: 0, behavior: "auto" });

    const activeDesktopStep = guideDesktopStepsRef.current?.querySelector<HTMLButtonElement>(
      `[data-guide-step="${guideStep}"]`,
    );
    activeDesktopStep?.scrollIntoView({ block: "nearest", inline: "nearest" });

    const activeMobileStep = guideMobileStepsRef.current?.querySelector<HTMLButtonElement>(
      `[data-guide-step="${guideStep}"]`,
    );
    activeMobileStep?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [guideStep, showGuide]);

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

  const openSupportProfile = async (scoutId: string) => {
    setView("support_profile");
    setSupportProfileLoading(true);
    try {
      const profile = await troopApi.getScoutSupportProfile(scoutId);
      setSupportProfile(profile);
      setSupportNote("");
      setSupportNextStep(profile.supportNotes[0]?.nextStep || "");
      setSupportFollowUpDate(
        profile.nextFollowUp ? new Date(profile.nextFollowUp).toISOString().slice(0, 10) : "",
      );
      setSupportStatus(profile.summary.supportStatus);
      setSupportTags([]);
    } catch {
      toast({ title: "Couldn't load support profile", variant: "destructive" });
      setView("dashboard");
    } finally {
      setSupportProfileLoading(false);
    }
  };

  const toggleSupportTag = (tag: NonNullable<CreateLeaderSupportNoteInput["tags"]>[number]) => {
    setSupportTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  };

  const saveSupportNote = async () => {
    if (!supportProfile?.scout.id || !supportNote.trim()) {
      toast({ title: "Add a support note first", variant: "destructive" });
      return;
    }

    setSavingSupportNote(true);
    try {
      await troopApi.addSupportNote(supportProfile.scout.id, {
        note: supportNote.trim(),
        tags: supportTags,
        nextStep: supportNextStep.trim() || undefined,
        followUpDate: supportFollowUpDate || undefined,
        status: supportStatus,
      });
      toast({ title: "Support note saved" });
      await fetchDashboard();
      await openSupportProfile(supportProfile.scout.id);
    } catch (err: any) {
      toast({ title: "Couldn't save support note", description: err?.message, variant: "destructive" });
    } finally {
      setSavingSupportNote(false);
    }
  };

  const openAwardCredentialForScout = (scoutId?: string) => {
    if (scoutId) setCredentialScoutId(scoutId);
    setCredentialType("badge_milestone");
    setCredentialTitle("");
    setServiceHours("");
    setServiceProject("");
    setServiceDesc("");
    setView("award_credential");
  };

  const handleExportReport = (format: "excel" | "word" | "pdf") => {
    if (!dashboard) return;
    exportLeaderReport(format, dashboard, view === "support_profile" ? supportProfile : null);
    toast({ title: "Report downloaded", description: `Saved support report as ${format.toUpperCase()}.` });
  };

  const openGuide = (step = 0) => {
    setGuideStep(Math.max(0, Math.min(step, guideSteps.length - 1)));
    setShowGuide(true);
  };

  const closeGuide = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("leader-portal-guide-seen", "true");
    }
    setShowGuide(false);
  };

  const advanceGuide = () => {
    if (guideStep >= guideSteps.length - 1) {
      closeGuide();
      return;
    }
    setGuideStep((current) => current + 1);
  };

  const priorityWeight = { high: 0, medium: 1, low: 2 };
  const filteredQueue = useMemo(() => {
    const queue = dashboard?.caseloadQueue || [];
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return queue
      .filter((item) => {
        if (normalizedSearch && !item.youthName.toLowerCase().includes(normalizedSearch)) return false;
        if (queueFilter === "needs_attention") return item.priority !== "low";
        if (queueFilter === "follow_up_due") return item.supportStatus === "follow_up_due";
        if (queueFilter === "stalled") return item.stalledProgress;
        if (queueFilter === "all_ok") return item.supportStatus === "on_track" || item.supportStatus === "resolved";
        return true;
      })
      .sort((a, b) => {
        switch (queueSort) {
          case "name":
            return a.youthName.localeCompare(b.youthName);
          case "inactivity":
            return b.missedCheckInSignal - a.missedCheckInSignal;
          case "follow_up":
            return (a.nextFollowUpDate ? new Date(a.nextFollowUpDate).getTime() : Number.MAX_SAFE_INTEGER)
              - (b.nextFollowUpDate ? new Date(b.nextFollowUpDate).getTime() : Number.MAX_SAFE_INTEGER);
          case "urgency":
          default:
            return priorityWeight[a.priority] - priorityWeight[b.priority];
        }
      });
  }, [dashboard?.caseloadQueue, queueFilter, queueSort, searchQuery]);

  const getStatusChipClass = (status: string) => {
    if (status === "follow_up_due") return "bg-amber-500/15 text-amber-700 border-amber-500/30";
    if (status === "needs_support") return "bg-red-500/10 text-red-700 border-red-500/20";
    if (status === "resolved") return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
    return "bg-muted text-muted-foreground border-border";
  };

  const weeklyTrendChartData = useMemo(() => {
    if (!dashboard?.groupSnapshot) return [];
    const formatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - 6);

    return dashboard.groupSnapshot.trend.map((completedGoals, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        day: formatter.format(date),
        completedGoals,
        checkIns: dashboard.groupSnapshot?.checkinTrend[index] || 0,
      };
    });
  }, [dashboard?.groupSnapshot]);

  const caseloadStatusChartData = useMemo(() => {
    if (!dashboard?.caseloadQueue) return [];
    const counts = {
      needs_support: 0,
      follow_up_due: 0,
      on_track: 0,
      resolved: 0,
    };

    for (const item of dashboard.caseloadQueue) {
      counts[item.supportStatus] += 1;
    }

    return [
      { status: "Needs support", total: counts.needs_support },
      { status: "Follow-up due", total: counts.follow_up_due },
      { status: "On track", total: counts.on_track },
      { status: "Resolved", total: counts.resolved },
    ];
  }, [dashboard?.caseloadQueue]);

  const isServiceHoursMode = credentialType === ("service_hours");
  const currentGuideStep = guideSteps[guideStep];

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="app-shell-header py-3 px-4 flex items-center justify-between gap-3 sticky top-0 z-40">
        <div className="flex items-center gap-2 min-w-0">
          {view !== "dashboard" && view !== "create_troop" && (
            <button onClick={() => setView("dashboard")} className="text-foreground/78 hover:text-foreground mr-1 transition-colors">
              <ArrowLeft size={18} />
            </button>
          )}
          <h1 className="font-serif text-lg sm:text-xl text-foreground truncate">xaidus — {orgTerms.leaderTitle}</h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => openGuide()} className="text-xs text-muted-foreground hover:text-foreground">
            Guide
          </button>
          <button onClick={() => navigate("/settings/leader")} className="text-xs text-muted-foreground hover:text-foreground">Settings</button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-6 space-y-5">

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        )}

        {/* ── Create troop ─────────────────────────────────────────────── */}
        {!loading && view === "create_troop" && (
          <Card className="mx-auto w-full max-w-xl border-0 shadow-sm">
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
          <Card className="mx-auto w-full max-w-xl border-0 shadow-sm">
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
          <div className="mx-auto w-full max-w-2xl space-y-4">
                <div>
                  <h2 className="font-serif text-lg text-foreground">Recognize progress</h2>
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
                    {awarding ? "Saving recognition…" : "Give recognition"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {!loading && view === "support_profile" && (
          <div className="space-y-4">
            {supportProfileLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              </div>
            ) : supportProfile ? (
              <>
                <div className="space-y-2">
                  <p className="eyebrow">{orgTerms.supportViewLabel}</p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-2xl font-semibold text-foreground break-words">{supportProfile.scout.nickname}</h2>
                      <p className="text-sm text-muted-foreground">
                        {supportProfile.scout.cohortCode || "General group"} · Last check-in {supportProfile.summary.lastCheckInLabel}
                      </p>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                      <Button variant="outline" className="w-full sm:w-auto" onClick={() => openScoutRecord(supportProfile.scout.id)}>
                        Portable record
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full sm:w-auto">
                            <Download className="mr-2 h-4 w-4" />
                            Export
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleExportReport("excel")}>Download Excel</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExportReport("pdf")}>Download PDF</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExportReport("word")}>Download Word</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button className="w-full sm:w-auto" onClick={() => openAwardCredentialForScout(supportProfile.scout.id)}>
                        Recognize progress
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                  <div className="space-y-4">
                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-foreground">{orgTerms.supportSummaryLabel}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] ${getStatusChipClass(supportProfile.summary.supportStatus)}`}>
                            {supportProfile.summary.supportStatus.replace(/_/g, " ")}
                          </span>
                          <span className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground">
                            {supportProfile.summary.daysCheckedInThisWeek} check-ins this week
                          </span>
                          <span className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground">
                            {supportProfile.summary.activeGoalCount} active goals
                          </span>
                          <span className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground">
                            {supportProfile.summary.completedThisWeek} completed this week
                          </span>
                        </div>
                        {supportProfile.supportFlags.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-foreground">Support signals</p>
                            <div className="flex flex-wrap gap-2">
                              {supportProfile.supportFlags.map((flag) => (
                                <span key={flag} className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-700">
                                  {flag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-foreground">Active goals and momentum</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {supportProfile.activeGoals.length > 0 ? (
                          supportProfile.activeGoals.map((goal) => (
                            <div key={goal.id} className="rounded-xl border border-border bg-background/70 px-3 py-3 space-y-2">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground break-words">{goal.title}</p>
                                  <p className="text-xs text-muted-foreground break-words">
                                    {goal.category || "General goal"}{goal.badgeFocus ? ` · ${goal.badgeFocus}` : ""}
                                  </p>
                                </div>
                                <span className="shrink-0 text-sm font-semibold text-foreground">{goal.progress}%</span>
                              </div>
                              {goal.microStep && (
                                <p className="text-xs text-muted-foreground break-words">Next step: <span className="text-foreground">{goal.microStep}</span></p>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No active goals are set right now.</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-foreground">Recent activity timeline</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {supportProfile.timeline.length > 0 ? (
                          supportProfile.timeline.map((item) => (
                            <div key={item.id} className="rounded-xl border border-border bg-background/70 px-3 py-3">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground break-words">{item.label}</p>
                                  <p className="mt-1 text-xs text-muted-foreground break-words">{item.detail}</p>
                                </div>
                                <span className="shrink-0 text-[11px] text-muted-foreground">
                                  {new Date(item.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No recent support activity yet.</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-foreground">Recognition and rewards</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid gap-2 sm:grid-cols-3">
                          <div className="rounded-xl border border-border bg-background/70 px-3 py-3">
                            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Recognitions</p>
                            <p className="mt-2 text-lg font-semibold text-foreground">{supportProfile.recognition.totalCredentials}</p>
                          </div>
                          <div className="rounded-xl border border-border bg-background/70 px-3 py-3">
                            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">This week</p>
                            <p className="mt-2 text-lg font-semibold text-foreground">{supportProfile.recognition.recognitionsThisWeek}</p>
                          </div>
                          <div className="rounded-xl border border-border bg-background/70 px-3 py-3">
                            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Service hours</p>
                            <p className="mt-2 text-lg font-semibold text-foreground">{supportProfile.recognition.serviceHoursLogged}</p>
                          </div>
                        </div>
                        {supportProfile.recognition.recentCredentials.length > 0 && (
                          <div className="space-y-2">
                            {supportProfile.recognition.recentCredentials.map((credential) => (
                              <div key={credential.id} className="rounded-xl border border-border bg-background/70 px-3 py-3">
                                <p className="text-sm font-medium text-foreground break-words">{credential.title}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {credentialLabel[credential.credentialType] || credential.credentialType} · {new Date(credential.earnedAt).toLocaleDateString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                        <Button className="w-full" onClick={() => openAwardCredentialForScout(supportProfile.scout.id)}>
                          Give recognition
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-foreground">Quick support actions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Button variant="outline" onClick={() => { setSupportStatus("needs_support"); toggleSupportTag("accountability_support"); }}>
                            Mark needs check-in
                          </Button>
                          <Button variant="outline" onClick={() => { setSupportStatus("resolved"); toggleSupportTag("resolved"); }}>
                            Mark concern resolved
                          </Button>
                          <Button variant="outline" onClick={() => toggleSupportTag("outreach_attempted")}>
                            Log outreach attempt
                          </Button>
                          <Button variant="outline" onClick={() => toggleSupportTag("needs_escalation")}>
                            Request added support
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-foreground">{orgTerms.noteLabel}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Textarea
                          value={supportNote}
                          onChange={(e) => setSupportNote(e.target.value)}
                          placeholder={`Add a short ${orgTerms.noteLabel.toLowerCase()}`}
                          className="min-h-[120px]"
                        />

                        <div className="flex flex-wrap gap-2">
                          {SUPPORT_TAG_OPTIONS.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleSupportTag(tag)}
                              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                                supportTags.includes(tag)
                                  ? "border-accent bg-accent/10 text-foreground"
                                  : "border-border bg-background text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {supportTagLabel[tag]}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="support-next-step">Next step</Label>
                          <Input
                            id="support-next-step"
                            value={supportNextStep}
                            onChange={(e) => setSupportNextStep(e.target.value)}
                            placeholder="What should happen next?"
                          />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="support-follow-up">Follow-up date</Label>
                            <Input
                              id="support-follow-up"
                              type="date"
                              value={supportFollowUpDate}
                              onChange={(e) => setSupportFollowUpDate(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="support-status">Status</Label>
                            <select
                              id="support-status"
                              value={supportStatus}
                              onChange={(e) => setSupportStatus(e.target.value as CreateLeaderSupportNoteInput["status"])}
                              className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="needs_support">Needs support</option>
                              <option value="follow_up_due">Follow-up due</option>
                              <option value="on_track">On track</option>
                              <option value="resolved">Resolved</option>
                            </select>
                          </div>
                        </div>

                        <Button className="w-full" onClick={saveSupportNote} disabled={savingSupportNote}>
                          {savingSupportNote ? "Saving..." : `Save ${orgTerms.noteLabel.toLowerCase()}`}
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-foreground">Existing notes</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {supportProfile.supportNotes.length > 0 ? (
                          supportProfile.supportNotes.map((note) => (
                            <div key={note.id} className="rounded-xl border border-border bg-background/70 px-3 py-3 space-y-2">
                              <div className="flex items-start justify-between gap-3">
                                <span className={`rounded-full border px-2 py-0.5 text-[10px] ${getStatusChipClass(note.status)}`}>
                                  {note.status.replace(/_/g, " ")}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {new Date(note.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-foreground break-words">{note.note}</p>
                              {note.nextStep && (
                                <p className="text-xs text-muted-foreground break-words">Next step: <span className="text-foreground">{note.nextStep}</span></p>
                              )}
                              {note.followUpDate && (
                                <p className="text-xs text-muted-foreground">Follow-up: {new Date(note.followUpDate).toLocaleDateString()}</p>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No {orgTerms.notesLabel.toLowerCase()} logged yet.</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            ) : null}
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
            <div className="space-y-3">
              <div className="leader-geo-panel p-5">
              <div className="flex flex-col items-start gap-3 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0">
                  <p className="eyebrow">{orgTerms.workspaceEyebrow}</p>
                  <h2 className="text-2xl font-semibold text-foreground break-words mt-2">{orgTerms.workspaceHeroQuestion}</h2>
                  <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                    {orgTerms.workspaceHeroBody}
                  </p>
                  <button
                    type="button"
                    onClick={() => openGuide()}
                    className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <BookOpen className="h-4 w-4" />
                    Walk through the portal
                  </button>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Button variant="outline" className="w-full sm:w-auto" onClick={() => openAwardCredentialForScout()}>
                    Give recognition
                  </Button>
                  <Button className="w-full sm:w-auto" onClick={() => setView("add_scout")}>
                    + Add {orgTerms.youthSingular}
                  </Button>
                </div>
              </div>
              </div>

              <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr_0.8fr]">
                <div className="leader-geo-panel p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Search className="w-4 h-4" />
                      <span>{orgTerms.queueSearchLabel}</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full sm:w-auto">
                          <Download className="mr-2 h-4 w-4" />
                          Export report
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleExportReport("excel")}>Download Excel</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportReport("pdf")}>Download PDF</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportReport("word")}>Download Word</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={orgTerms.searchPlaceholder}
                    />
                    <select
                      value={queueFilter}
                      onChange={(e) => setQueueFilter(e.target.value as QueueFilter)}
                      className="min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="needs_attention">Needs attention</option>
                      <option value="follow_up_due">Follow-up due</option>
                      <option value="stalled">Progress stalled</option>
                      <option value="all_ok">All okay</option>
                      <option value="all">{orgTerms.allCollectionLabel}</option>
                    </select>
                    <select
                      value={queueSort}
                      onChange={(e) => setQueueSort(e.target.value as QueueSort)}
                      className="min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="urgency">Sort by urgency</option>
                      <option value="inactivity">Sort by inactivity</option>
                      <option value="follow_up">Sort by follow-up date</option>
                      <option value="name">Sort by name</option>
                    </select>
                  </div>
                </div>

                <div className="leader-geo-panel p-4">
                  <p className="eyebrow">{orgTerms.queueCollectionLabel === "caseload" ? "Caseload summary" : "Support summary"}</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="text-foreground">{dashboard.caseloadSummary?.needsAttentionNow || 0} {orgTerms.youthPlural} need attention today</p>
                    <p className="text-foreground">{dashboard.caseloadSummary?.followUpsOverdue || 0} follow-ups are overdue</p>
                    <p className="text-foreground">{dashboard.caseloadSummary?.onTrackThisWeek || 0} are on track this week</p>
                    <p className="text-foreground">{dashboard.caseloadSummary?.stalledProgress || 0} may need a reset in progress</p>
                  </div>
                </div>

                <div className="leader-geo-panel p-4">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-accent" />
                    <p className="eyebrow">Recognition snapshot</p>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="leader-geo-subcard rounded-xl border border-border px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Issued this week</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{dashboard.recognitionSnapshot?.rewardsIssuedThisWeek || 0}</p>
                    </div>
                    <div className="leader-geo-subcard rounded-xl border border-border px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{orgTerms.recognitionSubjectPlural}</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{dashboard.recognitionSnapshot?.youthRecognizedThisWeek || 0}</p>
                    </div>
                    <div className="leader-geo-subcard rounded-xl border border-border px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Service hours</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{dashboard.recognitionSnapshot?.serviceHoursLoggedThisWeek || 0}</p>
                    </div>
                    <div className="leader-geo-subcard rounded-xl border border-border px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Marks earned</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{dashboard.recognitionSnapshot?.marksEarnedThisWeek || 0}</p>
                    </div>
                  </div>
                  {(dashboard.recognitionSnapshot?.recentRecognitions.length || 0) > 0 && (
                    <div className="mt-3 space-y-2">
                      {dashboard.recognitionSnapshot!.recentRecognitions.slice(0, 2).map((item) => (
                        <div key={item.id} className="leader-geo-subcard rounded-xl border border-border px-3 py-3">
                          <p className="text-sm font-medium text-foreground break-words">{item.youthName}</p>
                          <p className="mt-1 text-xs text-muted-foreground break-words">
                            {item.title} · {new Date(item.earnedAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Card className="leader-geo-panel border-0 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-accent" />
                  Needs attention now
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Start here. This queue is prioritized for follow-up, missed check-ins, and stalled momentum.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredQueue.length === 0 ? (
                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                    No {orgTerms.youthPlural} match this filter right now.
                  </div>
                ) : (
                  filteredQueue.map((item) => (
                    <div key={item.id} className="leader-geo-subcard rounded-xl border border-border p-4 space-y-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-foreground break-words">{item.youthName}</p>
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] ${getStatusChipClass(item.supportStatus)}`}>
                              {item.supportStatus === "follow_up_due"
                                ? "Follow-up due"
                                : item.supportStatus === "needs_support"
                                ? "Needs support"
                                : item.supportStatus === "resolved"
                                ? "Resolved"
                                : "On track"}
                            </span>
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] ${item.priority === "high" ? "border-red-500/20 bg-red-500/10 text-red-700" : item.priority === "medium" ? "border-amber-500/30 bg-amber-500/10 text-amber-700" : "border-border bg-muted text-muted-foreground"}`}>
                              {item.priority} priority
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-foreground">{item.reason}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground">
                              Last check-in: {item.lastCheckInLabel}
                            </span>
                            <span className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground">
                              {item.currentGoalStatus}
                            </span>
                            {item.nextFollowUpDate && (
                              <span className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground">
                                Follow-up: {new Date(item.nextFollowUpDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                          <Button variant="outline" className="w-full sm:w-auto" onClick={() => openSupportProfile(item.id)}>
                            Open support view
                          </Button>
                          <Button variant="ghost" className="w-full sm:w-auto" onClick={() => openScoutRecord(item.id)}>
                            Portable record
                          </Button>
                        </div>
                      </div>
                      {item.latestNoteSnippet && (
                        <p className="text-xs text-muted-foreground break-words">
                          Latest {orgTerms.noteLabel.toLowerCase()}: <span className="text-foreground">{item.latestNoteSnippet}</span>
                        </p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-3">
              <Card className="leader-geo-panel border-0 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-accent" />
                    Follow-ups due
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(dashboard.followUpsDue || []).length > 0 ? (
                    dashboard.followUpsDue!.map((item) => (
                      <button
                        key={`${item.youthId}-${item.dueDate}`}
                        onClick={() => openSupportProfile(item.youthId)}
                        className="leader-geo-subcard w-full rounded-xl border border-border px-3 py-3 text-left hover:bg-muted/30"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground break-words">{item.youthName}</p>
                            <p className="mt-1 text-xs text-muted-foreground break-words">{item.nextStep}</p>
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "No date"}
                          </span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No follow-ups are due right now.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="leader-geo-panel border-0 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Award className="w-4 h-4 text-accent" />
                    Nudges and participation
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Reach out quickly without leaving the workspace.
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <TroopSegments segments={dashboard.segments} onNudgeSent={fetchDashboard} />
                </CardContent>
              </Card>

              <Card className="leader-geo-panel border-0 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-accent" />
                    Recent support activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(dashboard.recentSupportActivity || []).length > 0 ? (
                    dashboard.recentSupportActivity!.map((item) => (
                      <div key={item.id} className="leader-geo-subcard rounded-xl border border-border px-3 py-3 space-y-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-medium text-foreground break-words">{item.youthName}</p>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] ${getStatusChipClass(item.status)}`}>
                            {item.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground break-words">{item.note}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">{orgTerms.notesLabel} will show up here once follow-up is logged.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {dashboard.groupSnapshot && (
              <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <Card className="leader-geo-panel border-0 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-accent" />
                      Weekly activity trends
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      A quick read on completions and check-ins across the week.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        completedGoals: { label: "Completed goals", color: "hsl(var(--foreground))" },
                        checkIns: { label: "Check-ins", color: "hsl(var(--muted-foreground))" },
                      }}
                      className="aspect-[16/7] w-full"
                    >
                      <LineChart data={weeklyTrendChartData}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="day" tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="completedGoals" stroke="var(--color-completedGoals)" strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="checkIns" stroke="var(--color-checkIns)" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card className="leader-geo-panel border-0 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <HeartHandshake className="w-4 h-4 text-accent" />
                      Support status mix
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      See where the {orgTerms.queueCollectionLabel} is concentrated without opening every record.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{ total: { label: orgTerms.youthPlural, color: "hsl(var(--foreground))" } }}
                      className="aspect-[16/9] w-full"
                    >
                      <BarChart data={caseloadStatusChartData}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="status" tickLine={false} axisLine={false} interval={0} angle={-12} textAnchor="end" height={52} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="total" fill="var(--color-total)" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {dashboard.groupSnapshot && (
              <Card className="leader-geo-panel border-accent/20 bg-accent/5 shadow-none">
                <CardContent className="pt-4 space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <TrendingUp className="w-4 h-4 text-accent shrink-0" />
                        <span>{orgTerms.queueCollectionLabel === "caseload" ? "Caseload trend" : "Support trend"}</span>
                      </div>
                      <h3 className="text-base font-semibold text-foreground break-words">
                        {dashboard.groupSnapshot.trendLabel}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {dashboard.groupSnapshot.supportSignal}
                      </p>
                    </div>
                    <span className="leader-geo-subcard shrink-0 self-start rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-foreground">
                      {dashboard.groupSnapshot.activeScouts}/{dashboard.totalScouts} active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="leader-geo-subcard min-w-0 rounded-xl border border-border px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground leading-tight break-words">Goals set</p>
                      <p className="mt-2 text-lg font-semibold text-foreground break-words">{dashboard.groupSnapshot.goalsCreatedThisWeek}</p>
                    </div>
                    <div className="leader-geo-subcard min-w-0 rounded-xl border border-border px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground leading-tight break-words">Completed</p>
                      <p className="mt-2 text-lg font-semibold text-foreground break-words">{dashboard.groupSnapshot.goalsCompletedThisWeek}</p>
                    </div>
                    <div className="leader-geo-subcard min-w-0 rounded-xl border border-border px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground leading-tight break-words">Check-ins</p>
                      <p className="mt-2 text-lg font-semibold text-foreground break-words">{dashboard.groupSnapshot.checkinsThisWeek}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {dashboard.themeSummary && (
              <Card className="leader-geo-panel border-0 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                    {orgTerms.groupThemesLabel}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Trend summaries only. Use these to guide support conversations, not to inspect private youth content.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {(dashboard.themeSummary.topThemes || []).length > 0 ? (
                      dashboard.themeSummary.topThemes.map((theme) => (
                        <span key={`${theme.source}-${theme.label}`} className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-foreground">
                          {theme.label} · {theme.count}
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">Themes will appear once {orgTerms.youthPlural} start setting goals and checking in.</p>
                    )}
                  </div>

                  {(dashboard.themeSummary.cohorts || []).length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{orgTerms.cohortViewLabel}</span>
                      </div>
                      {dashboard.themeSummary.cohorts.map((cohort) => (
                        <div key={cohort.cohortCode} className="rounded-xl border border-border bg-muted/20 px-3 py-3 space-y-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground break-words">{cohort.cohortCode}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-full border border-border bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">{cohort.memberCount} {orgTerms.cohortCountLabel}</span>
                              <span className="rounded-full border border-border bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">{cohort.activeScouts} active</span>
                              <span className="rounded-full border border-border bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">{cohort.goalsCompletedThisWeek} completed</span>
                            </div>
                          </div>
                          {cohort.themes.length > 0 && (
                            <p className="text-xs text-muted-foreground break-words">
                              Showing up here: <span className="text-foreground">{cohort.themes.join(", ")}</span>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-0 shadow-sm border-accent/20 bg-accent/5">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <span className="font-semibold text-foreground">Weekly reset</span>
                    <span className="font-semibold shrink-0">{Math.round(dashboard.weeklyResetRate * 100)}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Close the week clearly so {orgTerms.youthPlural} come back to one fresh goal and one next step.
                  </p>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${dashboard.weeklyResetRate >= 0.7 ? "bg-green-500" : "bg-accent"}`}
                      style={{ width: `${Math.round(dashboard.weeklyResetRate * 100)}%` }}
                    />
                  </div>
                  <Button variant="outline" className="w-full" onClick={handleWeeklyReset} disabled={resetLoading}>
                    {resetLoading ? "Resetting…" : "Run weekly reset"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              You see effort trends, recognitions, goals, follow-up, and documented support work only — not private reflections or transcript-like content.
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

      <Dialog open={showGuide} onOpenChange={(open) => (!open ? closeGuide() : setShowGuide(true))}>
        <DialogContent className="flex h-[min(40rem,calc(100dvh-1rem))] w-[calc(100vw-1rem)] max-w-[72rem] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-background p-0 shadow-strong sm:h-[min(40rem,calc(100dvh-2rem))] sm:w-[calc(100vw-2rem)]">
          <DialogHeader className="border-b border-border/70 px-5 pb-2 pt-4 sm:px-6 sm:pt-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span>Workspace guide</span>
            </div>
            <DialogTitle className="text-[1.65rem] leading-tight tracking-[-0.03em] text-foreground sm:text-[1.85rem]">How this workspace works</DialogTitle>
            <DialogDescription className="max-w-3xl text-sm leading-6 text-muted-foreground">
              A quick walkthrough of what this portal shows, what it does not show, and how to use it well in {orgTerms.youthSingular} support work.
            </DialogDescription>
          </DialogHeader>

          <div className="border-b border-border/70 bg-card/60 px-5 py-2.5 sm:px-6">
            <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
              <span className="truncate">Step {guideStep + 1} of {guideSteps.length}</span>
              <span className="shrink-0">{Math.round(((guideStep + 1) / guideSteps.length) * 100)}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-foreground transition-all"
                style={{ width: `${((guideStep + 1) / guideSteps.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="hidden min-h-0 flex-1 lg:grid lg:grid-cols-[11rem_minmax(0,1fr)]">
              <div className="border-r border-border/70 bg-card/40">
                <div className="border-b border-border/70 bg-card/70 px-3 py-3">
                  <p className="text-sm font-medium text-foreground">Guide steps</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Jump to any section. The content stays focused on one idea at a time.
                  </p>
                </div>
                <div
                  ref={guideDesktopStepsRef}
                  className="h-full overflow-y-auto overscroll-contain px-3 py-3 [-webkit-overflow-scrolling:touch]"
                >
                  <div className="space-y-2">
                  {guideSteps.map((step, index) => (
                    <button
                      key={step.title}
                      data-guide-step={index}
                      type="button"
                      onClick={() => setGuideStep(index)}
                      className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors ${
                        index === guideStep
                          ? "border-foreground bg-foreground text-background shadow-sm"
                          : "border-border bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      <p className="text-xs uppercase tracking-[0.14em] opacity-80">Step {index + 1}</p>
                      <p className="mt-1 text-sm font-medium leading-5">{step.title}</p>
                    </button>
                  ))}
                  </div>
                </div>
              </div>

              <div
                ref={guideContentRef}
                className="min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
              >
                <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-5 py-4 sm:px-6 sm:py-5">
                  <div className="rounded-2xl border border-border/70 bg-background p-5 shadow-sm sm:p-6">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Current step</p>
                    <h3 className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-[2rem]">
                      {currentGuideStep.title}
                    </h3>
                    <p className="mt-4 text-base leading-8 text-muted-foreground sm:text-lg">
                      {currentGuideStep.body}
                    </p>
                  </div>

                  <div className="mt-5 rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">What to keep in mind</p>
                    <div className="mt-4 space-y-3">
                      {currentGuideStep.takeaways.map((takeaway) => (
                        <div key={takeaway} className="flex items-start gap-3">
                          <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-foreground/80" />
                          <p className="text-sm leading-6 text-foreground/92 sm:text-base sm:leading-7">{takeaway}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-border/70 bg-background p-5 shadow-sm sm:p-6">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Use it like this</p>
                    <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
                      Move through the guide once to understand the structure, then reopen it later if you need a refresher on queues, notes, recognition, exports, or role boundaries.
                    </p>
                  </div>
                </div>
              </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col lg:hidden">
            <div className="border-b border-border/70 px-5 py-3">
              <p className="text-sm leading-6 text-foreground/82">
                Tap any step below to jump around. The guide stays focused on one idea at a time.
              </p>
              <div
                ref={guideMobileStepsRef}
                className="mt-3 -mx-1 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch]"
              >
                <div className="flex min-w-max gap-2 px-1">
                  {guideSteps.map((step, index) => (
                    <button
                      key={step.title}
                      data-guide-step={index}
                      type="button"
                      onClick={() => setGuideStep(index)}
                      className={`shrink-0 rounded-full border px-3 py-2 text-sm leading-none transition-colors ${
                        index === guideStep
                          ? "border-foreground bg-foreground text-background shadow-sm"
                          : "border-border bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      Step {index + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div
              ref={guideContentRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
            >
              <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-5 py-4 sm:px-6 sm:py-5">
                <div className="rounded-2xl border border-border/70 bg-background p-5 shadow-sm sm:p-6">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Current step</p>
                  <h3 className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-[2rem]">
                    {currentGuideStep.title}
                  </h3>
                  <p className="mt-4 text-base leading-8 text-muted-foreground sm:text-lg">
                    {currentGuideStep.body}
                  </p>
                </div>

                <div className="mt-5 rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">What to keep in mind</p>
                  <div className="mt-4 space-y-3">
                    {currentGuideStep.takeaways.map((takeaway) => (
                      <div key={takeaway} className="flex items-start gap-3">
                        <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-foreground/80" />
                        <p className="text-sm leading-6 text-foreground/92 sm:text-base sm:leading-7">{takeaway}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-border/70 bg-background p-5 shadow-sm sm:p-6">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Use it like this</p>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
                    Move through the guide once to understand the structure, then reopen it later if you need a refresher on queues, notes, recognition, exports, or role boundaries.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border/70 bg-background px-5 py-4 sm:px-6 sm:justify-between">
            <Button variant="outline" onClick={closeGuide} className="w-full sm:w-auto">Close guide</Button>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                variant="outline"
                onClick={() => setGuideStep((current) => Math.max(0, current - 1))}
                disabled={guideStep === 0}
                className="w-full sm:w-auto"
              >
                Previous
              </Button>
              <Button onClick={advanceGuide} className="w-full sm:w-auto">
                {guideStep === guideSteps.length - 1 ? "Finish guide" : "Next step"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaderDashboardPage;
