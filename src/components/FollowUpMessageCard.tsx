import { useEffect, useRef, useState } from "react";

import type { Application } from "../types/application";
import {
  generateApplicationMessage,
  getDefaultTemplateType,
  type MessageLanguage,
  type MessageTemplateType,
} from "../utils/messageTemplates";
import type { SkillMatchResult } from "../utils/skillMatch";

interface FollowUpMessageCardProps {
  application: Application;
  skillMatch: SkillMatchResult;
  isGhosting: boolean;
  onLogMessageAction: (message: string) => void;
}

const TEMPLATE_LABELS: Record<MessageTemplateType, string> = {
  "cover-note": "Lamaran Awal / Cover Note",
  "follow-up-ghosting": "Follow-Up HRD (Anti-Ghosting)",
  "post-interview": "Thank You Pasca-Interview",
  "offer-response": "Konfirmasi Offer",
};

function isValidTemplateType(
  value: string
): value is MessageTemplateType {
  return (
    value === "cover-note" ||
    value === "follow-up-ghosting" ||
    value === "post-interview" ||
    value === "offer-response"
  );
}

function isValidLanguage(
  value: string
): value is MessageLanguage {
  return value === "id" || value === "en";
}

export function FollowUpMessageCard({
  application,
  skillMatch,
  isGhosting,
  onLogMessageAction,
}: FollowUpMessageCardProps) {
  const initialTemplate = getDefaultTemplateType(
    application.status,
    isGhosting
  );
  const initialMessage = generateApplicationMessage({
    application,
    skillMatch,
    templateType: initialTemplate,
    language: "id",
  });

  const [templateType, setTemplateType] =
    useState<MessageTemplateType>(initialTemplate);
  const [language, setLanguage] =
    useState<MessageLanguage>("id");
  const [subject, setSubject] = useState(
    initialMessage.subject
  );
  const [body, setBody] = useState(initialMessage.body);

  const [copied, setCopied] = useState(false);
  const [loggedNotice, setLoggedNotice] = useState(false);

  const copyTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  // Cleanup timer status "Tersalin" saat komponen dilepas
  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  function applyTemplate(
    nextTemplate: MessageTemplateType,
    nextLanguage: MessageLanguage
  ) {
    const generated = generateApplicationMessage({
      application,
      skillMatch,
      templateType: nextTemplate,
      language: nextLanguage,
    });

    setSubject(generated.subject);
    setBody(generated.body);
    setCopied(false);
    setLoggedNotice(false);
  }

  function handleTemplateChange(
    nextTemplate: MessageTemplateType
  ) {
    setTemplateType(nextTemplate);
    applyTemplate(nextTemplate, language);
  }

  function handleLanguageChange(
    nextLanguage: MessageLanguage
  ) {
    setLanguage(nextLanguage);
    applyTemplate(templateType, nextLanguage);
  }

  async function handleCopyMessage() {
    const fullText = `Subjek: ${subject}\n\n${body}`;

    try {
      await navigator.clipboard.writeText(fullText);
    } catch {
      // Fallback jika clipboard API dibatasi browser
      const helper = document.createElement("textarea");
      helper.value = fullText;
      helper.setAttribute("readonly", "");
      helper.style.position = "absolute";
      helper.style.left = "-9999px";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      document.body.removeChild(helper);
    }

    if (copyTimerRef.current !== null) {
      clearTimeout(copyTimerRef.current);
    }

    setCopied(true);
    copyTimerRef.current = setTimeout(() => {
      setCopied(false);
      copyTimerRef.current = null;
    }, 2500);
  }

  function handleRecordLog() {
    onLogMessageAction(
      `Menyiapkan pesan "${TEMPLATE_LABELS[templateType]}" (${language.toUpperCase()}) untuk HRD ${application.company}.`
    );
    setLoggedNotice(true);
  }

  return (
    <section
      className="followup-card"
      aria-label="Generator Pesan Follow-Up HRD"
    >
      <div className="followup-header">
        <div>
          <h3>Generator Pesan HRD</h3>
          <p>
            Draf otomatis sesuai status, CV, &amp; skill cocok
            untuk <strong>{application.company}</strong>.
          </p>
        </div>

        {isGhosting && (
          <span className="ghosting-badge">
            Saran: Follow-Up Sekarang
          </span>
        )}
      </div>

      <div className="followup-controls">
        <div className="followup-field">
          <label htmlFor="followup-template-select">
            Jenis Pesan
          </label>
          <select
            id="followup-template-select"
            value={templateType}
            onChange={(event) => {
              const value = event.target.value;
              if (isValidTemplateType(value)) {
                handleTemplateChange(value);
              }
            }}
          >
            {(
              Object.keys(
                TEMPLATE_LABELS
              ) as MessageTemplateType[]
            ).map((key) => (
              <option key={key} value={key}>
                {TEMPLATE_LABELS[key]}
              </option>
            ))}
          </select>
        </div>

        <div className="followup-field followup-lang-field">
          <label htmlFor="followup-lang-select">Bahasa</label>
          <select
            id="followup-lang-select"
            value={language}
            onChange={(event) => {
              const value = event.target.value;
              if (isValidLanguage(value)) {
                handleLanguageChange(value);
              }
            }}
          >
            <option value="id">Indonesia</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      <div className="followup-editor">
        <label htmlFor="followup-subject-input">Subjek</label>
        <input
          id="followup-subject-input"
          type="text"
          value={subject}
          onChange={(event) => {
            setSubject(event.target.value);
            setCopied(false);
          }}
        />

        <label htmlFor="followup-body-textarea">Isi Pesan</label>
        <textarea
          id="followup-body-textarea"
          rows={7}
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            setCopied(false);
          }}
        />
      </div>

      <div className="followup-actions">
        <button
          type="button"
          className="btn-primary-action"
          onClick={() => void handleCopyMessage()}
        >
          {copied ? "Tersalin!" : "Salin Pesan"}
        </button>

        <button
          type="button"
          className="btn-secondary-action"
          onClick={() => applyTemplate(templateType, language)}
        >
          Reset Draf
        </button>

        <button
          type="button"
          className="btn-navy-action"
          onClick={handleRecordLog}
          disabled={loggedNotice}
        >
          {loggedNotice ? "Tercatat di Log" : "Catat ke Riwayat"}
        </button>
      </div>
    </section>
  );
}
