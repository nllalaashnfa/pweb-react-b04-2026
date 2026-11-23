
export interface SkillMatchResult {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export function calculateSkillMatch(
  kaptenSkills: string[],
  requiredSkills: string[]
): SkillMatchResult {
  const normalizedSkills = new Set(
    kaptenSkills.map((skill) =>
      skill.trim().toLowerCase()
    )
  );

  const matchedSkills = requiredSkills.filter(
    (skill) =>
      normalizedSkills.has(skill.trim().toLowerCase())
  );

  const missingSkills = requiredSkills.filter(
    (skill) =>
      !normalizedSkills.has(skill.trim().toLowerCase())
  );

  const score =
    requiredSkills.length === 0
      ? 0
      : Math.round(
          (matchedSkills.length / requiredSkills.length) *
            100
        );

  return {
    score,
    matchedSkills,
    missingSkills,
  };
}
