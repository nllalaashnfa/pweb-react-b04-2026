import { useState } from "react";
import type {
  Dispatch,
  FormEvent,
  SetStateAction,
} from "react";

interface SkillProfileProps {
  skills: string[];
  setSkills: Dispatch<SetStateAction<string[]>>;
}

export function SkillProfile({
  skills,
  setSkills,
}: SkillProfileProps) {
  const [inputSkill, setInputSkill] = useState("");
  const [error, setError] = useState("");

  function handleAddSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const newSkill = inputSkill.trim();

    if (!newSkill) {
      setError("Nama skill tidak boleh kosong.");
      return;
    }

    const isDuplicate = skills.some(
      (skill) =>
        skill.toLowerCase() === newSkill.toLowerCase()
    );

    if (isDuplicate) {
      setError("Skill tersebut sudah ada.");
      return;
    }

    setSkills((previousSkills) => [
      ...previousSkills,
      newSkill,
    ]);

    setInputSkill("");
    setError("");
  }

  function handleRemoveSkill(skillToRemove: string) {
    setSkills((previousSkills) =>
      previousSkills.filter(
        (skill) => skill !== skillToRemove
      )
    );
  }

  return (
    <section className="skill-profile">
      <h2>Profil Skill Kapten</h2>

      <p>
        Tambahkan skill yang kamu kuasai untuk menghitung
        kecocokan dengan lowongan magang.
      </p>

      <form onSubmit={handleAddSkill}>
        <input
          type="text"
          value={inputSkill}
          onChange={(event) => {
            setInputSkill(event.target.value);
            setError("");
          }}
          placeholder="Contoh: React"
        />

        <button type="submit">
          Tambah Skill
        </button>
      </form>

      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}

      <div className="skill-list">
        {skills.map((skill) => (
          <button
            key={skill}
            type="button"
            onClick={() => handleRemoveSkill(skill)}
            title={`Hapus skill ${skill}`}
          >
            {skill} ×
          </button>
        ))}
      </div>
    </section>
  );
}