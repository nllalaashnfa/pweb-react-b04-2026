
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

function normalizeJobListing(
  value: unknown
): JobListing | null {
  if (!isRecord(value)) {
    return null;
  }

  const id =
    typeof value.id === "number"
      ? value.id
      : typeof value.id === "string"
        ? Number(value.id)
        : Number.NaN;

  const title =
    typeof value.title === "string"
      ? value.title.trim()
      : "";

  const companyName =
    typeof value.company_name === "string"
      ? value.company_name.trim()
      : "";

  if (
    !Number.isFinite(id) ||
    !title ||
    !companyName
  ) {
    return null;
  }

  const url =
    typeof value.url === "string" &&
    value.url.startsWith("https://remotive.com/")
      ? value.url
      : undefined;

  const rawTags: unknown[] = Array.isArray(value.tags)
    ? value.tags
    : [];

  const tags = rawTags
    .filter(
      (tag): tag is string =>
        typeof tag === "string"
    )
    .map((tag) => tag.trim())
    .filter(Boolean);

  return {
    id,
    title,
    company_name: companyName,

    category:
      typeof value.category === "string" &&
      value.category.trim()
        ? value.category.trim()
        : "Lainnya",

    candidate_required_location:
      typeof value.candidate_required_location === "string" &&
      value.candidate_required_location.trim()
        ? value.candidate_required_location.trim()
        : "Tidak dicantumkan",

    salary:
      typeof value.salary === "string"
        ? value.salary.trim()
        : "",

    tags,

    ...(url ? { url } : {}),
  };
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
    throw new Error(
      "Format respons API tidak valid."
    );
  }

  const rawJobs: unknown[] = data.jobs;

  const jobs = rawJobs
    .map((job) => normalizeJobListing(job))
    .filter(
      (job): job is JobListing => job !== null
    );

  if (rawJobs.length > 0 && jobs.length === 0) {
    throw new Error(
      "Tidak ada data lowongan valid."
    );
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
