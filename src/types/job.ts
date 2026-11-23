
export interface JobListing {
  id: number;
  title: string;
  company_name: string;
  category: string;
  candidate_required_location: string;
  salary: string;
  tags: string[];
  url?: string;
}

export interface JobApiResponse {
  "job-count": number;
  "total-job-count"?: number;
  jobs: JobListing[];
}
