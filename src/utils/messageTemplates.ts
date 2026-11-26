import type { Application, ApplicationStatus } from "../types/application";
import type { SkillMatchResult } from "./skillMatch";

export type MessageTemplateType =
  | "cover-note"
  | "follow-up-ghosting"
  | "post-interview"
  | "offer-response";

export type MessageLanguage = "id" | "en";

export interface GeneratedMessage {
  subject: string;
  body: string;
}

export function getDefaultTemplateType(
  status: ApplicationStatus,
  isGhosting: boolean
): MessageTemplateType {
  if (isGhosting) {
    return "follow-up-ghosting";
  }

  switch (status) {
    case "WISHLIST":
      return "cover-note";
    case "APPLIED":
    case "SCREENING":
    case "GHOSTED":
      return "follow-up-ghosting";
    case "INTERVIEW":
      return "post-interview";
    case "OFFER":
    case "REJECTED":
      return "offer-response";
  }
}

function formatReadableDate(
  value: string | undefined,
  language: MessageLanguage
): string {
  if (!value) {
    return language === "id" ? "beberapa waktu lalu" : "recently";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    language === "id" ? "id-ID" : "en-US",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID").format(amount);
}

export function generateApplicationMessage(params: {
  application: Application;
  skillMatch: SkillMatchResult;
  templateType: MessageTemplateType;
  language: MessageLanguage;
}): GeneratedMessage {
  const { application, skillMatch, templateType, language } =
    params;

  const matchedText =
    skillMatch.matchedSkills.length > 0
      ? skillMatch.matchedSkills.slice(0, 4).join(", ")
      : application.requiredSkills.slice(0, 3).join(", ") ||
        "pengembangan perangkat lunak";

  const cvNote = application.cvVersion
    ? ` (CV: ${application.cvVersion})`
    : "";
  const appliedDateText = formatReadableDate(
    application.appliedDate ?? application.lastUpdatedAt,
    language
  );
  const interviewDateText = formatReadableDate(
    application.interviewDateTime,
    language
  );

  if (language === "en") {
    switch (templateType) {
      case "cover-note":
        return {
          subject: `Internship Application — ${application.role} (${application.company})`,
          body: [
            `Dear Hiring Team at ${application.company},`,
            "",
            `I am writing to express my strong interest in the ${application.role} (${application.workMode}) opportunity at ${application.company}. With hands-on experience in ${matchedText}, I am confident I can contribute effectively to your engineering team.`,
            "",
            `Please find my updated resume${cvNote} attached for your review. Thank you very much for your time and consideration.`,
            "",
            "Best regards,",
            "Kapten",
          ].join("\n"),
        };

      case "follow-up-ghosting":
        return {
          subject: `Follow-Up: ${application.role} Application at ${application.company}`,
          body: [
            `Dear Recruitment Team at ${application.company},`,
            "",
            `I hope this message finds you well. I am following up on my application for the ${application.role} position submitted on ${appliedDateText}${cvNote}.`,
            "",
            `I remain very enthusiastic about contributing to ${application.company}, especially leveraging my background in ${matchedText}. Could you kindly share an update regarding the current selection timeline?`,
            "",
            "Thank you for your time and update.",
            "",
            "Best regards,",
            "Kapten",
          ].join("\n"),
        };

      case "post-interview":
        return {
          subject: `Thank You — ${application.role} Interview (${application.company})`,
          body: [
            `Dear ${application.company} Interview Team,`,
            "",
            `Thank you for the opportunity to interview for the ${application.role} position (${interviewDateText}). I truly enjoyed learning more about your team's workflow and technical challenges.`,
            "",
            `Our discussion further reinforced my excitement to contribute using ${matchedText}. Please let me know if there is any additional information I can provide.`,
            "",
            "Best regards,",
            "Kapten",
          ].join("\n"),
        };

      case "offer-response": {
        const salaryLine =
          typeof application.salaryOffer === "number" &&
          application.salaryOffer > 0
            ? ` with an allowance of Rp ${formatRupiah(application.salaryOffer)} (${application.workMode})`
            : ` (${application.workMode})`;

        return {
          subject: `Offer Confirmation — ${application.role} at ${application.company}`,
          body: [
            `Dear HR & Hiring Team at ${application.company},`,
            "",
            `Thank you very much for extending the internship offer for the ${application.role} role${salaryLine}. I am thrilled about the opportunity to join ${application.company}.`,
            "",
            "Could you please share the onboarding details and next administrative steps so I can prepare accordingly?",
            "",
            "Best regards,",
            "Kapten",
          ].join("\n"),
        };
      }
    }
  }

  // Bahasa Indonesia
  switch (templateType) {
    case "cover-note":
      return {
        subject: `Lamaran Magang — ${application.role} (${application.company})`,
        body: [
          `Yth. Tim Rekrutmen ${application.company},`,
          "",
          `Perkenalkan saya Kapten. Melalui pesan ini saya ingin menyampaikan ketertarikan saya untuk melamar posisi ${application.role} (${application.workMode}) di ${application.company}.`,
          "",
          `Saya memiliki pengalaman membangun proyek menggunakan ${matchedText} yang relevan dengan kebutuhan tim. Bersama pesan ini saya lampirkan CV terbaru${cvNote} dan portofolio untuk bahan pertimbangan.`,
          "",
          "Terima kasih atas waktu dan kesempatannya.",
          "",
          "Hormat saya,",
          "Kapten",
        ].join("\n"),
      };

    case "follow-up-ghosting":
      return {
        subject: `Follow-Up Lamaran ${application.role} — ${application.company}`,
        body: [
          `Yth. Tim HRD ${application.company},`,
          "",
          `Semoga Bapak/Ibu dalam keadaan baik. Saya ingin menindaklanjuti status lamaran saya untuk posisi ${application.role} yang telah dikirimkan pada ${appliedDateText}${cvNote}.`,
          "",
          `Saya tetap sangat antusias untuk berkontribusi di ${application.company}, khususnya dengan keahlian saya di ${matchedText}. Apabila berkenan, apakah terdapat pembaruan mengenai jadwal atau tahap seleksi selanjutnya?`,
          "",
          "Terima kasih banyak atas perhatian dan konfirmasinya.",
          "",
          "Hormat saya,",
          "Kapten",
        ].join("\n"),
      };

    case "post-interview":
      return {
        subject: `Terima Kasih — Sesi Interview ${application.role} (${application.company})`,
        body: [
          `Yth. Tim Pewawancara & HRD ${application.company},`,
          "",
          `Terima kasih banyak atas kesempatan sesi interview untuk posisi ${application.role} (${interviewDateText}). Saya sangat menikmati diskusi mengenai tantangan teknis serta alur kerja tim di ${application.company}.`,
          "",
          `Diskusi tersebut semakin memantapkan minat saya untuk berkontribusi melalui keahlian ${matchedText}. Jika masih ada dokumen atau informasi tambahan yang dibutuhkan, saya siap mengirimkannya segera.`,
          "",
          "Hormat saya,",
          "Kapten",
        ].join("\n"),
      };

    case "offer-response": {
      const salaryLine =
        typeof application.salaryOffer === "number" &&
        application.salaryOffer > 0
          ? ` dengan penawaran Rp ${formatRupiah(application.salaryOffer)} (${application.workMode})`
          : ` (${application.workMode})`;

      return {
        subject: `Konfirmasi Offer Magang — ${application.role} (${application.company})`,
        body: [
          `Yth. Tim HRD ${application.company},`,
          "",
          `Terima kasih sebesar-besarnya atas kepercayaan dan offer magang untuk posisi ${application.role}${salaryLine}. Saya sangat bersemangat untuk dapat bergabung bersama tim ${application.company}.`,
          "",
          "Mohon informasinya terkait dokumen administrasi atau langkah onboarding berikutnya yang perlu saya lengkapi.",
          "",
          "Hormat saya,",
          "Kapten",
        ].join("\n"),
      };
    }
  }
}
