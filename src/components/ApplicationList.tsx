import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type {
  ActivityLog,
  Application,
  ApplicationStatus,
} from "../types/application";
import { isGhostingRisk } from "../utils/applicationRules";
import { getInterviewConflicts } from "../utils/interviewConflicts";
import { calculateSkillMatch } from "../utils/skillMatch";
import { ApplicationDetailModal } from "./ApplicationDetailModal";

interface ApplicationListProps {
  applications: Application[];
  setApplications: Dispatch<SetStateAction<Application[]>>;
  kaptenSkills: string[];
}

interface PendingDeletion {
  application: Application;
  originalIndex: number;
}

type StatusFilter = "ALL" | ApplicationStatus;
type PipelineSortBy = "latest" | "interview" | "offer";

const STATUS_OPTIONS: readonly {
  value: StatusFilter;
  label: string;
}[] = [
  { value: "ALL", label: "Semua Status" },
  { value: "WISHLIST", label: "Wishlist" },
  { value: "APPLIED", label: "Applied" },
  { value: "SCREENING", label: "Screening" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "OFFER", label: "Offer" },
  { value: "GHOSTED", label: "Ghosted" },
  { value: "REJECTED", label: "Rejected" },
];

const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

function isValidStatusFilter(
  value: string
): value is StatusFilter {
  return STATUS_OPTIONS.some((item) => item.value === value);
}

function isValidSortBy(value: string): value is PipelineSortBy {
  return (
    value === "latest" ||
    value === "interview" ||
    value === "offer"
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Tanggal tidak tersedia";
  }

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID").format(amount);
}

