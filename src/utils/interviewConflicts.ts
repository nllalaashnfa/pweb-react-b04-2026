import type { Application } from "../types/application";

export interface InterviewConflict {
  firstId: string;
  secondId: string;
  differenceMinutes: number;
}

export function getInterviewConflicts(
  applications: Application[]
): InterviewConflict[] {
  const interviews = applications.filter(
    (app) =>
      app.status === "INTERVIEW" &&
      Boolean(app.interviewDateTime)
  );

  const conflicts: InterviewConflict[] = [];

  for (let i = 0; i < interviews.length; i++) {
    for (let j = i + 1; j < interviews.length; j++) {
      const first = interviews[i];
      const second = interviews[j];

      const firstTime = new Date(
        first.interviewDateTime ?? ""
      ).getTime();

      const secondTime = new Date(
        second.interviewDateTime ?? ""
      ).getTime();

      if (
        !Number.isFinite(firstTime) ||
        !Number.isFinite(secondTime)
      ) {
        continue;
      }

      const differenceMinutes =
        Math.abs(firstTime - secondTime) / (1000 * 60);

      if (differenceMinutes < 60) {
        conflicts.push({
          firstId: first.id,
          secondId: second.id,
          differenceMinutes,
        });
      }
    }
  }

  return conflicts;
}