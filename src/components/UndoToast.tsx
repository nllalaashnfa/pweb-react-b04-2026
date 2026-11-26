interface UndoToastProps {
  message: string;
  onUndo: () => void;
}

// Tampilan saja: timer 5 detik & data yang dipulihkan diatur di App.tsx
export function UndoToast({ message, onUndo }: UndoToastProps) {
  return (
    <div className="undo-toast" role="status" aria-live="polite">
      <span>{message}</span>

      <button type="button" onClick={onUndo}>
        Undo
      </button>
    </div>
  );
}
