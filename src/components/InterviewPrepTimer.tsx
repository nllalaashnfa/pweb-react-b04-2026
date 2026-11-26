import { useEffect, useState } from "react";

const INITIAL_SECONDS = 120;

const INTERVIEW_QUESTIONS: readonly string[] = [
  "Ceritakan bug tersulit saat mengelola state di proyek React yang pernah kamu buat, dan bagaimana kamu memperbaikinya?",
  "Bagaimana cara kamu menangani proses fetch data dari API agar tidak terjadi memory leak atau race condition saat komponen ditutup?",
  "Jelaskan mengapa immutability penting saat mengubah state array atau object di React, serta contoh penerapannya.",
  "Ceritakan pengalaman bekerja dalam tim saat mengembangkan fitur web, termasuk cara menyelesaikan konflik kode atau perbedaan pendapat.",
  "Jika API backend tiba-tiba lambat atau mengembalikan error 500, apa yang akan kamu tampilkan di sisi frontend agar pengalaman pengguna tetap baik?",
  "Mengapa TypeScript membantu pada proyek aplikasi yang semakin besar? Berikan contoh error yang bisa dicegah sebelum aplikasi dijalankan.",
];

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")} : ${String(seconds).padStart(2, "0")}`;
}

export function InterviewPrepTimer() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(INITIAL_SECONDS);
  const [isRunning, setIsRunning] = useState(false);

  const hasTimeLeft = secondsLeft > 0;

  useEffect(() => {
    if (!isRunning || !hasTimeLeft) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSecondsLeft((previousSeconds) =>
        previousSeconds <= 1 ? 0 : previousSeconds - 1
      );
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isRunning, hasTimeLeft]);

  function handleToggleStartPause() {
    if (secondsLeft === 0) {
      setSecondsLeft(INITIAL_SECONDS);
      setIsRunning(true);
      return;
    }

    setIsRunning((previous) => !previous);
  }

  function handleReset() {
    setIsRunning(false);
    setSecondsLeft(INITIAL_SECONDS);
  }

  function handleNextQuestion() {
    setIsRunning(false);
    setSecondsLeft(INITIAL_SECONDS);
    setQuestionIndex(
      (previousIndex) =>
        (previousIndex + 1) % INTERVIEW_QUESTIONS.length
    );
  }

  const currentQuestion = INTERVIEW_QUESTIONS[questionIndex];
  const isTimeUp = secondsLeft === 0;

  return (
    <section
      className="interview-prep-card"
      aria-label="Latihan Interview"
    >
      <div className="interview-prep-header">
        <h3>Latihan Interview</h3>
        <span className="interview-question-counter">
          Soal {questionIndex + 1} / {INTERVIEW_QUESTIONS.length}
        </span>
      </div>

      <p className="interview-question-text">
        &ldquo;{currentQuestion}&rdquo;
      </p>

      <div className="interview-timer-row">
        <div
          className={`interview-timer-display ${
            isTimeUp
              ? "time-up"
              : secondsLeft <= 30
                ? "warning"
                : ""
          }`}
          role="timer"
          aria-live="off"
        >
          {formatCountdown(secondsLeft)}
        </div>

        <div className="interview-timer-actions">
          <button
            type="button"
            className="btn-primary-action"
            onClick={handleToggleStartPause}
          >
            {isTimeUp
              ? "Mulai Ulang"
              : isRunning
                ? "Jeda"
                : "Mulai"}
          </button>

          <button
            type="button"
            className="btn-secondary-action"
            onClick={handleReset}
          >
            Reset
          </button>

          <button
            type="button"
            className="btn-secondary-action"
            onClick={handleNextQuestion}
          >
            Lanjut
          </button>
        </div>
      </div>

      {isTimeUp && (
        <p className="interview-timeup-note" role="status">
          Waktu 2 menit habis. Klik Reset atau Lanjut ke soal
          berikutnya.
        </p>
      )}
    </section>
  );
}
