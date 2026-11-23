
import type { SkillMatchResult } from "../utils/skillMatch";

interface JobSkillMatchProps {
  result: SkillMatchResult;
}

export function JobSkillMatch({
  result,
}: JobSkillMatchProps) {
  const scoreClass =
    result.score >= 70
      ? "high"
      : result.score >= 40
        ? "medium"
        : "low";

  return (
    <div className="job-skill-match">
      <div className={`skill-match-badge ${scoreClass}`}>
        Skill Match: {result.score}%
      </div>

      <div className="skill-match-details">
        <p>
          <strong>Skill Cocok:</strong>{" "}
          {result.matchedSkills.length > 0
            ? result.matchedSkills.join(", ")
            : "Tidak ada"}
        </p>

        <p>
          <strong>Missing Skills:</strong>{" "}
          {result.missingSkills.length > 0
            ? result.missingSkills.join(", ")
            : "Tidak ada"}
        </p>
      </div>
    </div>
  );
}
