export type OrganizationType =
  | "default_generic"
  | "public_school"
  | "you_cleveland"
  | "open_doors_academy";

export const DEFAULT_ORGANIZATION_TYPE: OrganizationType = "default_generic";

export const ORGANIZATION_TYPE_OPTIONS: Array<{
  value: OrganizationType;
  label: string;
  helper: string;
}> = [
  {
    value: "public_school",
    label: "Public School",
    helper: "School-safe language for students and school staff.",
  },
  {
    value: "you_cleveland",
    label: "Youth Opportunities Unlimited (Cleveland)",
    helper: "Workforce and youth-support language for RSS teams.",
  },
  {
    value: "open_doors_academy",
    label: "Open Doors Academy (Cleveland)",
    helper: "Scholar-centered language for Open Doors Academy.",
  },
  {
    value: "default_generic",
    label: "Other / General",
    helper: "Default Xaidus language for general youth support.",
  },
];

export type OrganizationTerms = {
  organizationType: OrganizationType;
  organizationLabel: string;
  youthSingular: string;
  youthPlural: string;
  leaderTitle: string;
  leaderPlural: string;
  workspaceEyebrow: string;
  workspaceNavLabel: string;
  workspaceHeroQuestion: string;
  workspaceHeroBody: string;
  queueCollectionLabel: string;
  queueSearchLabel: string;
  searchPlaceholder: string;
  allCollectionLabel: string;
  supportViewLabel: string;
  supportSummaryLabel: string;
  notesLabel: string;
  noteLabel: string;
  recentActivityLabel: string;
  followUpsLabel: string;
  groupThemesLabel: string;
  cohortViewLabel: string;
  cohortCountLabel: string;
  recognitionSubjectPlural: string;
};

const TERM_MAP: Record<OrganizationType, OrganizationTerms> = {
  default_generic: {
    organizationType: "default_generic",
    organizationLabel: "Other / General",
    youthSingular: "youth",
    youthPlural: "youth",
    leaderTitle: "Leader",
    leaderPlural: "leaders",
    workspaceEyebrow: "Support workspace",
    workspaceNavLabel: "Support workspace",
    workspaceHeroQuestion: "Who needs support right now?",
    workspaceHeroBody:
      "Use this space to notice stalled momentum, log follow-up, and keep youth moving without turning the work into surveillance.",
    queueCollectionLabel: "support queue",
    queueSearchLabel: "Search and filter support queue",
    searchPlaceholder: "Search youth name",
    allCollectionLabel: "All youth",
    supportViewLabel: "Youth support view",
    supportSummaryLabel: "Support summary",
    notesLabel: "Support notes",
    noteLabel: "Support note",
    recentActivityLabel: "Recent support activity",
    followUpsLabel: "Follow-ups due",
    groupThemesLabel: "Group themes",
    cohortViewLabel: "Group view",
    cohortCountLabel: "youth",
    recognitionSubjectPlural: "Youth recognized",
  },
  public_school: {
    organizationType: "public_school",
    organizationLabel: "Public School",
    youthSingular: "student",
    youthPlural: "students",
    leaderTitle: "School staff",
    leaderPlural: "school staff",
    workspaceEyebrow: "Student support workspace",
    workspaceNavLabel: "Student support",
    workspaceHeroQuestion: "Which students need support right now?",
    workspaceHeroBody:
      "Use this space to notice stalled momentum, log follow-up, and help students stay on track without turning support into surveillance.",
    queueCollectionLabel: "student list",
    queueSearchLabel: "Search and filter student list",
    searchPlaceholder: "Search student name",
    allCollectionLabel: "All students",
    supportViewLabel: "Student support view",
    supportSummaryLabel: "Student support summary",
    notesLabel: "Support notes",
    noteLabel: "Support note",
    recentActivityLabel: "Recent support activity",
    followUpsLabel: "Follow-ups due",
    groupThemesLabel: "Student themes",
    cohortViewLabel: "Group view",
    cohortCountLabel: "students",
    recognitionSubjectPlural: "Students recognized",
  },
  you_cleveland: {
    organizationType: "you_cleveland",
    organizationLabel: "Youth Opportunities Unlimited (Cleveland)",
    youthSingular: "youth",
    youthPlural: "youth",
    leaderTitle: "Resource Support Specialist",
    leaderPlural: "Resource Support Specialists",
    workspaceEyebrow: "Caseload support workspace",
    workspaceNavLabel: "Caseload workspace",
    workspaceHeroQuestion: "Who needs support right now?",
    workspaceHeroBody:
      "Use this space to notice stalled momentum, log follow-up, and keep youth moving without turning the work into surveillance.",
    queueCollectionLabel: "caseload",
    queueSearchLabel: "Search and filter caseload",
    searchPlaceholder: "Search youth name",
    allCollectionLabel: "All youth",
    supportViewLabel: "Youth support view",
    supportSummaryLabel: "Support snapshot",
    notesLabel: "Support notes",
    noteLabel: "Support note",
    recentActivityLabel: "Recent support activity",
    followUpsLabel: "Follow-ups due",
    groupThemesLabel: "Group themes",
    cohortViewLabel: "Cohort view",
    cohortCountLabel: "youth",
    recognitionSubjectPlural: "Youth recognized",
  },
  open_doors_academy: {
    organizationType: "open_doors_academy",
    organizationLabel: "Open Doors Academy (Cleveland)",
    youthSingular: "scholar",
    youthPlural: "scholars",
    leaderTitle: "Support staff",
    leaderPlural: "support staff",
    workspaceEyebrow: "Scholar support workspace",
    workspaceNavLabel: "Scholar support",
    workspaceHeroQuestion: "Which scholars need support right now?",
    workspaceHeroBody:
      "Use this space to notice stalled momentum, log follow-up, and help scholars keep moving without turning support into surveillance.",
    queueCollectionLabel: "scholar support list",
    queueSearchLabel: "Search and filter scholar support list",
    searchPlaceholder: "Search scholar name",
    allCollectionLabel: "All scholars",
    supportViewLabel: "Scholar support view",
    supportSummaryLabel: "Scholar support summary",
    notesLabel: "Support notes",
    noteLabel: "Support note",
    recentActivityLabel: "Recent support activity",
    followUpsLabel: "Follow-ups due",
    groupThemesLabel: "Scholar themes",
    cohortViewLabel: "Scholar support",
    cohortCountLabel: "scholars",
    recognitionSubjectPlural: "Scholars recognized",
  },
};

export function normalizeOrganizationType(value?: string | null): OrganizationType {
  if (!value) return DEFAULT_ORGANIZATION_TYPE;
  if (value in TERM_MAP) return value as OrganizationType;
  return DEFAULT_ORGANIZATION_TYPE;
}

export function getOrganizationTerms(value?: string | null): OrganizationTerms {
  return TERM_MAP[normalizeOrganizationType(value)];
}

export function getOrganizationLabel(value?: string | null): string {
  return getOrganizationTerms(value).organizationLabel;
}

