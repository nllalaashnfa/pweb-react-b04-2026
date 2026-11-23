
import {
  useRef,
  useState,
  type FormEvent,
  type Dispatch,
  type SetStateAction,
} from "react";

import type {
  Application,
  ApplicationStatus,
  WorkMode,
} from "../types/application";

import { isDuplicateApplication } from "../utils/duplicateCheck";

// ==========================================
// PROPS
// ==========================================

interface ManualApplicationFormProps {
  applications: Application[];
  setApplications: Dispatch<SetStateAction<Application[]>>;
}

type InitialStatus = Extract<
  ApplicationStatus,
  "WISHLIST" | "APPLIED"
>;

// ==========================================
// VALIDATION HELPERS
// ==========================================

// Validasi mode kerja
function isValidWorkMode(value: string): value is WorkMode {
  return (
    value === "Remote" ||
    value === "Hybrid" ||
    value === "Onsite"
  );
}

// Validasi status awal
function isValidInitialStatus(
  value: string
): value is InitialStatus {
  return value === "WISHLIST" || value === "APPLIED";
}

// Validasi tanggal YYYY-MM-DD
function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// Mengolah skill dan menghapus duplikat
function parseRequiredSkills(value: string): string[] {
  const uniqueSkills = new Map<string, string>();

  value.split(",").forEach((skill) => {
    const trimmedSkill = skill.trim();

    if (trimmedSkill) {
      const normalizedSkill = trimmedSkill.toLowerCase();

      if (!uniqueSkills.has(normalizedSkill)) {
        uniqueSkills.set(normalizedSkill, trimmedSkill);
      }
    }
  });

  return Array.from(uniqueSkills.values());
}

// ==========================================
// MANUAL APPLICATION FORM
// ==========================================

