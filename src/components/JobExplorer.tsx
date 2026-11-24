
import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { useDebounce } from "../hooks/useDebounce";

import type {
  Application,
  WorkMode,
} from "../types/application";

import type { JobListing } from "../types/job";

import {
  getJobListings,
  type JobSource,
} from "../services/jobService";

import {
  calculateSkillMatch,
  type SkillMatchResult,
} from "../utils/skillMatch";

import { isDuplicateApplication } from "../utils/duplicateCheck";

import { JobCard } from "./JobCard";

// Props dari App.tsx
interface JobExplorerProps {
  kaptenSkills: string[];
  applications: Application[];
  setApplications: Dispatch<SetStateAction<Application[]>>;
}

type SortMode = "default" | "highest" | "lowest";

interface ScoredJob {
  job: JobListing;
  match: SkillMatchResult;
  originalIndex: number;
}

// Menentukan mode kerja berdasarkan sumber data
function getKnownWorkMode(
  job: JobListing,
  source: JobSource
): WorkMode | null {
  // Lowongan Remotive merupakan lowongan remote
  if (source === "api") {
    return "Remote";
  }

  const location =
    job.candidate_required_location.toLowerCase();

  if (location.includes("hybrid")) {
    return "Hybrid";
  }

  if (
    location.includes("onsite") ||
    location.includes("on-site")
  ) {
    return "Onsite";
  }

  if (location.includes("remote")) {
    return "Remote";
  }

  return null;
}

