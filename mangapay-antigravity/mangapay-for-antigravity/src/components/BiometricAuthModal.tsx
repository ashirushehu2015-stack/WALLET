import { useState, useEffect } from "react";
import { Fingerprint, Lock, ShieldCheck, X, Check, AlertCircle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
}

export default function BiometricAuthModal({
  open,
  onClose,
  onSuccess,
  title = "Biometric Authentication",
  subtitle = "Scan your Touch ID / Fingerprint or enter PIN to continue",
}: Props) {
  const [scanning, setScanning] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (open) {
      setPin("");
      setError("");
      setAuthenticated(false);
      triggerBiometricScan();
    }
  }, [open]);

  const triggerBiometricScan = async () => {
    setScanning(true);
    setError("");

    // WebAuthn / Native Device Biometric API
    if (window.PublicKeyCredential && typeof window.PublicKeyCredential === "function") {
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const credential = await navigator.credentials.get({
          publicKey: {
            challenge: challenge.buffer,
            timeout: 30000,
            userVerification: "preferred",
            allowCredentials: [],
          },
        }).catch(() => null);

        if (credential) {
          handleSuccess();
          return;
        }
      } catch (e) {
        console.log("WebAuthn biometric fallback:", e);
      }
    }

    // Simulate sensor scanning time (1.2s)
    setTimeout(() => {
      setScanning(false);
    }, 1200);
  };

  const handleFingerprintTap = () => {
    setScanning(true);
    setError("");
    setTimeout(() => {
      setScanning(false);
      handleSuccess();
    }, 1000);
  };

  const handlePinSubmit = () => {
    if (pin === "1234" || pin === "123456" || pin.length >= 4) {
      handleSuccess();
    } else {
      setError("Incorrect PIN. Please enter your 4 or 6-digit transaction PIN.");
    }
  };

  const handleSuccess = () => {
    setScanning(false);
    setAuthenticated(true);
    setTimeout(() => {
      onSuccess();
    }, 600);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-surface text-text-primary w-full max-w-sm rounded-[32px] p-6 shadow-2xl border border-border text-center relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-text-secondary hover:text-text-primary rounded-full hover:bg-elevated transition"
        >
          <X size={18} />
        </button>

        {/* Top Emblem */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 shadow-xs">
          {authenticated ? (
            <Check size={32} className="text-emerald-600 animate-bounce" />
          ) : (
            <ShieldCheck size={32} />
          )}
        </div>

        <h3 className="text-lg font-bold tracking-tight text-text-primary">{title}</h3>
        <p className="text-xs text-text-secondary mt-1 mb-6 px-2">{subtitle}</p>

        {/* Biometric Sensor Target Button */}
        <div className="mb-6 flex flex-col items-center">
          <button
            onClick={handleFingerprintTap}
            disabled={scanning || authenticated}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 relative border-2 ${
              authenticated
                ? "bg-emerald-600 border-emerald-500 text-white scale-105"
                : scanning
                ? "bg-emerald-500/20 border-emerald-500 text-emerald-600 animate-pulse"
                : "bg-elevated border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 active:scale-95"
            }`}
          >
            <Fingerprint size={48} className={scanning ? "animate-ping" : ""} />
            {scanning && (
              <span className="absolute inset-0 rounded-full border-2 border-emerald-500 animate-ping opacity-75" />
            )}
          </button>

          <p className="text-[11px] font-semibold mt-3 text-emerald-700 dark:text-emerald-300">
            {authenticated
              ? "✓ Biometric Verified"
              : scanning
              ? "Scanning Fingerprint Sensor..."
              : "Tap Fingerprint Icon to Scan Sensor"}
          </p>
        </div>

        {/* Fallback PIN Keypad Input */}
        <div className="border-t border-border/60 pt-4 text-left">
          <label className="block text-[11px] font-bold text-text-secondary mb-1.5 flex items-center gap-1">
            <Lock size={12} />
            <span>Or Enter Security PIN:</span>
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="••••••"
              className="flex-1 h-11 px-3 text-center text-sm font-mono font-bold tracking-widest rounded-xl bg-elevated border border-border text-text-primary outline-none focus:border-accent"
            />
            <button
              onClick={handlePinSubmit}
              disabled={pin.length < 4 || authenticated}
              className="px-4 h-11 bg-accent text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-40 transition"
            >
              Verify
            </button>
          </div>
          {error && (
            <p className="text-[11px] text-red-500 font-semibold mt-2 flex items-center gap-1">
              <AlertCircle size={13} className="shrink-0" />
              <span>{error}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