export function ManualApplicationForm({
  applications,
  setApplications,
}: ManualApplicationFormProps) {
  // ========================================
  // FORM STATE
  // ========================================

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");

  const [workMode, setWorkMode] =
    useState<WorkMode>("Remote");

  const [status, setStatus] =
    useState<InitialStatus>("WISHLIST");

  const [requiredSkills, setRequiredSkills] =
    useState("");

  const [cvVersion, setCvVersion] = useState("");
  const [appliedDate, setAppliedDate] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ========================================
  // INPUT REFS - AUTO FOCUS
  // ========================================

  const companyRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<HTMLInputElement>(null);
  const requiredSkillsRef = useRef<HTMLInputElement>(null);
  const cvRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  // ========================================
  // HANDLE SUBMIT
  // ========================================

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    // 1. Validasi nama perusahaan
    if (!company.trim()) {
      setError("Nama perusahaan wajib diisi.");
      companyRef.current?.focus();
      return;
    }

    // 2. Validasi posisi
    if (!role.trim()) {
      setError("Posisi atau role wajib diisi.");
      roleRef.current?.focus();
      return;
    }

    // 3. Validasi duplikat perusahaan dan posisi
    if (
      isDuplicateApplication(
        applications,
        company,
        role
      )
    ) {
      setError(
        "Lamaran dengan perusahaan dan posisi tersebut sudah terdaftar."
      );

      companyRef.current?.focus();
      return;
    }

    // 4. Mengolah Required Skills
    const parsedSkills = parseRequiredSkills(requiredSkills);

    // 5. Validasi Required Skills
    if (parsedSkills.length === 0) {
      setError(
        "Masukkan minimal satu skill yang valid."
      );

      requiredSkillsRef.current?.focus();
      return;
    }

    // 6. Validasi khusus status APPLIED
    if (status === "APPLIED") {
      // Validasi versi CV
      if (!cvVersion.trim()) {
        setError("Versi CV wajib diisi.");
        cvRef.current?.focus();
        return;
      }

      // Validasi tanggal melamar
      if (!appliedDate) {
        setError("Tanggal melamar wajib diisi.");
        dateRef.current?.focus();
        return;
      }

      // Validasi format dan tanggal kalender
      if (!isValidDate(appliedDate)) {
        setError("Tanggal melamar tidak valid.");
        dateRef.current?.focus();
        return;
      }
    }

    // ========================================
    // CREATE APPLICATION
    // ========================================

    const now = new Date().toISOString();

    const newApplication: Application = {
      id: crypto.randomUUID(),

      company: company.trim(),
      role: role.trim(),

      workMode,
      status,

      requiredSkills: parsedSkills,

      ...(status === "APPLIED"
        ? {
            cvVersion: cvVersion.trim(),
            appliedDate,
          }
        : {}),

      lastUpdatedAt: now,

      checklist: [],

      activityLogs: [
        {
          id: crypto.randomUUID(),
          timestamp: now,
          message: `Lamaran ditambahkan dengan status ${status}.`,
        },
      ],
    };

    // ========================================
    // SAVE APPLICATION
    // ========================================

    setApplications((previousApplications) => [
      ...previousApplications,
      newApplication,
    ]);

    // ========================================
    // RESET FORM
    // ========================================

    setCompany("");
    setRole("");
    setWorkMode("Remote");
    setStatus("WISHLIST");
    setRequiredSkills("");
    setCvVersion("");
    setAppliedDate("");

    setError("");
    setSuccess("Lamaran berhasil ditambahkan ke daftar.");

    companyRef.current?.focus();
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <section className="manual-application">
      <div className="manual-application-header">
        <h2>Tambah Lamaran Manual</h2>

        <p>
          Tambahkan lamaran yang tidak ditemukan
          di daftar Jelajahi Lowongan.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* NAMA PERUSAHAAN */}

        <div className="form-field">
          <label htmlFor="manual-company">
            Nama Perusahaan
          </label>

          <input
            ref={companyRef}
            id="manual-company"
            type="text"
            value={company}
            onChange={(event) =>
              setCompany(event.target.value)
            }
            placeholder="Contoh: Nusantara Cloud"
          />
        </div>

        {/* POSISI / ROLE */}

        <div className="form-field">
          <label htmlFor="manual-role">
            Posisi / Role
          </label>

          <input
            ref={roleRef}
            id="manual-role"
            type="text"
            value={role}
            onChange={(event) =>
              setRole(event.target.value)
            }
            placeholder="Contoh: Frontend Developer Intern"
          />
        </div>

        {/* MODE KERJA */}

        <div className="form-field">
          <label htmlFor="manual-workmode">
            Mode Kerja
          </label>

          <select
            id="manual-workmode"
            value={workMode}
            onChange={(event) => {
              const value = event.target.value;

              if (isValidWorkMode(value)) {
                setWorkMode(value);
              }
            }}
          >
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
            <option value="Onsite">Onsite</option>
          </select>
        </div>

        {/* STATUS AWAL */}

        <div className="form-field">
          <label htmlFor="manual-status">
            Status Awal
          </label>

          <select
            id="manual-status"
            value={status}
            onChange={(event) => {
              const value = event.target.value;

              if (isValidInitialStatus(value)) {
                setStatus(value);
              }
            }}
          >
            <option value="WISHLIST">Wishlist</option>
            <option value="APPLIED">Applied</option>
          </select>
        </div>

        {/* REQUIRED SKILLS */}

        <div className="form-field">
          <label htmlFor="manual-skills">
            Required Skills
          </label>

          <input
            ref={requiredSkillsRef}
            id="manual-skills"
            type="text"
            value={requiredSkills}
            onChange={(event) =>
              setRequiredSkills(event.target.value)
            }
            placeholder="React, TypeScript, CSS"
          />

          <small>
            Pisahkan setiap skill menggunakan koma.
            Contoh: React, TypeScript, CSS.
          </small>
        </div>

        {/* FIELD TAMBAHAN APPLIED */}

        {status === "APPLIED" && (
          <div className="applied-fields">
            <h3>Informasi Lamaran</h3>

            {/* VERSI CV */}

            <div className="form-field">
              <label htmlFor="manual-cv">
                Versi CV
              </label>

              <input
                ref={cvRef}
                id="manual-cv"
                type="text"
                value={cvVersion}
                onChange={(event) =>
                  setCvVersion(event.target.value)
                }
                placeholder="Contoh: CV_V2"
              />
            </div>

            {/* TANGGAL MELAMAR */}

            <div className="form-field">
              <label htmlFor="manual-date">
                Tanggal Melamar
              </label>

              <input
                ref={dateRef}
                id="manual-date"
                type="date"
                value={appliedDate}
                onChange={(event) =>
                  setAppliedDate(event.target.value)
                }
              />
            </div>
          </div>
        )}

        {/* PESAN ERROR */}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {/* PESAN BERHASIL */}

        {success && (
          <p className="form-success" role="status">
            {success}
          </p>
        )}

        {/* TOMBOL SIMPAN */}

        <button type="submit">
          Simpan Lamaran
        </button>
      </form>
    </section>
  );
}
