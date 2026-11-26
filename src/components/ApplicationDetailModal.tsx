import { useEffect, useState, type FormEvent } from "react";

import type {
  ActivityLog,
  Application,
  ApplicationStatus,
  ChecklistItem,
  WorkMode,
} from "../types/application";
import type { SkillMatchResult } from "../utils/skillMatch";
import {
  getAllowedNextStatuses,
  validateStatusTransition,
} from "../utils/stateMachine";
import {
  buildGoogleCalendarUrl,
  downloadInterviewIcs,
} from "../utils/calendarExport";
import { FollowUpMessageCard } from "./FollowUpMessageCard";
import { InterviewPrepTimer } from "./InterviewPrepTimer";

interface ApplicationDetailModalProps {
  application: Application;
  skillMatch: SkillMatchResult;
  isGhosting: boolean;
  onClose: () => void;
  onUpdateApplication: (
    applicationId: string,
    updater: (previous: Application) => Application
  ) => void;
  onSimulateGhosting: (applicationId: string) => void;
  onDelete: (applicationId: string) => void;
}

const PIPELINE_STEPS: readonly {
  status: ApplicationStatus;
  label: string;
}[] = [
  { status: "WISHLIST", label: "1. Wishlist" },
  { status: "APPLIED", label: "2. Applied" },
  { status: "SCREENING", label: "3. Screening" },
  { status: "INTERVIEW", label: "4. Interview" },
  { status: "OFFER", label: "5. Offer" },
];

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  WISHLIST: "Wishlist",
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  GHOSTED: "Ghosted",
};

