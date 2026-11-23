
import type { Application } from "../types/application";

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

export function isDuplicateApplication(
  applications: Application[],
  company: string,
  role: string,
  excludeId?: string
): boolean {
  const normalizedCompany = normalizeText(company);
  const normalizedRole = normalizeText(role);

  return applications.some(
    (app) =>
      app.id !== excludeId &&
      normalizeText(app.company) === normalizedCompany &&
      normalizeText(app.role) === normalizedRole
  );
}
