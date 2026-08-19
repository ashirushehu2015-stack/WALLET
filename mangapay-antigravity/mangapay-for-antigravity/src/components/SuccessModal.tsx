import { CheckCircle2, X } from "lucide-react";
import { formatNaira } from "../api/api";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  amount?: number;
  reference?: string;
  message?: string;
}

export default function SuccessModal({
  open,
  onClose,
  title,
  amount,
  reference,
  message,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-sm rounded-[24px] p-6 shadow-soft text-center">
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-elevated text-text-secondary"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mx-auto w-16 h-16 rounded-full bg-accent-soft flex items-center justify-center mb-4">
          <CheckCircle2 size={36} className="text-accent" />
        </div>
        <h3 className="text-xl font-semibold text-text-primary mb-1">{title}</h3>
        {amount !== undefined && (
          <p className="text-2xl font-bold text-accent mb-2">
            {formatNaira(amount)}
          </p>
        )}
        {message && (
          <p className="text-sm text-text-secondary mb-3">{message}</p>
        )}
        {reference && (
          <p className="text-xs text-text-secondary bg-elevated rounded-xl py-2 px-3 inline-block">
            Ref: {reference}
          </p>
        )}
        <button
          onClick={onClose}
          className="mt-6 w-full h-12 rounded-2xl bg-accent text-white font-semibold hover:opacity-90 transition"
        >
          Done
        </button>
      </div>
    </div>
  );
}
