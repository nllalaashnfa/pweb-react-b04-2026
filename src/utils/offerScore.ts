import type { Application, WorkMode } from "../types/application";
import { calculateSkillMatch } from "./skillMatch";

export const WORK_MODE_SCORE: Record<WorkMode, number> = {
  Remote: 100,
  Hybrid: 75,
  Onsite: 50,
};

export interface OfferScore {
  salaryScore: number;
  modeScore: number;
  skillMatch: number;
  total: number;
}

// Total = Gaji ternormalisasi 50% + Mode Kerja 25% + Skill Match 25%
// Normalisasi gaji: gaji offer ini / gaji tertinggi di antara offer yang dibandingkan x 100
export function calculateOfferScore(
  offer: Application,
  highestSalary: number,
  kaptenSkills: string[]
): OfferScore {
  const salary = offer.salaryOffer ?? 0;
  const salaryScore = highestSalary > 0 ? (salary / highestSalary) * 100 : 0;
  const modeScore = WORK_MODE_SCORE[offer.workMode];
  const skillMatch = calculateSkillMatch(kaptenSkills, offer.requiredSkills).score;

  return {
    salaryScore: Math.round(salaryScore),
    modeScore,
    skillMatch,
    total: Math.round(salaryScore * 0.5 + modeScore * 0.25 + skillMatch * 0.25),
  };
}
