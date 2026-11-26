
import { useEffect, useRef, useState } from "react";

import { ManualApplicationForm } from "./components/ManualApplicationForm";
import { ApplicationList } from "./components/ApplicationList";
import { SkillProfile } from "./components/SkillProfile";
import { JobExplorer } from "./components/JobExplorer";
import { StatsDashboard } from "./components/StatsDashboard";
import { OfferComparator } from "./components/OfferComparator";
import { ThemeToggle } from "./components/ThemeToggle";
import { UndoToast } from "./components/UndoToast";

import { useLocalStorage } from "./hooks/useLocalStorage";

import type { Application } from "./types/application";

import "./App.css";
import "./theme.css";

type DashboardView = "explore" | "pipeline" | "add" | "dashboard";

interface PendingDeletion {
  application: Application;
  originalIndex: number;
}

function App() {
  const [activeView, setActiveView] =
    useState<DashboardView>("explore");

  const [kaptenSkills, setKaptenSkills] =
    useLocalStorage<string[]>("kaptenSkills", [
      "React",
      "TypeScript",
      "CSS",
    ]);

  const [applications, setApplications] =
    useLocalStorage<Application[]>(
      "magangApplications",
      []
    );

  // FITUR 6: UNDO DELETE 5 DETIK
  // Disimpan di App (bukan di tab Pipeline) agar toast tetap ada saat pindah tab
  const [pendingDeletion, setPendingDeletion] =
    useState<PendingDeletion | null>(null);

  // ID setTimeout disimpan di useRef: mengubahnya tidak memicu render ulang
  const undoTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup: bersihkan timer jika App dilepas
  useEffect(() => {
    return () => {
      if (undoTimerRef.current !== null) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  function handleDeleteApplication(applicationId: string) {
    const originalIndex = applications.findIndex(
      (application) => application.id === applicationId
    );

    if (originalIndex === -1) {
      return;
    }

    // Hapus 2x dalam < 5 detik: timer lama dibersihkan
    if (undoTimerRef.current !== null) {
      clearTimeout(undoTimerRef.current);
    }

    setApplications((previousApplications) =>
      previousApplications.filter(
        (application) => application.id !== applicationId
      )
    );

    // Salinan utuh (termasuk checklist & activityLogs) untuk Undo
    setPendingDeletion({
      application: applications[originalIndex],
      originalIndex,
    });

    undoTimerRef.current = setTimeout(() => {
      setPendingDeletion(null);
      undoTimerRef.current = null;
    }, 5000);
  }

  function handleUndo() {
    if (!pendingDeletion) {
      return;
    }

    if (undoTimerRef.current !== null) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }

    const { application, originalIndex } = pendingDeletion;

    // Sisipkan kembali di posisi semula secara immutable
    setApplications((previousApplications) => {
      if (
        previousApplications.some(
          (item) => item.id === application.id
        )
      ) {
        return previousApplications;
      }

      return [
        ...previousApplications.slice(0, originalIndex),
        application,
        ...previousApplications.slice(originalIndex),
      ];
    });

    setPendingDeletion(null);
  }

  return (
    <div className="app-shell">

      {/* HEADER DASHBOARD */}
      <header className="dashboard-header">

        <div className="dashboard-brand">
          <span className="brand-logo">AM</span>

          <h1>Aku Mw Magang</h1>
        </div>

        <nav className="dashboard-nav">

          <button
            type="button"
            className={
              activeView === "explore" ? "active" : ""
            }
            onClick={() => setActiveView("explore")}
          >
            Eksplorasi Lowongan
          </button>

          <button
            type="button"
            className={
              activeView === "pipeline" ? "active" : ""
            }
            onClick={() => setActiveView("pipeline")}
          >
            Pipeline Lamaran ({applications.length})
          </button>

          <button
            type="button"
            className={
              activeView === "dashboard" ? "active" : ""
            }
            onClick={() => setActiveView("dashboard")}
          >
            Dashboard
          </button>

        </nav>

        <div className="header-actions">
          <ThemeToggle />

          <button
            type="button"
            className="dashboard-add-button"
            onClick={() => setActiveView("add")}
          >
            + Catat Lamaran
          </button>
        </div>

      </header>

      {/* KONTEN DASHBOARD */}
      <main className={`dashboard-main view-${activeView}`}>

        {/* EKSPLORASI LOWONGAN */}
        {activeView === "explore" && (
          <>
            <SkillProfile
              skills={kaptenSkills}
              setSkills={setKaptenSkills}
            />

            <JobExplorer
              kaptenSkills={kaptenSkills}
              applications={applications}
              setApplications={setApplications}
            />
          </>
        )}

        {/* PIPELINE LAMARAN */}
        {activeView === "pipeline" && (
          <ApplicationList
            applications={applications}
            setApplications={setApplications}
            kaptenSkills={kaptenSkills}
            onDelete={handleDeleteApplication}
          />
        )}

        {/* DASHBOARD STATISTIK & OFFER COMPARATOR */}
        {activeView === "dashboard" && (
          <>
            <StatsDashboard applications={applications} />

            <OfferComparator
              applications={applications}
              kaptenSkills={kaptenSkills}
            />
          </>
        )}

        {/* TAMBAH LAMARAN MANUAL */}
        {activeView === "add" && (
          <ManualApplicationForm
            applications={applications}
            setApplications={setApplications}
          />
        )}

      </main>

      {pendingDeletion && (
        <UndoToast
          message={`${pendingDeletion.application.role} berhasil dihapus.`}
          onUndo={handleUndo}
        />
      )}

    </div>
  );
}

export default App;
