
import { useState } from "react";

import { ManualApplicationForm } from "./components/ManualApplicationForm";
import { ApplicationList } from "./components/ApplicationList";
import { SkillProfile } from "./components/SkillProfile";
import { JobExplorer } from "./components/JobExplorer";

import { useLocalStorage } from "./hooks/useLocalStorage";

import type { Application } from "./types/application";

import "./App.css";

type DashboardView = "explore" | "pipeline" | "add";

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

        </nav>

        <button
          type="button"
          className="dashboard-add-button"
          onClick={() => setActiveView("add")}
        >
          + Catat Lamaran
        </button>

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
          />
        )}

        {/* TAMBAH LAMARAN MANUAL */}
        {activeView === "add" && (
          <ManualApplicationForm
            applications={applications}
            setApplications={setApplications}
          />
        )}

      </main>

    </div>
  );
}

export default App;
