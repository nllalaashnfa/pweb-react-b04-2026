
import type { Application } from "../types/application";

// Mengecek apakah lamaran berisiko mengalami ghosting
export function isGhostingRisk(
  application: Application,
  currentTimeMs: number
): boolean {
  // Ghosting hanya berlaku untuk APPLIED dan SCREENING
  if (
    application.status !== "APPLIED" &&
    application.status !== "SCREENING"
  ) {
    return false;
  }

  // Mengambil waktu terakhir perubahan lamaran
  const lastUpdated = new Date(
    application.lastUpdatedAt
  ).getTime();

  // Jika tanggal tidak valid, tidak dianggap ghosting
  if (!Number.isFinite(lastUpdated)) {
    return false;
  }

  // Batas waktu 14 hari dalam milidetik
  const fourteenDaysMs =
    14 * 24 * 60 * 60 * 1000;

  // Ghosting jika tidak berubah lebih dari 14 hari
  return (
    currentTimeMs - lastUpdated > fourteenDaysMs
  );
}
