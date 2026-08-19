import { useState, useEffect } from "react";
import { Fingerprint, X, Delete } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  biometricEnabled?: boolean;
}

export default function PINModal({
  open,
  onClose,
  onSuccess,
  title = "Enter PIN",
  biometricEnabled = true,
}: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!open) {
      setPin("");
      setError(false);
      setScanning(false);
    }
  }, [open]);

  if (!open) return null;

  const handleDigit = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      setTimeout(() => {
        if (next === "1234") {
          onSuccess();
        } else {
          setError(true);
          setPin("");
        }
      }, 200);
    }
  };

  const handleBiometric = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      onSuccess();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-md rounded-t-[24px] sm:rounded-[24px] p-6 pb-8 shadow-soft animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-elevated text-text-secondary"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                pin.length > i
                  ? error
                    ? "bg-red-500 border-red-500"
                    : "bg-accent border-accent"
                  : "border-border bg-transparent"
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-red-500 mb-4">
            Incorrect PIN. Try again (hint: 1234)
          </p>
        )}

        {biometricEnabled && (
          <button
            onClick={handleBiometric}
            disabled={scanning}
            className="w-full flex items-center justify-center gap-2 py-3 mb-5 rounded-2xl bg-accent-soft text-accent font-medium transition-opacity disabled:opacity-60"
          >
            <Fingerprint size={22} className={scanning ? "animate-pulse" : ""} />
            {scanning ? "Scanning…" : "Use Biometrics"}
          </button>
        )}

        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map(
            (key) => {
              if (key === "") return <div key="empty" />;
              if (key === "del")
                return (
                  <button
                    key="del"
                    onClick={() => setPin((p) => p.slice(0, -1))}
                    className="h-14 rounded-2xl flex items-center justify-center text-text-secondary hover:bg-elevated active:scale-95 transition"
                  >
                    <Delete size={22} />
                  </button>
                );
              return (
                <button
                  key={key}
                  onClick={() => handleDigit(key)}
                  className="h-14 rounded-2xl bg-elevated text-xl font-semibold text-text-primary hover:bg-border active:scale-95 transition"
                >
                  {key}
                </button>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}