export function JobExplorer({
  kaptenSkills,
  applications,
  setApplications,
}: JobExplorerProps) {

  // Sumber data
  const [source, setSource] =
    useState<JobSource>("api");

  // Data lowongan
  const [jobs, setJobs] =
    useState<JobListing[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [retryCount, setRetryCount] =
    useState(0);

  // Pencarian
  const [searchTerm, setSearchTerm] =
    useState("");

  // Filter kategori
  const [selectedCategory, setSelectedCategory] =
    useState("all");

  // Sorting
  const [sortMode, setSortMode] =
    useState<SortMode>("default");

  // Pilihan mode kerja untuk fallback
  const [selectedWorkModes, setSelectedWorkModes] =
    useState<Record<number, WorkMode>>({});

  // Debounce pencarian 400 ms
  const debouncedSearchTerm = useDebounce(
    searchTerm,
    400
  );

  // Mengambil kategori dari data lowongan
  const categories = Array.from(
    new Set(
      jobs
        .map((job) => job.category)
        .filter((category) => category.trim() !== "")
    )
  ).sort((a, b) => a.localeCompare(b));

  const activeCategory =
    selectedCategory === "all" ||
    categories.includes(selectedCategory)
      ? selectedCategory
      : "all";

  // Filter pencarian dan kategori
  const filteredJobs = jobs.filter((job) => {
    const keyword = debouncedSearchTerm
      .trim()
      .toLowerCase();

    const matchesSearch =
      keyword === "" ||
      job.title.toLowerCase().includes(keyword) ||
      job.company_name.toLowerCase().includes(keyword) ||
      job.category.toLowerCase().includes(keyword) ||
      job.tags.some((skill) =>
        skill.toLowerCase().includes(keyword)
      );

    const matchesCategory =
      activeCategory === "all" ||
      job.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  // Menghitung Skill Match
  const scoredJobs: ScoredJob[] = filteredJobs.map(
    (job, index) => ({
      job,
      match: calculateSkillMatch(
        kaptenSkills,
        job.tags
      ),
      originalIndex: index,
    })
  );

  // Mengurutkan lowongan berdasarkan Skill Match
  const sortedJobs = [...scoredJobs].sort((a, b) => {
    if (sortMode === "default") {
      return a.originalIndex - b.originalIndex;
    }

    const difference =
      a.match.score - b.match.score;

    if (difference === 0) {
      return a.originalIndex - b.originalIndex;
    }

    return sortMode === "highest"
      ? -difference
      : difference;
  });

  // Mengambil data API atau fallback
  useEffect(() => {
    const controller = new AbortController();

    async function loadJobs() {
      setIsLoading(true);
      setError(null);
      setJobs([]);

      try {
        const result = await getJobListings(
          source,
          controller.signal
        );

        if (!controller.signal.aborted) {
          setJobs(result);
        }
      } catch (caughtError: unknown) {
        if (!controller.signal.aborted) {
          const message =
            caughtError instanceof Error
              ? caughtError.message
              : "Terjadi kesalahan saat mengambil lowongan.";

          setError(message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadJobs();

    return () => {
      controller.abort();
    };
  }, [source, retryCount]);

  // Retry
  function handleRetry() {
    setRetryCount((previous) => previous + 1);
  }

  // Menambahkan lowongan ke Wishlist
  function handleAddToWishlist(
    job: JobListing,
    workMode: WorkMode
  ) {
    const now = new Date().toISOString();

    const newApplication: Application = {
      id: crypto.randomUUID(),

      company: job.company_name,
      role: job.title,

      workMode,
      status: "WISHLIST",

      requiredSkills: [...job.tags],

      lastUpdatedAt: now,

      checklist: [],

      activityLogs: [
        {
          id: crypto.randomUUID(),
          timestamp: now,
          message: "Lowongan ditambahkan ke Wishlist.",
        },
      ],
    };

    setApplications((previousApplications) => {
      // Memeriksa duplikasi company + role
      const duplicate = isDuplicateApplication(
        previousApplications,
        job.company_name,
        job.title
      );

      if (duplicate) {
        return previousApplications;
      }

      return [
        ...previousApplications,
        newApplication,
      ];
    });
  }

  return (
    <section className="job-explorer">

      {/* Header */}
      <div className="job-explorer-header">
        <div>
          <h2>Jelajahi Lowongan Magang</h2>

          <p>
            Temukan lowongan yang sesuai dengan skill kamu.
          </p>
        </div>

        {/* Sumber data */}
        <div className="source-control">
          <label htmlFor="job-source">
            Sumber Data
          </label>

          <select
            id="job-source"
            value={source}
            onChange={(event) => {
              const value = event.target.value;

              if (
                value === "api" ||
                value === "fallback"
              ) {
                setSource(value);
              }
            }}
          >
            <option value="api">
              Live API
            </option>

            <option value="fallback">
              Fallback Lokal
            </option>
          </select>
        </div>
      </div>

      {/* Pencarian dan filter */}
      <div className="job-search">

        {/* Pencarian */}
        <label htmlFor="job-search-input">
          Cari Lowongan Magang
        </label>

        <input
          id="job-search-input"
          type="search"
          value={searchTerm}
          onChange={(event) =>
            setSearchTerm(event.target.value)
          }
          placeholder="Cari posisi, perusahaan, kategori, atau skill..."
        />

        {/* Sorting */}
        <div className="sort-filter">
          <label htmlFor="sort-select">
            Urutkan Lowongan
          </label>

          <select
            id="sort-select"
            value={sortMode}
            onChange={(event) => {
              const value = event.target.value;

              if (
                value === "default" ||
                value === "highest" ||
                value === "lowest"
              ) {
                setSortMode(value);
              }
            }}
          >
            <option value="default">
              Urutan Default
            </option>

            <option value="highest">
              Skill Match Tertinggi
            </option>

            <option value="lowest">
              Skill Match Terendah
            </option>
          </select>
        </div>

        {/* Filter kategori */}
        <div className="category-filter">
          <label htmlFor="category-select">
            Filter Kategori
          </label>

          <select
            id="category-select"
            value={activeCategory}
            onChange={(event) =>
              setSelectedCategory(event.target.value)
            }
          >
            <option value="all">
              Semua Kategori
            </option>

            {categories.map((category) => (
              <option
                key={category}
                value={category}
              >
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <p role="status" className="job-message">
          Memuat daftar lowongan magang...
        </p>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="job-error" role="alert">
          <h3>Gagal Memuat Lowongan</h3>

          <p>{error}</p>

          <div className="job-actions">
            <button
              type="button"
              onClick={handleRetry}
            >
              Coba Lagi (Retry)
            </button>

            {source === "api" && (
              <button
                type="button"
                onClick={() => setSource("fallback")}
              >
                Gunakan Fallback Lokal
              </button>
            )}
          </div>
        </div>
      )}

      {/* Data kosong */}
      {!isLoading &&
        !error &&
        jobs.length === 0 && (
          <div className="job-message">
            <p>Belum ada lowongan yang tersedia.</p>

            <button
              type="button"
              onClick={handleRetry}
            >
              Muat Ulang
            </button>
          </div>
        )}

      {/* Hasil pencarian kosong */}
      {!isLoading &&
        !error &&
        jobs.length > 0 &&
        filteredJobs.length === 0 && (
          <div className="job-message">
            <p>
              Tidak ada lowongan yang cocok dengan
              pencarianmu.
            </p>
          </div>
        )}

      {/* Daftar lowongan */}
      {!isLoading &&
        !error &&
        filteredJobs.length > 0 && (
          <>
            <p className="job-count">
              Menampilkan {filteredJobs.length} dari{" "}
              {jobs.length} lowongan dari{" "}
              {source === "api"
                ? "Live API"
                : "Fallback Lokal"}
            </p>

            <div className="job-grid">
              {sortedJobs.map(({ job, match }) => {
                const knownWorkMode =
                  getKnownWorkMode(job, source);

                const selectedWorkMode =
                  selectedWorkModes[job.id];

                // Memeriksa apakah sudah tersimpan
                const alreadySaved =
                  isDuplicateApplication(
                    applications,
                    job.company_name,
                    job.title
                  );

                return (
                  <JobCard
                    key={job.id}
                    job={job}
                    match={match}
                    source={source}
                    knownWorkMode={knownWorkMode}
                    selectedWorkMode={selectedWorkMode}
                    alreadySaved={alreadySaved}

                    onSelectWorkMode={(
                      jobId,
                      workMode
                    ) => {
                      setSelectedWorkModes(
                        (previous) => ({
                          ...previous,
                          [jobId]: workMode,
                        })
                      );
                    }}

                    onAddToWishlist={
                      handleAddToWishlist
                    }
                  />
                );
              })}
            </div>
          </>
        )}

    </section>
  );
}