export function ApplicationList({
  applications,
  setApplications,
  kaptenSkills,
}: ApplicationListProps) {
  const [pendingDeletion, setPendingDeletion] =
    useState<PendingDeletion | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] =
    useState<string | null>(null);

  // Filter & Sorting War Room
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("ALL");
  const [onlyGhostingRisk, setOnlyGhostingRisk] =
    useState(false);
  const [sortBy, setSortBy] =
    useState<PipelineSortBy>("latest");

  // Waktu saat ini untuk derived state Rawan Ghosting
  const [currentTimeMs, setCurrentTimeMs] = useState(() =>
    Date.now()
  );

  // Menyimpan ID timer Undo
  const undoTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  // Membersihkan timer Undo ketika komponen dilepas
  useEffect(() => {
    return () => {
      if (undoTimerRef.current !== null) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  // Menyegarkan waktu cek ghosting setiap 1 menit secara bersih
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  // Derived state: cek bentrok jadwal dari SELURUH data (bukan hasil filter)
  const interviewConflicts = getInterviewConflicts(applications);

  const applicationsById = new Map(
    applications.map((app) => [app.id, app])
  );

  // Derived state: lamaran yang sedang dibuka di modal detail
  const selectedApplication = selectedApplicationId
    ? (applicationsById.get(selectedApplicationId) ?? null)
    : null;

  // Derived state: filter gabungan & sorting War Room
  const normalizedKeyword = searchQuery.trim().toLowerCase();

  const filteredApplications = applications.filter(
    (application) => {
      const matchesSearch =
        normalizedKeyword === "" ||
        application.company
          .toLowerCase()
          .includes(normalizedKeyword) ||
        application.role
          .toLowerCase()
          .includes(normalizedKeyword) ||
        (application.cvVersion ?? "")
          .toLowerCase()
          .includes(normalizedKeyword) ||
        application.requiredSkills.some((skill) =>
          skill.toLowerCase().includes(normalizedKeyword)
        );

      const matchesStatus =
        statusFilter === "ALL" ||
        application.status === statusFilter;

      const matchesGhosting =
        !onlyGhostingRisk ||
        isGhostingRisk(application, currentTimeMs);

      return matchesSearch && matchesStatus && matchesGhosting;
    }
  );

  const sortedApplications = [...filteredApplications].sort(
    (first, second) => {
      if (sortBy === "interview") {
        const firstTime = first.interviewDateTime
          ? new Date(first.interviewDateTime).getTime()
          : Number.POSITIVE_INFINITY;
        const secondTime = second.interviewDateTime
          ? new Date(second.interviewDateTime).getTime()
          : Number.POSITIVE_INFINITY;

        if (firstTime !== secondTime) {
          return (
            (Number.isFinite(firstTime)
              ? firstTime
              : Number.POSITIVE_INFINITY) -
            (Number.isFinite(secondTime)
              ? secondTime
              : Number.POSITIVE_INFINITY)
          );
        }
      }

      if (sortBy === "offer") {
        const firstSalary = first.salaryOffer ?? -1;
        const secondSalary = second.salaryOffer ?? -1;

        if (firstSalary !== secondSalary) {
          return secondSalary - firstSalary;
        }
      }

      const firstUpdated = new Date(
        first.lastUpdatedAt
      ).getTime();
      const secondUpdated = new Date(
        second.lastUpdatedAt
      ).getTime();

      return (
        (Number.isFinite(secondUpdated) ? secondUpdated : 0) -
        (Number.isFinite(firstUpdated) ? firstUpdated : 0)
      );
    }
  );

  // Helper update immutable untuk satu lamaran
  function handleUpdateApplication(
    applicationId: string,
    updater: (previous: Application) => Application
  ) {
    setApplications((previousApplications) =>
      previousApplications.map((application) =>
        application.id === applicationId
          ? updater(application)
          : application
      )
    );
  }

  // Simulasi +15 Hari untuk menguji Rawan Ghosting secara langsung
  function handleSimulateGhosting(applicationId: string) {
    const nowMs = Date.now();
    setCurrentTimeMs(nowMs);

    handleUpdateApplication(applicationId, (previous) => {
      if (
        previous.status !== "APPLIED" &&
        previous.status !== "SCREENING"
      ) {
        return previous;
      }

      const baseTimeMs = new Date(
        previous.lastUpdatedAt
      ).getTime();
      const validBaseMs = Number.isFinite(baseTimeMs)
        ? baseTimeMs
        : nowMs;
      const shiftedDateIso = new Date(
        validBaseMs - FIFTEEN_DAYS_MS
      ).toISOString();

      const simulationLog: ActivityLog = {
        id: crypto.randomUUID(),
        timestamp: new Date(nowMs).toISOString(),
        message:
          "Simulasi +15 Hari dijalankan (lastUpdatedAt dimundurkan 15 hari).",
      };

      return {
        ...previous,
        lastUpdatedAt: shiftedDateIso,
        activityLogs: [...previous.activityLogs, simulationLog],
      };
    });
  }

  // Menghapus lamaran (dengan Undo 5 detik)
  function handleDelete(applicationId: string) {
    const originalIndex = applications.findIndex(
      (application) => application.id === applicationId
    );

    if (originalIndex === -1) {
      return;
    }

    const deletedApplication = applications[originalIndex];

    if (selectedApplicationId === applicationId) {
      setSelectedApplicationId(null);
    }

    // Membersihkan timer sebelumnya
    if (undoTimerRef.current !== null) {
      clearTimeout(undoTimerRef.current);
    }

    // Menghapus lamaran dari LocalStorage melalui state
    setApplications((previousApplications) =>
      previousApplications.filter(
        (application) => application.id !== applicationId
      )
    );

    // Menyimpan data untuk fitur Undo
    setPendingDeletion({
      application: deletedApplication,
      originalIndex,
    });

    // Timer Undo selama 5 detik
    undoTimerRef.current = setTimeout(() => {
      setPendingDeletion(null);
      undoTimerRef.current = null;
    }, 5000);
  }

  // Mengembalikan lamaran yang dihapus
  function handleUndo() {
    if (!pendingDeletion) {
      return;
    }

    if (undoTimerRef.current !== null) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }

    const { application, originalIndex } = pendingDeletion;

    setApplications((previousApplications) => {
      if (
        previousApplications.some(
          (item) => item.id === application.id
        )
      ) {
        return previousApplications;
      }

      const restoredApplications = [...previousApplications];

      restoredApplications.splice(
        Math.min(originalIndex, restoredApplications.length),
        0,
        application
      );

      return restoredApplications;
    });

    setPendingDeletion(null);
  }

  function handleResetFilters() {
    setSearchQuery("");
    setStatusFilter("ALL");
    setOnlyGhostingRisk(false);
    setSortBy("latest");
  }

  return (
    <section className="application-tracker">
      <div className="application-tracker-header">
        <div>
          <h2>War Room Pipeline Lamaran</h2>
          <p>
            Kelola tahap seleksi, deteksi rawan ghosting, pantau
            bentrok jadwal, dan latihan interview.
          </p>
        </div>

        <span className="application-total">
          {sortedApplications.length} / {applications.length}{" "}
          Lamaran
        </span>
      </div>

      {/* BANNER BENTROK JADWAL INTERVIEW (DARI SELURUH DATA) */}
      {interviewConflicts.length > 0 && (
        <div className="conflict-banner" role="alert">
          <div className="conflict-banner-title">
            <strong>
              Peringatan Bentrok Jadwal Interview (
              {interviewConflicts.length})
            </strong>
            <span>
              Terdapat jadwal interview berstatus INTERVIEW yang
              berselisih kurang dari 60 menit.
            </span>
          </div>

          <ul className="conflict-list">
            {interviewConflicts.map((conflict) => {
              const firstApp = applicationsById.get(
                conflict.firstId
              );
              const secondApp = applicationsById.get(
                conflict.secondId
              );

              if (!firstApp || !secondApp) {
                return null;
              }

              return (
                <li
                  key={`${conflict.firstId}-${conflict.secondId}`}
                >
                  <span>
                    <strong>{firstApp.company}</strong> (
                    {firstApp.role},{" "}
                    {firstApp.interviewDateTime
                      ? formatDateTime(
                          firstApp.interviewDateTime
                        )
                      : "-"}
                    ) &harr;{" "}
                    <strong>{secondApp.company}</strong> (
                    {secondApp.role},{" "}
                    {secondApp.interviewDateTime
                      ? formatDateTime(
                          secondApp.interviewDateTime
                        )
                      : "-"}
                    ) &bull; Selisih{" "}
                    {Math.round(conflict.differenceMinutes)}{" "}
                    menit
                  </span>

                  <div className="conflict-quick-links">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedApplicationId(firstApp.id)
                      }
                    >
                      Cek {firstApp.company}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedApplicationId(secondApp.id)
                      }
                    >
                      Cek {secondApp.company}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* FILTER GABUNGAN WAR ROOM */}
      {applications.length > 0 && (
        <div className="pipeline-toolbar">
          <div className="pipeline-field pipeline-search">
            <label htmlFor="pipeline-search-input">
              Cari Lamaran
            </label>
            <input
              id="pipeline-search-input"
              type="search"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
              placeholder="Cari perusahaan, posisi, versi CV, atau skill..."
            />
          </div>

          <div className="pipeline-field">
            <label htmlFor="pipeline-status-filter">
              Filter Status
            </label>
            <select
              id="pipeline-status-filter"
              value={statusFilter}
              onChange={(event) => {
                const value = event.target.value;
                if (isValidStatusFilter(value)) {
                  setStatusFilter(value);
                }
              }}
            >
              {STATUS_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="pipeline-field">
            <label htmlFor="pipeline-sort-by">Urutkan</label>
            <select
              id="pipeline-sort-by"
              value={sortBy}
              onChange={(event) => {
                const value = event.target.value;
                if (isValidSortBy(value)) {
                  setSortBy(value);
                }
              }}
            >
              <option value="latest">Terbaru</option>
              <option value="interview">
                Jadwal Interview Terdekat
              </option>
              <option value="offer">Offer Tertinggi</option>
            </select>
          </div>

          <label className="ghosting-toggle">
            <input
              type="checkbox"
              checked={onlyGhostingRisk}
              onChange={(event) =>
                setOnlyGhostingRisk(event.target.checked)
              }
            />
            <span>Hanya Rawan Ghosting</span>
          </label>
        </div>
      )}

      {/* LIST LAMARAN / EMPTY STATE */}
      {applications.length === 0 ? (
        <div className="application-empty">
          <h3>Belum Ada Lamaran</h3>
          <p>
            Tambahkan lowongan dari bagian Eksplorasi Lowongan
            atau Form Manual untuk mulai memantau pipeline.
          </p>
        </div>
      ) : sortedApplications.length === 0 ? (
        <div className="application-empty">
          <h3>Tidak Ada Lamaran yang Cocok</h3>
          <p>
            Tidak ada lamaran yang sesuai dengan kombinasi
            filter saat ini.
          </p>
          <button
            type="button"
            className="btn-navy-action"
            onClick={handleResetFilters}
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="application-grid">
          {sortedApplications.map((application) => {
            const match = calculateSkillMatch(
              kaptenSkills,
              application.requiredSkills
            );
            const scoreClass =
              match.score >= 70
                ? "high"
                : match.score >= 40
                  ? "medium"
                  : "low";
            const ghostingRisk = isGhostingRisk(
              application,
              currentTimeMs
            );
            const doneCount = application.checklist.filter(
              (item) => item.done
            ).length;
            const totalChecklist = application.checklist.length;
            const canSimulate =
              application.status === "APPLIED" ||
              application.status === "SCREENING";

            return (
              <article
                key={application.id}
                className="application-card"
              >
                <div className="application-card-header">
                  <div>
                    <h3>{application.role}</h3>
                    <p className="application-company-subtitle">
                      {application.company} &bull;{" "}
                      {application.workMode}
                    </p>
                  </div>

                  <div className="application-badges">
                    <span
                      className={`application-status status-${application.status.toLowerCase()}`}
                    >
                      {application.status}
                    </span>

                    {ghostingRisk && (
                      <span className="ghosting-badge">
                        Rawan Ghosting
                      </span>
                    )}
                  </div>
                </div>

                <div className="application-metrics">
                  <div className="metric-item">
                    <span>Skill Match</span>
                    <strong
                      className={`metric-score ${scoreClass}`}
                    >
                      {match.score}%
                    </strong>
                  </div>

                  <div className="metric-item">
                    <span>Versi CV</span>
                    <strong>
                      {application.cvVersion || "-"}
                    </strong>
                  </div>

                  <div className="metric-item">
                    <span>Checklist</span>
                    <strong>
                      {doneCount}/{totalChecklist}
                    </strong>
                  </div>
                </div>

                {application.interviewDateTime && (
                  <p className="application-extra-info">
                    <strong>Jadwal Interview:</strong>{" "}
                    {formatDateTime(
                      application.interviewDateTime
                    )}
                  </p>
                )}

                {typeof application.salaryOffer === "number" &&
                  application.salaryOffer > 0 && (
                    <p className="application-extra-info">
                      <strong>Penawaran Offer:</strong> Rp{" "}
                      {formatRupiah(application.salaryOffer)}
                    </p>
                  )}

                <div className="application-skills">
                  <strong>Required Skills:</strong>

                  {application.requiredSkills.length > 0 ? (
                    <div className="job-tags">
                      {application.requiredSkills.map(
                        (skill, index) => (
                          <span
                            key={`${application.id}-${skill}-${index}`}
                            className="job-tag"
                          >
                            {skill}
                          </span>
                        )
                      )}
                    </div>
                  ) : (
                    <p>Tidak ada skill yang dicantumkan.</p>
                  )}
                </div>

                <p className="application-date">
                  Terakhir diperbarui:{" "}
                  {formatDate(application.lastUpdatedAt)}
                </p>

                <div className="application-card-actions">
                  <button
                    type="button"
                    className="application-detail-button"
                    onClick={() =>
                      setSelectedApplicationId(application.id)
                    }
                  >
                    Detail &amp; Kelola
                  </button>

                  {canSimulate && (
                    <button
                      type="button"
                      className="application-simulate-button"
                      onClick={() =>
                        handleSimulateGhosting(application.id)
                      }
                    >
                      Simulasi +15 Hari
                    </button>
                  )}

                  <button
                    type="button"
                    className="application-delete-button"
                    onClick={() =>
                      handleDelete(application.id)
                    }
                  >
                    {application.status === "WISHLIST"
                      ? "Batalkan Wishlist"
                      : "Hapus Lamaran"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* MODAL DETAIL LAMARAN (FITUR 4 & 5) */}
      {selectedApplication && (
        <ApplicationDetailModal
          key={selectedApplication.id}
          application={selectedApplication}
          skillMatch={calculateSkillMatch(
            kaptenSkills,
            selectedApplication.requiredSkills
          )}
          isGhosting={isGhostingRisk(
            selectedApplication,
            currentTimeMs
          )}
          onClose={() => setSelectedApplicationId(null)}
          onUpdateApplication={handleUpdateApplication}
          onSimulateGhosting={handleSimulateGhosting}
          onDelete={handleDelete}
        />
      )}

      {/* Notifikasi Undo */}
      {pendingDeletion && (
        <div
          className="undo-toast"
          role="status"
          aria-live="polite"
        >
          <span>
            {pendingDeletion.application.role} berhasil
            dihapus.
          </span>

          <button type="button" onClick={handleUndo}>
            Undo
          </button>
        </div>
      )}
    </section>
  );
}
