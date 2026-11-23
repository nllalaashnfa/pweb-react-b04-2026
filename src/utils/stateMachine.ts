import type {
  Application,
  ApplicationStatus,
} from "../types/application";

type TransitionValues = Partial<
  Pick<
    Application,
    | "cvVersion"
    | "appliedDate"
    | "interviewDateTime"
    | "salaryOffer"
    | "workMode"
  >
>;

const allowedTransitions: Record<
  ApplicationStatus,
  readonly ApplicationStatus[]
> = {
  WISHLIST: ["APPLIED"],

  APPLIED: ["SCREENING", "REJECTED", "GHOSTED"],

  SCREENING: ["INTERVIEW", "REJECTED", "GHOSTED"],

  INTERVIEW: ["OFFER", "REJECTED", "GHOSTED"],

  GHOSTED: ["SCREENING"],

  OFFER: [],

  REJECTED: [],
};

export function getAllowedNextStatuses(
  currentStatus: ApplicationStatus
): readonly ApplicationStatus[] {
  return allowedTransitions[currentStatus];
}

export function isValidStatusTransition(
  currentStatus: ApplicationStatus,
  nextStatus: ApplicationStatus
): boolean {
  return allowedTransitions[currentStatus].includes(nextStatus);
}

export function validateStatusTransition(
  application: Application,
  nextStatus: ApplicationStatus,
  values: TransitionValues = {}
): string | null {
  if (!isValidStatusTransition(application.status, nextStatus)) {
    return `Perpindahan dari ${application.status} ke ${nextStatus} tidak diperbolehkan.`;
  }

  if (nextStatus === "APPLIED") {
    const cvVersion = values.cvVersion ?? application.cvVersion;
    const appliedDate = values.appliedDate ?? application.appliedDate;

    if (!cvVersion?.trim()) {
      return "Versi CV wajib diisi.";
    }

    if (!appliedDate?.trim()) {
      return "Tanggal melamar wajib diisi.";
    }
  }

  if (nextStatus === "INTERVIEW") {
    const interviewDateTime =
      values.interviewDateTime ?? application.interviewDateTime;

    if (
      !interviewDateTime ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(
        interviewDateTime
      ) ||
      !Number.isFinite(new Date(interviewDateTime).getTime())
    ) {
      return "Jadwal interview wajib diisi dengan format YYYY-MM-DDTHH:mm.";
    }
  }

  if (nextStatus === "OFFER") {
    const salaryOffer = values.salaryOffer ?? application.salaryOffer;
    const workMode = values.workMode ?? application.workMode;

    if (
      typeof salaryOffer !== "number" ||
      !Number.isFinite(salaryOffer) ||
      salaryOffer <= 0
    ) {
      return "Gaji penawaran wajib lebih dari Rp 0.";
    }

    if (!["Remote", "Hybrid", "Onsite"].includes(workMode)) {
      return "Mode kerja wajib dipilih.";
    }
  }

  return null;
}