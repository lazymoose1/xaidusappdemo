import type { LeaderSupportProfile, TroopDashboard } from "@/types/api";

type ExportFormat = "excel" | "word" | "pdf";

type ReportSection = {
  title: string;
  rows: Array<[string, string]>;
};

function formatDate(value?: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not scheduled" : date.toLocaleDateString();
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function ascii(value: string) {
  return value.normalize("NFKD").replace(/[^\x20-\x7E]/g, "");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapePdf(value: string) {
  return ascii(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function downloadBlob(filename: string, blob: Blob) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

function buildSections(dashboard: TroopDashboard, supportProfile?: LeaderSupportProfile | null): ReportSection[] {
  const sections: ReportSection[] = [
    {
      title: "Program Summary",
      rows: [
        ["Program", dashboard.troop.name],
        ["Troop code", dashboard.troop.troopCode],
        ["Youth served", String(dashboard.totalScouts)],
        ["Need support now", String(dashboard.caseloadSummary?.needsAttentionNow || 0)],
        ["Follow-ups overdue", String(dashboard.caseloadSummary?.followUpsOverdue || 0)],
        ["On track this week", String(dashboard.caseloadSummary?.onTrackThisWeek || 0)],
        ["Progress needing a reset", String(dashboard.caseloadSummary?.stalledProgress || 0)],
      ],
    },
  ];

  if (dashboard.groupSnapshot) {
    sections.push({
      title: "Weekly Outcome Metrics",
      rows: [
        ["Goals set this week", String(dashboard.groupSnapshot.goalsCreatedThisWeek)],
        ["Goals completed this week", String(dashboard.groupSnapshot.goalsCompletedThisWeek)],
        ["Check-ins this week", String(dashboard.groupSnapshot.checkinsThisWeek)],
        ["Active youth this week", `${dashboard.groupSnapshot.activeScouts}/${dashboard.totalScouts}`],
        ["Trend summary", dashboard.groupSnapshot.trendLabel],
        ["Support signal", dashboard.groupSnapshot.supportSignal],
      ],
    });
  }

  if (dashboard.recognitionSnapshot) {
    sections.push({
      title: "Recognition and Reward Activity",
      rows: [
        ["Recognitions issued this week", String(dashboard.recognitionSnapshot.rewardsIssuedThisWeek)],
        ["Youth recognized this week", String(dashboard.recognitionSnapshot.youthRecognizedThisWeek)],
        ["Service hours logged this week", String(dashboard.recognitionSnapshot.serviceHoursLoggedThisWeek)],
        ["Marks earned this week", String(dashboard.recognitionSnapshot.marksEarnedThisWeek)],
        ["Moments earned this week", String(dashboard.recognitionSnapshot.momentsEarnedThisWeek)],
        ["Moova unlocks this week", String(dashboard.recognitionSnapshot.moovasUnlockedThisWeek)],
      ],
    });
  }

  if ((dashboard.caseloadQueue || []).length > 0) {
    sections.push({
      title: "Caseload Priority Queue",
      rows: dashboard.caseloadQueue!.slice(0, 15).map((item) => [
        item.youthName,
        `${item.reason}. Last check-in: ${item.lastCheckInLabel}. ${item.currentGoalStatus}. ${
          item.nextFollowUpDate ? `Follow-up ${formatDate(item.nextFollowUpDate)}.` : "No follow-up date set."
        }`,
      ]),
    });
  }

  if ((dashboard.followUpsDue || []).length > 0) {
    sections.push({
      title: "Follow-ups Due",
      rows: dashboard.followUpsDue!.map((item) => [
        item.youthName,
        `${formatDate(item.dueDate)} - ${item.nextStep}`,
      ]),
    });
  }

  if (dashboard.recognitionSnapshot?.recentRecognitions?.length) {
    sections.push({
      title: "Recent Recognitions",
      rows: dashboard.recognitionSnapshot.recentRecognitions.map((item) => [
        item.youthName,
        `${item.title} (${formatDate(item.earnedAt)})`,
      ]),
    });
  }

  if ((dashboard.recentSupportActivity || []).length > 0) {
    sections.push({
      title: "Recent Support Activity",
      rows: dashboard.recentSupportActivity!.map((item) => [
        item.youthName,
        `${formatDate(item.createdAt)} - ${item.note}`,
      ]),
    });
  }

  if (supportProfile) {
    sections.push({
      title: "Youth Support Detail",
      rows: [
        ["Youth", supportProfile.scout.nickname],
        ["Group", supportProfile.scout.cohortCode || "General group"],
        ["Support status", supportProfile.summary.supportStatus.replace(/_/g, " ")],
        ["Check-ins this week", String(supportProfile.summary.daysCheckedInThisWeek)],
        ["Active goals", String(supportProfile.summary.activeGoalCount)],
        ["Completed this week", String(supportProfile.summary.completedThisWeek)],
        ["Recognitions on record", String(supportProfile.recognition.totalCredentials)],
        ["Service hours on record", String(supportProfile.recognition.serviceHoursLogged)],
      ],
    });

    if (supportProfile.supportNotes.length > 0) {
      sections.push({
        title: "Support Notes",
        rows: supportProfile.supportNotes.map((note) => [
          formatDate(note.createdAt),
          `${note.note}${note.nextStep ? ` Next step: ${note.nextStep}.` : ""}`,
        ]),
      });
    }
  }

  return sections;
}

function buildHtmlReport(title: string, dashboard: TroopDashboard, supportProfile?: LeaderSupportProfile | null) {
  const sections = buildSections(dashboard, supportProfile);
  const generatedAt = new Date().toLocaleString();

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
    h1 { font-size: 22px; margin: 0 0 8px; }
    h2 { font-size: 16px; margin: 24px 0 8px; }
    p.meta { color: #4b5563; margin: 0 0 12px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; font-size: 12px; }
    th { width: 28%; background: #f3f4f6; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">Program support report updated ${escapeHtml(generatedAt)}.</p>
  ${sections
    .map(
      (section) => `
    <h2>${escapeHtml(section.title)}</h2>
    <table>
      <tbody>
        ${section.rows
          .map(
            ([label, value]) => `
          <tr>
            <th>${escapeHtml(label)}</th>
            <td>${escapeHtml(value)}</td>
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>`,
    )
    .join("")}
</body>
</html>`;
}

function buildPdf(title: string, dashboard: TroopDashboard, supportProfile?: LeaderSupportProfile | null) {
  const lines: string[] = [
    title,
    `Program support report updated ${new Date().toLocaleString()}`,
    "Youth support and outcome summary",
    "",
  ];

  for (const section of buildSections(dashboard, supportProfile)) {
    lines.push(section.title);
    lines.push("-".repeat(Math.min(section.title.length, 40)));
    for (const [label, value] of section.rows) {
      const combined = `${label}: ${value}`;
      const chunks = combined.match(/.{1,88}(\s|$)/g) || [combined];
      chunks.forEach((chunk) => lines.push(chunk.trimEnd()));
    }
    lines.push("");
  }

  const linesPerPage = 44;
  const pages = [];
  for (let index = 0; index < lines.length; index += linesPerPage) {
    pages.push(lines.slice(index, index + linesPerPage));
  }

  const objects: string[] = [];
  const addObject = (value: string) => {
    objects.push(value);
    return objects.length;
  };

  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pagesId = addObject("");
  const pageIds: number[] = [];

  for (const pageLines of pages) {
    const stream = [
      "BT",
      "/F1 10 Tf",
      "50 760 Td",
      "14 TL",
      ...pageLines.map((line) => `(${escapePdf(line)}) Tj`),
    ]
      .join("\nT*\n")
      .concat("\nET");

    const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    pageIds.push(pageId);
  }

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

export function exportLeaderReport(format: ExportFormat, dashboard: TroopDashboard, supportProfile?: LeaderSupportProfile | null) {
  const baseName = `${slugify(dashboard.troop.name)}-support-report-${new Date().toISOString().slice(0, 10)}`;
  const title = `${dashboard.troop.name} youth support report`;

  if (format === "excel") {
    const html = buildHtmlReport(title, dashboard, supportProfile);
    downloadBlob(`${baseName}.xls`, new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" }));
    return;
  }

  if (format === "word") {
    const html = buildHtmlReport(title, dashboard, supportProfile);
    downloadBlob(`${baseName}.doc`, new Blob([html], { type: "application/msword;charset=utf-8" }));
    return;
  }

  downloadBlob(`${baseName}.pdf`, buildPdf(title, dashboard, supportProfile));
}
