import { useState } from "react";

import type { Application } from "../types/application";
import { calculateOfferScore } from "../utils/offerScore";

interface OfferComparatorProps {
  applications: Application[];
  kaptenSkills: string[];
}

function formatRupiah(amount: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID").format(amount)}`;
}

export function OfferComparator({
  applications,
  kaptenSkills,
}: OfferComparatorProps) {
  const [offerAId, setOfferAId] = useState("");
  const [offerBId, setOfferBId] = useState("");

  const offers = applications.filter((a) => a.status === "OFFER");

  if (offers.length < 2) {
    return (
      <section className="application-card application-empty">
        <h3>Offer Comparator</h3>
        <p>
          Butuh minimal 2 lamaran berstatus OFFER untuk dibandingkan.
          Saat ini ada {offers.length}.
        </p>
      </section>
    );
  }

  // Jika pilihan belum ada / offer-nya sudah dihapus, pakai offer pertama yang tersedia
  const offerA = offers.find((o) => o.id === offerAId) ?? offers[0];
  const offerB =
    offers.find((o) => o.id === offerBId && o.id !== offerA.id) ??
    offers.find((o) => o.id !== offerA.id) ??
    offers[1];

  const highestSalary = Math.max(
    offerA.salaryOffer ?? 0,
    offerB.salaryOffer ?? 0
  );
  const scoreA = calculateOfferScore(offerA, highestSalary, kaptenSkills);
  const scoreB = calculateOfferScore(offerB, highestSalary, kaptenSkills);

  const bestId =
    scoreA.total > scoreB.total
      ? offerA.id
      : scoreB.total > scoreA.total
        ? offerB.id
        : null;

  const columns = [
    { label: "Offer A", offer: offerA, score: scoreA, otherId: offerB.id, setId: setOfferAId },
    { label: "Offer B", offer: offerB, score: scoreB, otherId: offerA.id, setId: setOfferBId },
  ];

  return (
    <section className="application-card offer-comparator">
      <h3>Offer Comparator</h3>
      <p className="offer-formula">
        Skor = Gaji ternormalisasi × 50% + Mode Kerja × 25% + Skill Match × 25%
      </p>

      <div className="offer-columns">
        {columns.map(({ label, offer, score, otherId, setId }) => (
          <div
            key={label}
            className={`offer-column ${bestId === offer.id ? "offer-best" : ""}`}
          >
            <label>
              {label}
              <select
                value={offer.id}
                onChange={(event) => setId(event.target.value)}
              >
                {offers.map((o) => (
                  <option key={o.id} value={o.id} disabled={o.id === otherId}>
                    {o.company} — {o.role}
                  </option>
                ))}
              </select>
            </label>

            {bestId === offer.id && (
              <span className="offer-badge">Rekomendasi Terbaik</span>
            )}

            <dl>
              <dt>Gaji</dt>
              <dd>
                {formatRupiah(offer.salaryOffer ?? 0)}{" "}
                <small>({score.salaryScore} poin)</small>
              </dd>
              <dt>Mode Kerja</dt>
              <dd>
                {offer.workMode} <small>({score.modeScore} poin)</small>
              </dd>
              <dt>Skill Match</dt>
              <dd>{score.skillMatch}%</dd>
              <dt>Skor Total</dt>
              <dd className="offer-total">{score.total}</dd>
            </dl>
          </div>
        ))}
      </div>

      {bestId === null && (
        <p className="offer-formula">Skor kedua offer seimbang.</p>
      )}
    </section>
  );
}
