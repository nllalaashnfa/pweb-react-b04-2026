
import type { WorkMode } from "../types/application";
import type { JobListing } from "../types/job";
import type { JobSource } from "../services/jobService";
import type { SkillMatchResult } from "../utils/skillMatch";

import { JobSkillMatch } from "./JobSkillMatch";

interface JobCardProps {
  job: JobListing;
  match: SkillMatchResult;
  source: JobSource;
  knownWorkMode: WorkMode | null;
  selectedWorkMode?: WorkMode;
  alreadySaved: boolean;

  onSelectWorkMode: (
    jobId: number,
    workMode: WorkMode
  ) => void;

  onAddToWishlist: (
    job: JobListing,
    workMode: WorkMode
  ) => void;
}

function isValidWorkMode(
  value: string
): value is WorkMode {
  return (
    value === "Remote" ||
    value === "Hybrid" ||
    value === "Onsite"
  );
}

export function JobCard({
  job,
  match,
  source,
  knownWorkMode,
  selectedWorkMode,
  alreadySaved,
  onSelectWorkMode,
  onAddToWishlist,
}: JobCardProps) {
  const workMode =
    knownWorkMode ?? selectedWorkMode;

  return (
    <article className="job-card">
      <h3>{job.title}</h3>

      {/* Link sumber lowongan API */}
      {source === "api" && (
        <p className="job-source-link">
          <strong>Sumber:</strong> Remotive{" "}
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Lihat lowongan asli
            </a>
          )}
        </p>
      )}

      {/* Informasi lowongan */}
      <p>
        <strong>Perusahaan:</strong>{" "}
        {job.company_name}
      </p>

      <p>
        <strong>Lokasi:</strong>{" "}
        {job.candidate_required_location}
      </p>

      <p>
        <strong>Kategori:</strong>{" "}
        {job.category}
      </p>

      <p>
        <strong>Gaji/Uang Saku:</strong>{" "}
        {job.salary || "Tidak dicantumkan"}
      </p>

      {/* Required Skills */}
      <div className="job-skills">
        <strong>Required Skills:</strong>

        {job.tags.length > 0 ? (
          <div className="job-tags">
            {job.tags.map((skill) => (
              <span
                key={skill}
                className="job-tag"
              >
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <p>Tidak dicantumkan.</p>
        )}
      </div>

      {/* Skill Match */}
      <JobSkillMatch result={match} />

      {/* Mode Kerja dan Wishlist */}
      <div className="job-save-control">
        <p>
          <strong>Mode Kerja:</strong>{" "}
          {workMode ?? "Belum ditentukan"}
        </p>

        {/* Pilihan mode kerja jika belum diketahui */}
        {!knownWorkMode && (
          <>
            <label htmlFor={`work-mode-${job.id}`}>
              Pilih Mode Kerja
            </label>

            <select
              id={`work-mode-${job.id}`}
              value={selectedWorkMode ?? ""}
              disabled={alreadySaved}
              onChange={(event) => {
                const value = event.target.value;

                if (isValidWorkMode(value)) {
                  onSelectWorkMode(
                    job.id,
                    value
                  );
                }
              }}
            >
              <option value="">
                Pilih mode kerja
              </option>

              <option value="Remote">
                Remote
              </option>

              <option value="Hybrid">
                Hybrid
              </option>

              <option value="Onsite">
                Onsite
              </option>
            </select>
          </>
        )}

        {/* Tombol Wishlist */}
        <button
          type="button"
          disabled={!workMode || alreadySaved}
          onClick={() => {
            if (workMode) {
              onAddToWishlist(job, workMode);
            }
          }}
        >
          {alreadySaved
            ? "Sudah Dilamar"
            : "Simpan ke Wishlist"}
        </button>
      </div>
    </article>
  );
}
