import { useState } from "react";

import type { Application } from "../types/application";
import { calculateStats } from "../utils/statistics";

interface StatsDashboardProps {
  applications: Application[];
}

export function StatsDashboard({ applications }: StatsDashboardProps) {
  // Waktu diambil sekali saat tab dibuka; cukup untuk cek ghosting > 14 hari
  const [currentTimeMs] = useState(() => Date.now());

  // Derived state: dihitung ulang setiap render, tidak disimpan di useState
  const stats = calculateStats(applications, currentTimeMs);

  const cards = [
    { label: "Total Lamaran", value: String(stats.total) },
    { label: "Response Rate", value: `${stats.responseRate}%` },
    { label: "Interview Rate", value: `${stats.interviewRate}%` },
    { label: "Rawan Ghosting", value: String(stats.ghostingRisk) },
    { label: "Total Offer", value: String(stats.totalOffer) },
  ];

  return (
    <section className="stats-grid" aria-label="Statistik lamaran">
      {cards.map((card) => (
        <div key={card.label} className="application-card stats-card">
          <span className="stats-label">{card.label}</span>
          <strong className="stats-value">{card.value}</strong>
        </div>
      ))}
    </section>
  );
}
