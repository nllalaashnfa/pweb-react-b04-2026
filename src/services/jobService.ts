import type { JobListing } from "../types/job";

export type JobSource = "api" | "fallback";

const REMOTIVE_API_URL =
  "https://remotive.com/api/remote-jobs?category=software-dev&limit=30";

const FALLBACK_URL = "/magang-fallback.json";

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isJobListing(value: unknown): value is JobListing {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "number" &&
    typeof value.title === "string" &&
    typeof value.company_name === "string" &&
    typeof value.category === "string" &&
    typeof value.candidate_required_location === "string" &&
    typeof value.salary === "string" &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === "string")
  );
}

async function fetchJobsFromUrl(
  url: string,
  signal: AbortSignal
): Promise<JobListing[]> {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(
      `Gagal mengambil data lowongan. Status: ${response.status}`
    );
  }

  const data: unknown = await response.json();

  if (!isRecord(data) || !Array.isArray(data.jobs)) {
    throw new Error("Format respons API tidak valid.");
  }

  const jobs: unknown[] = data.jobs;

  if (!jobs.every(isJobListing)) {
    throw new Error("Format data lowongan tidak sesuai.");
  }

  return jobs;
}

export async function getJobListings(
  source: JobSource,
  signal: AbortSignal
): Promise<JobListing[]> {
  const url =
    source === "api"
      ? REMOTIVE_API_URL
      : FALLBACK_URL;

  return fetchJobsFromUrl(url, signal);
}