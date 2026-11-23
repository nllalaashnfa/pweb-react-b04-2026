
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

interface ManualApplicationFormProps {
  applications: Application[];
  setApplications: Dispatch<SetStateAction<Application[]>>;
}

type InitialStatus = Extract<
  ApplicationStatus,
  "WISHLIST" | "APPLIED"
>;

// Validasi mode kerja
function isValidWorkMode(value: string): value is WorkMode {
  return ["Remote", "Hybrid", "Onsite"].includes(value);
}

// Validasi status awal
function isValidInitialStatus(
  value: string
): value is InitialStatus {
  return value === "WISHLIST" || value === "APPLIED";
}

// Validasi tanggal
function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) return false;

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

export function ManualApplicationForm({
  applications,
  setApplications,
}: ManualApplicationFormProps) {
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

  // Referensi input untuk auto-focus
const companyRef = useRef<HTMLInputElement>(null);
const roleRef = useRef<HTMLInputElement>(null);
const requiredSkillsRef = useRef<HTMLInputElement>(null);
const cvRef = useRef<HTMLInputElement>(null);
const dateRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    // 1. Validasi perusahaan
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

    // 3. Validasi duplikat
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
// 4. Validasi Required Skills
if (!requiredSkills.trim()) {
  setError("Required Skills wajib diisi.");
  requiredSkillsRef.current?.focus();
  return;
}
    // 4. Validasi khusus APPLIED
    if (status === "APPLIED") {
      if (!cvVersion.trim()) {
        setError("Versi CV wajib diisi.");
        cvRef.current?.focus();
        return;
      }

      if (!appliedDate) {
        setError("Tanggal melamar wajib diisi.");
        dateRef.current?.focus();
        return;
      }

      if (!isValidDate(appliedDate)) {
        setError("Tanggal melamar tidak valid.");
        dateRef.current?.focus();
        return;
      }
    }

    // 5. Mengolah required skills
    const parsedSkills = Array.from(
      new Map(
        requiredSkills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean)
          .map((skill) => [
            skill.toLowerCase(),
            skill,
          ])
      ).values()
    );

    const now = new Date().toISOString();

    // 6. Membuat data lamaran baru
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

    // 7. Menyimpan data secara immutable
    setApplications((previousApplications) => [
      ...previousApplications,
      newApplication,
    ]);

    // 8. Reset form
    setCompany("");
    setRole("");
    setWorkMode("Remote");
    setStatus("WISHLIST");
    setRequiredSkills("");
    setCvVersion("");
    setAppliedDate("");

    setSuccess("Lamaran berhasil ditambahkan ke daftar.");

    companyRef.current?.focus();
  }

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
        {/* Nama perusahaan */}
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

        {/* Posisi */}
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

        {/* Mode kerja */}
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

        {/* Status awal */}
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

        {/* Required skills */}
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

        {/* Input kondisional APPLIED */}
        {status === "APPLIED" && (
          <div className="applied-fields">
            <h3>Informasi Lamaran</h3>

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

        {/* Pesan error */}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {/* Pesan berhasil */}
        {success && (
          <p className="form-success" role="status">
            {success}
          </p>
        )}

        <button type="submit">
          Simpan Lamaran
        </button>
      </form>
    </section>
  );
}
