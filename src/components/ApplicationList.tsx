
import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { Application } from "../types/application";

interface ApplicationListProps {
  applications: Application[];
  setApplications: Dispatch<SetStateAction<Application[]>>;
}

interface PendingDeletion {
  application: Application;
  originalIndex: number;
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

export function ApplicationList({
  applications,
  setApplications,
}: ApplicationListProps) {
  const [pendingDeletion, setPendingDeletion] =
    useState<PendingDeletion | null>(null);

  // Menyimpan ID timer Undo
  const undoTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  // Membersihkan timer ketika komponen dilepas
  useEffect(() => {
    return () => {
      if (undoTimerRef.current !== null) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  // Menghapus lamaran
  function handleDelete(applicationId: string) {
    const originalIndex = applications.findIndex(
      (application) => application.id === applicationId
    );

    if (originalIndex === -1) {
      return;
    }

    const deletedApplication = applications[originalIndex];

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

    // Membatalkan timer
    if (undoTimerRef.current !== null) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }

    const { application, originalIndex } = pendingDeletion;

    setApplications((previousApplications) => {
      // Mencegah data muncul dua kali
      if (
        previousApplications.some(
          (item) => item.id === application.id
        )
      ) {
        return previousApplications;
      }

      const restoredApplications = [
        ...previousApplications,
      ];

      restoredApplications.splice(
        Math.min(originalIndex, restoredApplications.length),
        0,
        application
      );

      return restoredApplications;
    });

    setPendingDeletion(null);
  }

  return (
    <section className="application-tracker">
      <div className="application-tracker-header">
        <div>
          <h2>Daftar Lamaran Saya</h2>
          <p>
            Pantau perkembangan seluruh lamaran magangmu.
          </p>
        </div>

        <span className="application-total">
          {applications.length} Lamaran
        </span>
      </div>

      {applications.length === 0 ? (
        <div className="application-empty">
          <h3>Belum Ada Lamaran</h3>
          <p>
            Tambahkan lowongan dari bagian Jelajahi Lowongan
            untuk menyimpannya ke Wishlist.
          </p>
        </div>
      ) : (
        <div className="application-grid">
          {applications.map((application) => (
            <article
              key={application.id}
              className="application-card"
            >
              <div className="application-card-header">
                <h3>{application.role}</h3>

                <span className="application-status">
                  {application.status}
                </span>
              </div>

              <p>
                <strong>Perusahaan:</strong>{" "}
                {application.company}
              </p>

              <p>
                <strong>Mode Kerja:</strong>{" "}
                {application.workMode}
              </p>

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

              <button
                type="button"
                className="application-delete-button"
                onClick={() => handleDelete(application.id)}
              >
                {application.status === "WISHLIST"
                  ? "Batalkan Wishlist"
                  : "Hapus Lamaran"}
              </button>
            </article>
          ))}
        </div>
      )}

      {/* Notifikasi Undo */}
      {pendingDeletion && (
        <div
          className="undo-toast"
          role="status"
          aria-live="polite"
        >
          <span>
            {pendingDeletion.application.role} berhasil dihapus.
          </span>

          <button
            type="button"
            onClick={handleUndo}
          >
            Undo
          </button>
        </div>
      )}
    </section>
  );
}
