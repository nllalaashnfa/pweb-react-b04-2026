import type { Application } from "../types/application";
import { isGhostingRisk } from "./applicationRules";

export interface ApplicationStats {
  total: number;
  responseRate: number;
  interviewRate: number;
  ghostingRisk: number;
  totalOffer: number;
}

function percent(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}

// Fungsi murni: statistik dihitung ulang dari applications (derived state)
export function calculateStats(
  applications: Application[],
  currentTimeMs: number
): ApplicationStats {
  // Lamaran yang sudah benar-benar dikirim (bukan WISHLIST)
  const sent = applications.filter((a) => a.status !== "WISHLIST");

  // Ada respons HRD = sudah lewat APPLIED dan bukan GHOSTED
  const responded = sent.filter(
    (a) => a.status !== "APPLIED" && a.status !== "GHOSTED"
  );

  const interviewed = sent.filter(
    (a) => a.status === "INTERVIEW" || a.status === "OFFER"
  );

  return {
    total: applications.length,
    responseRate: percent(responded.length, sent.length),
    interviewRate: percent(interviewed.length, sent.length),
    ghostingRisk: applications.filter((a) =>
      isGhostingRisk(a, currentTimeMs)
    ).length,
    totalOffer: applications.filter((a) => a.status === "OFFER").length,
  };
}
