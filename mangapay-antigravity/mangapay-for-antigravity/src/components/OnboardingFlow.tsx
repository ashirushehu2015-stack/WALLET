import { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Fingerprint,
  Lock,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onCompleteOnboarding: (userData: {
    firstName: string;
    lastName: string;
    phone: string;
    kycTier: "Tier 1" | "Tier 2";
  }) => void;
}

export default function OnboardingFlow({ open, onClose, onCompleteOnboarding }: Props) {
  const [step, setStep] = useState<number>(1);

  // Form States
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [timer, setTimer] = useState(30);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinStep, setPinStep] = useState<"create" | "confirm">("create");

  // Login State
  const [loginAccount, setLoginAccount] = useState("08031234567");
  const [loginPin, setLoginPin] = useState("");
  const [showLoginPin, setShowLoginPin] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("");

  const [kycType, setKycType] = useState<"bvn" | "nin">("bvn");
  const [idNumber, setIdNumber] = useState("");
  const [kycVerified, setKycVerified] = useState(false);
  const [isTier1Skipped, setIsTier1Skipped] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // OTP Timer
  useEffect(() => {
    if (step !== 3) return;
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  if (!open) return null;

  // Validation Checkers
  const isPhoneValid = phone.length === 10;
  const isOtpComplete = otp.every((digit) => digit !== "");
  const isPinValid = pin.length === 6 && !["123456", "000000", "111111"].includes(pin);
  const isConfirmPinValid = confirmPin === pin;
  const isProfileValid = firstName.trim().length > 1 && lastName.trim().length > 1 && dob !== "";
  const isIdValid = idNumber.length === 11;

  // OTP Focus Handler
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handlePinInput = (num: string) => {
    if (pinStep === "create") {
      if (pin.length < 6) setPin(pin + num);
    } else {
      if (confirmPin.length < 6) setConfirmPin(confirmPin + num);
    }
  };

  const handlePinDelete = () => {
    if (pinStep === "create") {
      setPin(pin.slice(0, -1));
    } else {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  const handleVerifyKyc = () => {
    if (isIdValid) {
      setKycVerified(true);
      setTimeout(() => {
        setStep(7);
      }, 1000);
    }
  };

  const handleSkipKyc = () => {
    setIsTier1Skipped(true);
    setStep(7);
  };

  const handlePerformLogin = async () => {
    if (loginAccount.trim().length < 5) {
      setLoginError("Please enter your registered phone number or username");
      return;
    }
    if (loginPin.length < 4) {
      setLoginError("Please enter your registered 4-digit or 6-digit PIN");
      return;
    }

    setLoginLoading(true);
    setLoginError("");
    await new Promise((r) => setTimeout(r, 900));
    setLoginLoading(false);

    localStorage.setItem("mangapay_token", "token_alex_okoye_auth");
    localStorage.setItem("mangapay_onboarded", "true");
    onCompleteOnboarding({
      firstName: "Alex",
      lastName: "Okoye",
      phone: loginAccount.startsWith("+") ? loginAccount : `+234${loginAccount}`,
      kycTier: "Tier 2",
    });
    onClose();
  };

  const handleBiometricLogin = async () => {
    setLoginLoading(true);
    setLoginError("");
    await new Promise((r) => setTimeout(r, 700));
    setLoginLoading(false);

    localStorage.setItem("mangapay_token", "token_alex_okoye_biometrics");
    localStorage.setItem("mangapay_onboarded", "true");
    onCompleteOnboarding({
      firstName: "Alex",
      lastName: "Okoye",
      phone: "+2348031234567",
      kycTier: "Tier 2",
    });
    onClose();
  };

  const handleFinishOnboarding = () => {
    onCompleteOnboarding({
      firstName: firstName || "Alex",
      lastName: lastName || "Okoye",
      phone: `+234${phone}`,
      kycTier: isTier1Skipped ? "Tier 1" : "Tier 2",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-0 md:p-4">
      <div className="w-full max-w-[430px] h-full md:h-[90vh] md:max-h-[840px] bg-background text-text-primary md:rounded-[32px] shadow-2xl flex flex-col overflow-hidden relative border border-border">
        {/* Top Header / Progress Indicator */}
        {step > 1 && (
          <div className="px-6 pt-5 pb-2 flex items-center justify-between border-b border-border/40">
            <button
              onClick={() => {
                if (step === 4 && pinStep === "confirm") {
                  setPinStep("create");
                  setConfirmPin("");
                } else {
                  setStep((prev) => Math.max(1, prev - 1));
                }
              }}
              className="p-2 -ml-2 rounded-full hover:bg-elevated text-text-secondary"
            >
              <ChevronLeft size={22} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {step - 1} / 6
              </span>
              <div className="w-20 h-1.5 bg-elevated rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                  style={{ width: `${((step - 1) / 6) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Screen Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col justify-between">
          {/* SCREEN 1: Welcome / Splash */}
          {step === 1 && (
            <div className="flex-1 flex flex-col justify-between py-6">
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                {/* Soft green shield logo with subtle/no glow */}
                <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-md mb-6 border border-emerald-500/20">
                  <img src="/app_logo.jpg" alt="MangaPay Logo" className="w-full h-full object-cover" />
                </div>

                <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
                  MangaPay
                </h1>
                <p className="text-sm text-text-secondary mt-2 font-medium">
                  Your money, simplified.
                </p>

                {/* Soft pill badge */}
                <div className="mt-8 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                  <span>CBN Licensed Fintech</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Primary green button */}
                <button
                  onClick={() => setStep(2)}
                  className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
                >
                  <span>Get Started</span>
                  <ArrowRight size={18} />
                </button>

                {/* Secondary light button */}
                <button
                  onClick={() => setStep(8)}
                  className="w-full h-12 rounded-2xl border border-border bg-elevated hover:bg-surface text-text-primary font-semibold text-xs transition"
                >
                  Already have an account? Log in
                </button>

                {/* Footer Legal Links */}
                <div className="pt-1 text-center text-[11px] text-text-secondary flex items-center justify-center gap-3 font-medium">
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-emerald-600">
                    Privacy Policy
                  </a>
                  <span>•</span>
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-emerald-600">
                    Terms of Service
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 2: Phone Number Entry */}
          {step === 2 && (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h2 className="text-2xl font-bold text-text-primary">Enter your phone number</h2>
                <p className="text-xs text-text-secondary mt-1">
                  We'll send you a 6-digit verification code.
                </p>

                <div className="mt-6">
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Phone Number
                  </label>
                  <div className="flex items-center h-14 rounded-2xl bg-elevated border border-border px-4 focus-within:border-emerald-600 transition">
                    <span className="text-sm font-bold text-text-primary mr-3 flex items-center gap-1.5 border-r border-border pr-3">
                      🇳🇬 +234
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="803 123 4567"
                      className="w-full bg-transparent text-base font-semibold font-mono text-text-primary outline-none"
                      autoFocus
                    />
                  </div>
                  {phone.length > 0 && !isPhoneValid && (
                    <p className="text-[11px] text-red-500 mt-1.5 flex items-center gap-1">
                      <AlertCircle size={12} />
                      Enter exactly 10 digits (e.g. 8031234567)
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => setStep(3)}
                disabled={!isPhoneValid}
                className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          )}

          {/* SCREEN 3: OTP Verification */}
          {step === 3 && (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h2 className="text-2xl font-bold text-text-primary">Enter verification code</h2>
                <p className="text-xs text-text-secondary mt-1">
                  We sent a 6-digit code to <strong className="text-text-primary">+234 {phone}</strong>
                </p>

                <div className="mt-8 flex justify-between gap-2">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-12 h-14 text-center text-xl font-bold font-mono rounded-2xl bg-elevated border border-border text-text-primary focus:border-emerald-600 outline-none"
                    />
                  ))}
                </div>

                <div className="mt-6 text-center">
                  {timer > 0 ? (
                    <p className="text-xs text-text-secondary">
                      Resend code in <span className="font-mono font-bold text-emerald-600">{timer}s</span>
                    </p>
                  ) : (
                    <button
                      onClick={() => setTimer(30)}
                      className="text-xs font-bold text-emerald-600 hover:underline"
                    >
                      Didn't receive code? Resend
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={() => setStep(4)}
                disabled={!isOtpComplete}
                className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition disabled:opacity-40"
              >
                Verify Code
              </button>
            </div>
          )}

          {/* SCREEN 4: Create Transaction PIN */}
          {step === 4 && (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h2 className="text-2xl font-bold text-text-primary">
                  {pinStep === "create" ? "Create 6-digit PIN" : "Confirm your PIN"}
                </h2>
                <p className="text-xs text-text-secondary mt-1">
                  {pinStep === "create"
                    ? "You'll use this PIN to confirm all transactions."
                    : "Re-enter your PIN to ensure accuracy."}
                </p>

                {/* PIN Dots */}
                <div className="flex justify-center gap-3 my-8">
                  {Array(6)
                    .fill(0)
                    .map((_, i) => {
                      const currentVal = pinStep === "create" ? pin : confirmPin;
                      const isFilled = i < currentVal.length;
                      return (
                        <div
                          key={i}
                          className={`w-4 h-4 rounded-full transition-all duration-200 ${
                            isFilled
                              ? "bg-emerald-600 scale-110 shadow-sm"
                              : "bg-elevated border border-border"
                          }`}
                        />
                      );
                    })}
                </div>

                {pinStep === "create" && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                    <HelpCircle size={16} className="shrink-0 text-amber-600" />
                    <span>Avoid simple PINs like 123456 or your birth year.</span>
                  </div>
                )}

                {/* Custom Keypad */}
                <div className="grid grid-cols-3 gap-3 mt-6">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "DEL"].map((key, idx) => {
                    if (key === "") return <div key={idx} />;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          if (key === "DEL") handlePinDelete();
                          else handlePinInput(key);
                        }}
                        className="h-13 rounded-2xl bg-elevated border border-border font-bold text-lg text-text-primary active:bg-accent-soft transition flex items-center justify-center"
                      >
                        {key === "DEL" ? "⌫" : key}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4">
                {pinStep === "create" ? (
                  <button
                    onClick={() => setPinStep("confirm")}
                    disabled={!isPinValid}
                    className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition disabled:opacity-40"
                  >
                    Next: Confirm PIN
                  </button>
                ) : (
                  <button
                    onClick={() => setStep(5)}
                    disabled={!isConfirmPinValid}
                    className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition disabled:opacity-40"
                  >
                    Save PIN & Continue
                  </button>
                )}
              </div>
            </div>
          )}

          {/* SCREEN 5: Basic Profile */}
          {step === 5 && (
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-text-primary">Tell us a bit about you</h2>
                  <p className="text-xs text-text-secondary mt-1">
                    Enter details as shown on your official ID.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    First Name
                  </label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Alex"
                    className="w-full h-12 px-4 text-xs rounded-xl bg-elevated border border-border text-text-primary outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Last Name
                  </label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Okoye"
                    className="w-full h-12 px-4 text-xs rounded-xl bg-elevated border border-border text-text-primary outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full h-12 px-4 text-xs rounded-xl bg-elevated border border-border text-text-primary outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex.okoye@example.com"
                    className="w-full h-12 px-4 text-xs rounded-xl bg-elevated border border-border text-text-primary outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <button
                onClick={() => setStep(6)}
                disabled={!isProfileValid}
                className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          )}

          {/* SCREEN 6: KYC / Identity Verification */}
          {step === 6 && (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h2 className="text-2xl font-bold text-text-primary">Verify your identity</h2>
                <p className="text-xs text-text-secondary mt-1">
                  This unlocks Tier 2 limits (₦5,000,000 daily limit).
                </p>

                {/* Switcher Tab */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-elevated rounded-xl border border-border my-5">
                  <button
                    onClick={() => setKycType("bvn")}
                    className={`py-2 rounded-lg text-xs font-bold transition ${
                      kycType === "bvn"
                        ? "bg-emerald-600 text-white"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Use BVN
                  </button>
                  <button
                    onClick={() => setKycType("nin")}
                    className={`py-2 rounded-lg text-xs font-bold transition ${
                      kycType === "nin"
                        ? "bg-emerald-600 text-white"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Use NIN
                  </button>
                </div>

                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Enter 11-digit {kycType.toUpperCase()}
                </label>
                <input
                  type="text"
                  maxLength={11}
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="12345678901"
                  className="w-full h-13 px-4 text-sm font-mono font-bold rounded-xl bg-elevated border border-border text-text-primary outline-none focus:border-emerald-600 mb-3"
                />

                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 dark:text-emerald-300">
                  {kycType === "bvn" ? (
                    <span>💡 Dial <strong>*565*0#</strong> on your registered SIM to get your BVN.</span>
                  ) : (
                    <span>💡 Dial <strong>*346#</strong> on your registered SIM to get your NIN.</span>
                  )}
                </div>

                {kycVerified && (
                  <div className="mt-4 p-3 bg-emerald-600 text-white rounded-xl flex items-center gap-2 text-xs font-bold animate-bounce">
                    <CheckCircle2 size={18} />
                    <span>Identity Verified Successfully!</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleVerifyKyc}
                  disabled={!isIdValid || kycVerified}
                  className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition disabled:opacity-40"
                >
                  {kycVerified ? "Verified!" : "Verify & Unlock Tier 2"}
                </button>

                <button
                  onClick={handleSkipKyc}
                  className="w-full h-12 rounded-2xl border border-border bg-elevated text-text-secondary hover:text-text-primary font-semibold text-xs transition"
                >
                  Skip for now (Create Tier 1 Account)
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 7: Success / Activation Screen */}
          {step === 7 && (
            <div className="flex-1 flex flex-col justify-between py-6 text-center">
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-emerald-500/10 text-emerald-600 border-4 border-emerald-500/30 flex items-center justify-center mb-6 animate-pulse">
                  <CheckCircle2 size={56} />
                </div>
                <h2 className="text-3xl font-extrabold text-text-primary">
                  Welcome to MangaPay, {firstName || "Alex"}!
                </h2>
                <p className="text-xs text-text-secondary mt-2 max-w-xs">
                  Your wallet is ready. Account level:{" "}
                  <span className="font-bold text-emerald-600">
                    {isTier1Skipped ? "Tier 1 (₦50,000 limit)" : "Tier 2 (₦5,000,000 limit)"}
                  </span>
                </p>

                {isTier1Skipped && (
                  <div className="mt-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-300 max-w-xs text-left">
                    💡 Upgrade to Tier 2 anytime from Profile to unlock higher transfer limits!
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleFinishOnboarding}
                  className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition"
                >
                  Fund Wallet
                </button>
                <button
                  onClick={handleFinishOnboarding}
                  className="w-full h-12 rounded-2xl border border-border bg-elevated hover:bg-surface text-text-primary font-semibold text-xs transition"
                >
                  Explore App
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 8: Login Credential Verification Screen */}
          {step === 8 && (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h2 className="text-2xl font-bold text-text-primary">Welcome Back</h2>
                <p className="text-xs text-text-secondary mt-1">
                  Enter your registered details to log in to MangaPay.
                </p>

                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Phone Number or Username
                    </label>
                    <input
                      type="text"
                      value={loginAccount}
                      onChange={(e) => setLoginAccount(e.target.value)}
                      placeholder="0803 123 4567 or @alex"
                      className="w-full h-12 px-4 text-xs font-semibold rounded-xl bg-elevated border border-border text-text-primary outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      6-Digit Transaction PIN / Password
                    </label>
                    <div className="relative">
                      <input
                        type={showLoginPin ? "text" : "password"}
                        maxLength={6}
                        value={loginPin}
                        onChange={(e) => setLoginPin(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="••••••"
                        className="w-full h-12 px-4 pr-10 text-sm font-mono font-bold tracking-widest rounded-xl bg-elevated border border-border text-text-primary outline-none focus:border-emerald-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPin(!showLoginPin)}
                        className="absolute right-3 top-3 text-text-secondary hover:text-text-primary"
                      >
                        {showLoginPin ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {loginError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-600 font-medium">
                      <AlertCircle size={16} className="shrink-0 text-red-500" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleBiometricLogin}
                      disabled={loginLoading}
                      className="w-full py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-500/20 transition flex items-center justify-center gap-2"
                    >
                      <Fingerprint size={18} className="text-emerald-600" />
                      <span>Quick Login with Biometrics (Touch ID)</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handlePerformLogin}
                  disabled={loginLoading || loginAccount.length < 5 || loginPin.length < 4}
                  className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {loginLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      <span>Log In to MangaPay</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full h-12 rounded-2xl border border-border bg-elevated text-text-secondary hover:text-text-primary font-semibold text-xs transition"
                >
                  Back to Welcome Screen
                </button>

                {/* Footer Legal Links */}
                <div className="pt-1 text-center text-[11px] text-text-secondary flex items-center justify-center gap-3 font-medium">
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-emerald-600">
                    Privacy Policy
                  </a>
                  <span>•</span>
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-emerald-600">
                    Terms of Service
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
