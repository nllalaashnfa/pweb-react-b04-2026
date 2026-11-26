import type { Application } from "../types/application";

const INTERVIEW_DURATION_MINUTES = 60;

function formatUtcCalendarTimestamp(date: Date): string {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function buildEventDates(interviewDateTime: string): {
  startUtc: string;
  endUtc: string;
} | null {
  const startDate = new Date(interviewDateTime);
  if (!Number.isFinite(startDate.getTime())) {
    return null;
  }

  const endDate = new Date(
    startDate.getTime() + INTERVIEW_DURATION_MINUTES * 60 * 1000
  );

  return {
    startUtc: formatUtcCalendarTimestamp(startDate),
    endUtc: formatUtcCalendarTimestamp(endDate),
  };
}

function buildEventDetails(
  application: Application,
  skillScore: number
): string {
  const lines = [
    `Interview Magang: ${application.role}`,
    `Perusahaan: ${application.company}`,
    `Mode Kerja: ${application.workMode}`,
    `Skill Match: ${skillScore}%`,
  ];

  if (application.cvVersion) {
    lines.push(`Versi CV: ${application.cvVersion}`);
  }

  if (application.requiredSkills.length > 0) {
    lines.push(
      `Required Skills: ${application.requiredSkills.join(", ")}`
    );
  }

  return lines.join("\n");
}

export function buildGoogleCalendarUrl(
  application: Application,
  skillScore: number
): string | null {
  if (!application.interviewDateTime) {
    return null;
  }

  const dates = buildEventDates(application.interviewDateTime);
  if (!dates) {
    return null;
  }

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set(
    "text",
    `Interview: ${application.role} — ${application.company}`
  );
  url.searchParams.set(
    "dates",
    `${dates.startUtc}/${dates.endUtc}`
  );
  url.searchParams.set(
    "details",
    buildEventDetails(application, skillScore)
  );
  url.searchParams.set(
    "location",
    `${application.company} (${application.workMode})`
  );

  return url.toString();
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function downloadInterviewIcs(
  application: Application,
  skillScore: number
): boolean {
  if (!application.interviewDateTime) {
    return false;
  }

  const dates = buildEventDates(application.interviewDateTime);
  if (!dates) {
    return false;
  }

  const nowStamp = formatUtcCalendarTimestamp(new Date());
  const summary = escapeIcsText(
    `Interview: ${application.role} — ${application.company}`
  );
  const description = escapeIcsText(
    buildEventDetails(application, skillScore)
  );
  const location = escapeIcsText(
    `${application.company} (${application.workMode})`
  );

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aku Mw Magang//Interview Scheduler//ID",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${application.id}@akumwmagang.local`,
    `DTSTAMP:${nowStamp}`,
    `DTSTART:${dates.startUtc}`,
    `DTEND:${dates.endUtc}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([icsContent], {
    type: "text/calendar;charset=utf-8",
  });
  const blobUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = `interview-${application.company
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);

  return true;
}