function getCompanyInitials(company: string): string {
  const words = company
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "AM";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
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

function isValidWorkMode(value: string): value is WorkMode {
  return (
    value === "Remote" ||
    value === "Hybrid" ||
    value === "Onsite"
  );
}

export function ApplicationDetailModal({
  application,
  skillMatch,
  isGhosting,
  onClose,
  onUpdateApplication,
  onSimulateGhosting,
  onDelete,
}: ApplicationDetailModalProps) {
  const allowedNextStatuses = getAllowedNextStatuses(
    application.status
  );

  // State transisi status
  const [selectedTargetStatus, setSelectedTargetStatus] =
    useState<ApplicationStatus | null>(
      allowedNextStatuses[0] ?? null
    );
  const [cvVersionInput, setCvVersionInput] = useState(
    application.cvVersion ?? ""
  );
  const [appliedDateInput, setAppliedDateInput] = useState(
    () =>
      application.appliedDate ??
      new Date().toISOString().slice(0, 10)
  );
  const [interviewDateTimeInput, setInterviewDateTimeInput] =
    useState(application.interviewDateTime ?? "");
  const [salaryOfferInput, setSalaryOfferInput] = useState(
    application.salaryOffer
      ? String(application.salaryOffer)
      : ""
  );
  const [offerWorkMode, setOfferWorkMode] = useState<WorkMode>(
    application.workMode
  );
  const [transitionError, setTransitionError] = useState("");

  // State checklist baru
  const [newChecklistText, setNewChecklistText] = useState("");
  const [checklistError, setChecklistError] = useState("");

  // State catatan aktivitas manual
  const [manualNote, setManualNote] = useState("");
  const [noteError, setNoteError] = useState("");

  // Menutup modal saat tombol Escape ditekan
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const activeTargetStatus =
    selectedTargetStatus &&
    allowedNextStatuses.includes(selectedTargetStatus)
      ? selectedTargetStatus
      : allowedNextStatuses[0] ?? null;

  function handleSelectTargetStatus(
    nextStatus: ApplicationStatus
  ) {
    setSelectedTargetStatus(nextStatus);
    setTransitionError("");

    if (nextStatus === "APPLIED") {
      setCvVersionInput(application.cvVersion ?? "");
      setAppliedDateInput(
        application.appliedDate ??
          new Date().toISOString().slice(0, 10)
      );
    } else if (nextStatus === "INTERVIEW") {
      setInterviewDateTimeInput(
        application.interviewDateTime ?? ""
      );
    } else if (nextStatus === "OFFER") {
      setSalaryOfferInput(
        application.salaryOffer
          ? String(application.salaryOffer)
          : ""
      );
      setOfferWorkMode(application.workMode);
    }
  }

  function handleConfirmTransition(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!activeTargetStatus) {
      return;
    }

    const parsedSalary =
      salaryOfferInput.trim() === ""
        ? undefined
        : Number(salaryOfferInput);

    const transitionValues =
      activeTargetStatus === "APPLIED"
        ? {
            cvVersion: cvVersionInput.trim(),
            appliedDate: appliedDateInput,
          }
        : activeTargetStatus === "INTERVIEW"
          ? {
              interviewDateTime: interviewDateTimeInput,
            }
          : activeTargetStatus === "OFFER"
            ? {
                salaryOffer: parsedSalary,
                workMode: offerWorkMode,
              }
            : {};

    const validationError = validateStatusTransition(
      application,
      activeTargetStatus,
      transitionValues
    );

    if (validationError) {
      setTransitionError(validationError);
      return;
    }

    const now = new Date().toISOString();
    let logDetail = `Status pindah dari ${application.status} ke ${activeTargetStatus}.`;

    if (activeTargetStatus === "APPLIED") {
      logDetail = `Lamaran dikirim (CV: ${cvVersionInput.trim()}, Tanggal: ${appliedDateInput}).`;
    } else if (activeTargetStatus === "INTERVIEW") {
      logDetail = `Pindah ke Interview (jadwal ${formatDateTime(interviewDateTimeInput)}).`;
    } else if (
      activeTargetStatus === "OFFER" &&
      parsedSalary !== undefined
    ) {
      logDetail = `Menerima Offer Rp ${formatRupiah(parsedSalary)} (${offerWorkMode}).`;
    } else if (activeTargetStatus === "SCREENING") {
      logDetail =
        application.status === "GHOSTED"
          ? "HRD merespons kembali, status kembali ke Screening."
          : "Lolos tahap Screening.";
    } else if (activeTargetStatus === "GHOSTED") {
      logDetail = "Status ditandai sebagai Ghosted.";
    } else if (activeTargetStatus === "REJECTED") {
      logDetail = "Status diperbarui menjadi Rejected.";
    }

    const nextLog: ActivityLog = {
      id: crypto.randomUUID(),
      timestamp: now,
      message: logDetail,
    };

    onUpdateApplication(application.id, (previous) => ({
      ...previous,
      status: activeTargetStatus,
      ...(activeTargetStatus === "APPLIED"
        ? {
            cvVersion: cvVersionInput.trim(),
            appliedDate: appliedDateInput,
          }
        : {}),
      ...(activeTargetStatus === "INTERVIEW"
        ? {
            interviewDateTime: interviewDateTimeInput,
          }
        : {}),
      ...(activeTargetStatus === "OFFER" &&
      parsedSalary !== undefined
        ? {
            salaryOffer: parsedSalary,
            workMode: offerWorkMode,
          }
        : {}),
      lastUpdatedAt: now,
      activityLogs: [...previous.activityLogs, nextLog],
    }));

    const nextAllowed =
      getAllowedNextStatuses(activeTargetStatus);
    setSelectedTargetStatus(nextAllowed[0] ?? null);
    setTransitionError("");
  }

  // Nested Checklist handlers (wajib immutable)
  function handleAddChecklist(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmed = newChecklistText.trim();

    if (!trimmed) {
      setChecklistError("Nama tugas persiapan wajib diisi.");
      return;
    }

    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      text: trimmed,
      done: false,
    };

    onUpdateApplication(application.id, (previous) => ({
      ...previous,
      checklist: [...previous.checklist, newItem],
    }));

    setNewChecklistText("");
    setChecklistError("");
  }

  function handleToggleChecklist(itemId: string) {
    onUpdateApplication(application.id, (previous) => ({
      ...previous,
      checklist: previous.checklist.map((item) =>
        item.id === itemId
          ? { ...item, done: !item.done }
          : item
      ),
    }));
  }

  function handleRemoveChecklist(itemId: string) {
    onUpdateApplication(application.id, (previous) => ({
      ...previous,
      checklist: previous.checklist.filter(
        (item) => item.id !== itemId
      ),
    }));
  }

  // Activity Log manual note handler (immutable)
  function handleAddManualNote(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmed = manualNote.trim();

    if (!trimmed) {
      setNoteError("Catatan aktivitas tidak boleh kosong.");
      return;
    }

    const now = new Date().toISOString();
    const newLog: ActivityLog = {
      id: crypto.randomUUID(),
      timestamp: now,
      message: `Catatan Kapten: ${trimmed}`,
    };

    onUpdateApplication(application.id, (previous) => ({
      ...previous,
      activityLogs: [...previous.activityLogs, newLog],
    }));

    setManualNote("");
    setNoteError("");
  }

  function handleSaveResearchSummary(summaryText: string) {
    const now = new Date().toISOString();
    const newLog: ActivityLog = {
      id: crypto.randomUUID(),
      timestamp: now,
      message: summaryText,
    };

    onUpdateApplication(application.id, (previous) => ({
      ...previous,
      activityLogs: [...previous.activityLogs, newLog],
    }));
  }

  const completedChecklist = application.checklist.filter(
    (item) => item.done
  ).length;
  const totalChecklist = application.checklist.length;
  const checklistProgress =
    totalChecklist === 0
      ? 0
      : Math.round((completedChecklist / totalChecklist) * 100);

  const currentStepIndex = PIPELINE_STEPS.findIndex(
    (step) => step.status === application.status
  );

  const canSimulateGhosting =
    application.status === "APPLIED" ||
    application.status === "SCREENING";

  const reversedLogs = [...application.activityLogs].reverse();
  const googleCalendarUrl = buildGoogleCalendarUrl(
    application,
    skillMatch.score
  );

  return (
    <div
      className="detail-modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
      >
        {/* HEADER DETAIL LAMARAN */}
        <header className="detail-modal-header">
          <div className="detail-identity">
            <div
              className="detail-avatar"
              aria-hidden="true"
            >
              {getCompanyInitials(application.company)}
            </div>

            <div className="detail-title-group">
              <h2 id="detail-modal-title">
                {application.role} &mdash;{" "}
                {application.company}
              </h2>

              <p className="detail-meta-line">
                <span>{application.workMode}</span>
                <span>
                  &bull; Skill Match: {skillMatch.score}%
                </span>
                {application.cvVersion && (
                  <span>
                    &bull; CV: {application.cvVersion}
                  </span>
                )}
                {application.interviewDateTime && (
                  <span>
                    &bull; Jadwal Interview:{" "}
                    {formatDateTime(
                      application.interviewDateTime
                    )}
                  </span>
                )}
                {typeof application.salaryOffer ===
                  "number" &&
                  application.salaryOffer > 0 && (
                    <span>
                      &bull; Offer: Rp{" "}
                      {formatRupiah(application.salaryOffer)}
                    </span>
                  )}
              </p>
            </div>
          </div>

          <div className="detail-header-actions">
            <span
              className={`application-status status-${application.status.toLowerCase()}`}
            >
              {STATUS_LABELS[application.status]}
            </span>

            {isGhosting && (
              <span className="ghosting-badge">
                Rawan Ghosting
              </span>
            )}

            {canSimulateGhosting && (
              <button
                type="button"
                className="btn-secondary-action"
                onClick={() =>
                  onSimulateGhosting(application.id)
                }
              >
                Simulasi +15 Hari
              </button>
            )}

            <button
              type="button"
              className="btn-danger-outline"
              onClick={() => onDelete(application.id)}
            >
              Hapus
            </button>

            <button
              type="button"
              className="detail-close-button"
              onClick={onClose}
              aria-label="Tutup detail lamaran"
            >
              &times;
            </button>
          </div>
        </header>

        {/* BODY 2 KOLOM */}
        <div className="detail-modal-body">
          {/* KOLOM KIRI: STATE MACHINE & CHECKLIST */}
          <div className="detail-left-column">
            {/* TAHAP SELEKSI */}
            <section className="detail-section">
              <h3 className="detail-section-label">
                Tahap Seleksi
              </h3>

              <div className="pipeline-stepper">
                {PIPELINE_STEPS.map((step, index) => {
                  const isCurrent =
                    step.status === application.status;
                  const isCompleted =
                    currentStepIndex !== -1 &&
                    index < currentStepIndex;

                  return (
                    <div
                      key={step.status}
                      className={`stepper-item ${
                        isCurrent
                          ? "current"
                          : isCompleted
                            ? "completed"
                            : ""
                      }`}
                    >
                      <div className="stepper-bar" />
                      <span>{step.label}</span>
                    </div>
                  );
                })}
              </div>

              {(application.status === "REJECTED" ||
                application.status === "GHOSTED") && (
                <p className="stepper-special-note">
                  Status saat ini:{" "}
                  <strong>
                    {STATUS_LABELS[application.status]}
                  </strong>
                  {application.status === "GHOSTED"
                    ? " (Masih bisa kembali ke Screening jika HRD membalas.)"
                    : " (Status bersifat final.)"}
                </p>
              )}

              {/* INTEGRASI GOOGLE CALENDAR UNTUK JADWAL INTERVIEW */}
              {application.interviewDateTime &&
                googleCalendarUrl && (
                  <div className="calendar-export-box">
                    <div className="calendar-export-info">
                      <strong>Jadwal Wawancara</strong>
                      <span>
                        {formatDateTime(
                          application.interviewDateTime
                        )}{" "}
                        (Durasi 60 menit)
                      </span>
                    </div>

                    <div className="calendar-export-actions">
                      <a
                        href={googleCalendarUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-calendar-google"
                      >
                        + Google Calendar
                      </a>

                      <button
                        type="button"
                        className="btn-secondary-action"
                        onClick={() =>
                          downloadInterviewIcs(
                            application,
                            skillMatch.score
                          )
                        }
                      >
                        Unduh .ics
                      </button>
                    </div>
                  </div>
                )}

              {/* TRANSISI STATUS */}
              <div className="status-transition-box">
                {allowedNextStatuses.length === 0 ? (
                  <p className="transition-final-message">
                    Status{" "}
                    <strong>
                      {STATUS_LABELS[application.status]}
                    </strong>{" "}
                    bersifat final dan tidak dapat
                    dipindahkan lagi.
                  </p>
                ) : (
                  <form onSubmit={handleConfirmTransition}>
                    <div className="transition-header-row">
                      <span>Pindahkan status ke:</span>

                      <div className="transition-options">
                        {allowedNextStatuses.map(
                          (nextStatus) => (
                            <button
                              key={nextStatus}
                              type="button"
                              className={`transition-option-btn ${
                                activeTargetStatus ===
                                nextStatus
                                  ? "selected"
                                  : ""
                              }`}
                              onClick={() =>
                                handleSelectTargetStatus(
                                  nextStatus
                                )
                              }
                            >
                              {STATUS_LABELS[nextStatus]}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* INPUT KONDISIONAL */}
                    <div className="transition-inputs-row">
                      {activeTargetStatus === "APPLIED" && (
                        <>
                          <div className="transition-field">
                            <label htmlFor="transition-cv">
                              Versi CV
                            </label>
                            <input
                              id="transition-cv"
                              type="text"
                              value={cvVersionInput}
                              onChange={(event) =>
                                setCvVersionInput(
                                  event.target.value
                                )
                              }
                              placeholder="Contoh: Kapten-CV-v2.pdf"
                            />
                          </div>

                          <div className="transition-field">
                            <label htmlFor="transition-date">
                              Tanggal Melamar
                            </label>
                            <input
                              id="transition-date"
                              type="date"
                              value={appliedDateInput}
                              onChange={(event) =>
                                setAppliedDateInput(
                                  event.target.value
                                )
                              }
                            />
                          </div>
                        </>
                      )}

                      {activeTargetStatus === "INTERVIEW" && (
                        <div className="transition-field">
                          <label htmlFor="transition-interview">
                            Jadwal Interview
                          </label>
                          <input
                            id="transition-interview"
                            type="datetime-local"
                            value={interviewDateTimeInput}
                            onChange={(event) =>
                              setInterviewDateTimeInput(
                                event.target.value
                              )
                            }
                          />
                        </div>
                      )}

                      {activeTargetStatus === "OFFER" && (
                        <>
                          <div className="transition-field">
                            <label htmlFor="transition-salary">
                              Penawaran Gaji / Uang Saku (Rp)
                            </label>
                            <input
                              id="transition-salary"
                              type="number"
                              min={1}
                              value={salaryOfferInput}
                              onChange={(event) =>
                                setSalaryOfferInput(
                                  event.target.value
                                )
                              }
                              placeholder="Contoh: 5500000"
                            />
                          </div>

                          <div className="transition-field">
                            <label htmlFor="transition-workmode">
                              Mode Kerja
                            </label>
                            <select
                              id="transition-workmode"
                              value={offerWorkMode}
                              onChange={(event) => {
                                const value =
                                  event.target.value;
                                if (isValidWorkMode(value)) {
                                  setOfferWorkMode(value);
                                }
                              }}
                            >
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
                          </div>
                        </>
                      )}

                      {activeTargetStatus &&
                        activeTargetStatus !== "APPLIED" &&
                        activeTargetStatus !== "INTERVIEW" &&
                        activeTargetStatus !== "OFFER" && (
                          <p className="transition-confirm-hint">
                            Konfirmasi perubahan status ke{" "}
                            <strong>
                              {
                                STATUS_LABELS[
                                  activeTargetStatus
                                ]
                              }
                            </strong>
                            .
                          </p>
                        )}

                      <button
                        type="submit"
                        className="btn-primary-action transition-submit-btn"
                      >
                        Konfirmasi
                      </button>
                    </div>

                    {transitionError && (
                      <p
                        className="form-error"
                        role="alert"
                      >
                        {transitionError}
                      </p>
                    )}
                  </form>
                )}
              </div>
            </section>

            {/* DAFTAR PERSIAPAN (NESTED CHECKLIST) */}
            <section className="detail-section">
              <div className="checklist-header">
                <h3 className="detail-section-label">
                  Daftar Persiapan
                </h3>

                <span className="checklist-counter">
                  {completedChecklist} / {totalChecklist}{" "}
                  selesai
                </span>
              </div>

              <div
                className="checklist-progress-track"
                aria-label={`Progress persiapan ${checklistProgress}%`}
              >
                <div
                  className="checklist-progress-fill"
                  style={{ width: `${checklistProgress}%` }}
                />
              </div>

              {application.checklist.length === 0 ? (
                <p className="checklist-empty-text">
                  Belum ada tugas persiapan. Tambahkan item di
                  bawah.
                </p>
              ) : (
                <ul className="checklist-items">
                  {application.checklist.map((item) => (
                    <li
                      key={item.id}
                      className={`checklist-item ${
                        item.done ? "done" : ""
                      }`}
                    >
                      <label className="checklist-item-label">
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() =>
                            handleToggleChecklist(item.id)
                          }
                        />
                        <span>{item.text}</span>
                      </label>

                      <button
                        type="button"
                        className="checklist-remove-btn"
                        onClick={() =>
                          handleRemoveChecklist(item.id)
                        }
                        aria-label={`Hapus tugas ${item.text}`}
                      >
                        &times;
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <form
                className="checklist-add-form"
                onSubmit={handleAddChecklist}
              >
                <input
                  type="text"
                  value={newChecklistText}
                  onChange={(event) => {
                    setNewChecklistText(event.target.value);
                    setChecklistError("");
                  }}
                  placeholder="Tambah tugas persiapan baru..."
                />
                <button
                  type="submit"
                  className="btn-navy-action"
                >
                  Tambah
                </button>
              </form>

              {checklistError && (
                <p className="form-error" role="alert">
                  {checklistError}
                </p>
              )}
            </section>
          </div>

          {/* KOLOM KANAN: LATIHAN INTERVIEW, GENERATOR FOLLOW-UP HRD & RIWAYAT AKTIVITAS */}
          <div className="detail-right-column">
            <InterviewPrepTimer />

            <FollowUpMessageCard
              key={`${application.id}-${application.status}-${isGhosting ? "ghost" : "ok"}`}
              application={application}
              skillMatch={skillMatch}
              isGhosting={isGhosting}
              onLogMessageAction={handleSaveResearchSummary}
            />

            <section className="detail-section">
              <h3 className="detail-section-label">
                Riwayat Aktivitas
              </h3>

              <form
                className="activity-note-form"
                onSubmit={handleAddManualNote}
              >
                <input
                  type="text"
                  value={manualNote}
                  onChange={(event) => {
                    setManualNote(event.target.value);
                    setNoteError("");
                  }}
                  placeholder="Tulis catatan manual (misal: Follow up HRD)..."
                />
                <button
                  type="submit"
                  className="btn-navy-action"
                >
                  Catat
                </button>
              </form>

              {noteError && (
                <p className="form-error" role="alert">
                  {noteError}
                </p>
              )}

              {reversedLogs.length === 0 ? (
                <p className="checklist-empty-text">
                  Belum ada riwayat aktivitas.
                </p>
              ) : (
                <ul className="activity-timeline">
                  {reversedLogs.map((log) => (
                    <li
                      key={log.id}
                      className="activity-timeline-item"
                    >
                      <span className="activity-dot" />
                      <div className="activity-content">
                        <time>
                          {formatDateTime(log.timestamp)}
                        </time>
                        <p>{log.message}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
