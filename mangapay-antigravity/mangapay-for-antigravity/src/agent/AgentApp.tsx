import { useState } from "react";
import {
  Eye,
  EyeOff,
  UserPlus,
  CreditCard,
  Wallet,
  ListOrdered,
  ChevronRight,
  Sun,
  User,
  Users,
  Home,
  CheckCircle2,
  ArrowRight,
  X,
  Lock,
  Mail,
  Gift,
} from "lucide-react";

type AgentScreen = "welcome" | "login" | "register" | "dashboard";
type AgentTab = "home" | "customers" | "wallet" | "profile";

export interface AgentData {
  fullName: string;
  firstName: string;
  phone: string;
  email: string;
  agentId: string;
  todayEarnings: number;
  earningsGrowth: number;
  profileImage: string;
}

const DEFAULT_AGENTS: Record<string, AgentData> = {
  chinedu: {
    fullName: "Chinedu Okonkwo",
    firstName: "Chinedu",
    phone: "+234 803 123 4567",
    email: "chinedu@mangapayagent.ng",
    agentId: "AG-449120",
    todayEarnings: 24750.0,
    earningsGrowth: 18.5,
    profileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
  },
  ashiru: {
    fullName: "Ashiru Shehu",
    firstName: "Ashiru",
    phone: "+234 802 998 8776",
    email: "ashiru@mangapayagent.ng",
    agentId: "AG-884920",
    todayEarnings: 38200.0,
    earningsGrowth: 24.2,
    profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
  },
};

export default function AgentApp({ onExitAgentMode }: { onExitAgentMode?: () => void }) {
  const [screen, setScreen] = useState<AgentScreen>("welcome");
  const [activeTab, setActiveTab] = useState<AgentTab>("home");

  // Dynamic Auth Context State
  const [agent, setAgent] = useState<AgentData>(DEFAULT_AGENTS.chinedu);

  // Form states
  const [loginPhone, setLoginPhone] = useState("8031234567");
  const [loginPassword, setLoginPassword] = useState("••••••••");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [fullName, setFullName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Modals inside Dashboard
  const [onboardCustomerOpen, setOnboardCustomerOpen] = useState(false);
  const [verifyIdOpen, setVerifyIdOpen] = useState(false);
  const [collectPaymentOpen, setCollectPaymentOpen] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals Form Data
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [bvnNumber, setBvnNumber] = useState("");
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectCustPhone, setCollectCustPhone] = useState("");

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Auth Handlers
  const handlePerformLogin = () => {
    const p = loginPhone.toLowerCase();
    let selectedAgent: AgentData;

    if (p.includes("ashiru") || p.includes("802")) {
      selectedAgent = DEFAULT_AGENTS.ashiru;
    } else if (p.includes("chinedu") || p.includes("803")) {
      selectedAgent = DEFAULT_AGENTS.chinedu;
    } else {
      const derivedName = p.length > 3 ? `Agent ${p.slice(-4)}` : "Ashiru Shehu";
      const fName = derivedName.split(" ")[0];
      selectedAgent = {
        fullName: derivedName,
        firstName: fName,
        phone: loginPhone.startsWith("+") ? loginPhone : `+234 ${loginPhone}`,
        email: `${fName.toLowerCase()}@mangapayagent.ng`,
        agentId: `AG-${Math.floor(100000 + Math.random() * 900000)}`,
        todayEarnings: 15400.0,
        earningsGrowth: 12.0,
        profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
      };
    }

    setAgent(selectedAgent);
    setScreen("dashboard");
    triggerToast(`Welcome back, ${selectedAgent.firstName}!`);
  };

  const handlePerformRegister = () => {
    const rawName = fullName.trim() || "Ashiru Shehu";
    const fName = rawName.split(" ")[0];

    const newAgent: AgentData = {
      fullName: rawName,
      firstName: fName,
      phone: regPhone.startsWith("+") ? regPhone : `+234 ${regPhone || "803 123 4567"}`,
      email: regEmail || `${fName.toLowerCase()}@mangapayagent.ng`,
      agentId: `AG-${Math.floor(100000 + Math.random() * 900000)}`,
      todayEarnings: 5000.0, // Welcome signup bonus
      earningsGrowth: 100.0,
      profileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    };

    setAgent(newAgent);
    setScreen("dashboard");
    triggerToast(`Agent Account Created! Welcome, ${fName}!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-0 md:p-4">
      <div className="w-full max-w-[430px] h-full md:h-[90vh] md:max-h-[840px] bg-white text-gray-900 md:rounded-[32px] shadow-2xl flex flex-col overflow-hidden relative font-sans">
        
        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="absolute top-4 left-4 right-4 z-50 bg-[#0A7A4B] text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2 text-xs font-bold animate-bounce">
            <CheckCircle2 size={18} className="text-[#F5C518]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Exit Agent Mode floating badge */}
        {onExitAgentMode && screen === "welcome" && (
          <button
            onClick={onExitAgentMode}
            className="absolute top-4 right-4 z-40 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-md border border-white/20 transition"
          >
            ← Customer App
          </button>
        )}

        {/* ========================================================= */}
        {/* SCREEN 1: Welcome / Splash Screen */}
        {/* ========================================================= */}
        {screen === "welcome" && (
          <div className="flex-1 bg-[#0A7A4B] text-white flex flex-col justify-between p-8 text-center relative overflow-hidden">
            {/* Background Decorative Rings */}
            <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/5 blur-xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#F5C518]/10 blur-2xl pointer-events-none" />

            <div className="flex-1 flex flex-col items-center justify-center">
              {/* Centered Large White M logo inside a rounded square */}
              <div className="w-24 h-24 rounded-[28px] overflow-hidden shadow-2xl mb-8 border-4 border-white/20">
                <img src="/app_logo_interchanged.jpg" alt="Mangapay Agent Logo" className="w-full h-full object-cover" />
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight">
                Mangapay
              </h1>
              <p className="text-xl font-bold text-[#F5C518] mt-1 tracking-wide uppercase">
                Agent
              </p>

              <p className="text-sm text-emerald-100/90 mt-4 max-w-xs font-medium leading-relaxed">
                Empowering Agents. Growing Communities.
              </p>
            </div>

            {/* Bottom Button: Get Started (Gold background, Dark text) */}
            <div className="space-y-3 pb-2">
              <button
                onClick={() => setScreen("login")}
                className="w-full h-15 rounded-2xl bg-[#F5C518] hover:bg-[#e0b313] text-[#1A1A1A] font-extrabold text-base shadow-xl transition flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Get Started</span>
                <ArrowRight size={20} />
              </button>

              <div className="text-center text-[11px] text-emerald-100/90 flex items-center justify-center gap-3 font-medium">
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-[#F5C518]">
                  Privacy Policy
                </a>
                <span>•</span>
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-[#F5C518]">
                  Terms of Service
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 2: Login Screen */}
        {/* ========================================================= */}
        {screen === "login" && (
          <div className="flex-1 bg-white text-gray-900 flex flex-col justify-between p-6 overflow-y-auto">
            <div>
              {/* Top Mangapay Agent Logo */}
              <div className="flex items-center gap-3 mb-8 pt-2">
                <img
                  src="/app_logo_interchanged.jpg"
                  alt="MangaPay Agent Logo"
                  className="w-11 h-11 rounded-xl object-cover shadow-md border border-emerald-500/20"
                />
                <div>
                  <h2 className="text-lg font-black text-[#0A7A4B] leading-tight">Mangapay</h2>
                  <span className="text-xs font-bold text-[#F5C518] uppercase tracking-wider bg-[#1A1A1A] px-2 py-0.5 rounded">
                    Agent
                  </span>
                </div>
              </div>

              <h2 className="text-2xl font-black text-[#1A1A1A]">Welcome back</h2>
              <p className="text-xs text-gray-500 font-medium mt-1">
                Login to your agent account
              </p>

              {/* Form Fields */}
              <div className="mt-8 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Phone Number
                  </label>
                  <div className="flex items-center h-13 rounded-2xl bg-gray-50 border border-gray-200 px-4 focus-within:border-[#0A7A4B] focus-within:bg-white transition">
                    <span className="text-xs font-extrabold text-gray-800 mr-3 border-r border-gray-300 pr-3">
                      🇳🇬 +234
                    </span>
                    <input
                      type="tel"
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      placeholder="803 123 4567"
                      className="w-full bg-transparent text-sm font-semibold outline-none text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative flex items-center h-13 rounded-2xl bg-gray-50 border border-gray-200 px-4 focus-within:border-[#0A7A4B] focus-within:bg-white transition">
                    <Lock size={18} className="text-gray-400 mr-3 shrink-0" />
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full bg-transparent text-sm font-semibold outline-none text-gray-900 pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-4 text-gray-400 hover:text-gray-700"
                    >
                      {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className="text-right mt-2">
                    <a href="#forgot" onClick={(e) => e.preventDefault()} className="text-xs font-bold text-[#0A7A4B] hover:underline">
                      Forgot Password?
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-6">
              {/* Primary Green Button: Login */}
              <button
                onClick={handlePerformLogin}
                className="w-full h-14 rounded-2xl bg-[#0A7A4B] hover:bg-[#08633d] text-white font-extrabold text-sm shadow-lg transition active:scale-95"
              >
                Login
              </button>

              <p className="text-center text-xs font-medium text-gray-600">
                Don’t have an account?{" "}
                <button
                  onClick={() => setScreen("register")}
                  className="font-extrabold text-[#0A7A4B] hover:underline"
                >
                  Register
                </button>
              </p>

              {/* Footer Legal Links */}
              <div className="pt-2 text-center text-[11px] text-gray-500 flex items-center justify-center gap-3 font-medium">
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-[#0A7A4B]">
                  Privacy Policy
                </a>
                <span>•</span>
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-[#0A7A4B]">
                  Terms of Service
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 3: Agent Registration / Onboarding Screen */}
        {/* ========================================================= */}
        {screen === "register" && (
          <div className="flex-1 bg-white text-gray-900 flex flex-col justify-between p-6 overflow-y-auto">
            <div>
              <button
                onClick={() => setScreen("login")}
                className="text-xs font-bold text-[#0A7A4B] mb-4 flex items-center gap-1"
              >
                ← Back to Login
              </button>

              <h2 className="text-2xl font-black text-[#1A1A1A]">Create Agent Account</h2>
              <p className="text-xs text-gray-500 font-medium mt-1">
                Join thousands of Mangapay agents growing Nigeria's economy.
              </p>

              {/* Form Fields */}
              <div className="mt-6 space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
                  <div className="flex items-center h-12 rounded-xl bg-gray-50 border border-gray-200 px-3.5 focus-within:border-[#0A7A4B] focus-within:bg-white">
                    <User size={16} className="text-gray-400 mr-2.5" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ashiru Shehu"
                      className="w-full bg-transparent text-xs font-semibold outline-none text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number (+234)</label>
                  <div className="flex items-center h-12 rounded-xl bg-gray-50 border border-gray-200 px-3.5 focus-within:border-[#0A7A4B] focus-within:bg-white">
                    <span className="text-xs font-bold text-gray-700 mr-2 border-r border-gray-300 pr-2">🇳🇬 +234</span>
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="803 123 4567"
                      className="w-full bg-transparent text-xs font-semibold outline-none text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                  <div className="flex items-center h-12 rounded-xl bg-gray-50 border border-gray-200 px-3.5 focus-within:border-[#0A7A4B] focus-within:bg-white">
                    <Mail size={16} className="text-gray-400 mr-2.5" />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="agent@example.com"
                      className="w-full bg-transparent text-xs font-semibold outline-none text-gray-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Password</label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-12 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold outline-none focus:border-[#0A7A4B]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Confirm Password</label>
                    <input
                      type="password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-12 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold outline-none focus:border-[#0A7A4B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Referral Code (Optional)</label>
                  <div className="flex items-center h-12 rounded-xl bg-gray-50 border border-gray-200 px-3.5 focus-within:border-[#0A7A4B] focus-within:bg-white">
                    <Gift size={16} className="text-gray-400 mr-2.5" />
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      placeholder="AG-998822"
                      className="w-full bg-transparent text-xs font-semibold outline-none text-gray-900"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0A7A4B] focus:ring-[#0A7A4B]"
                  />
                  <label htmlFor="terms" className="text-[11px] text-gray-600 font-medium">
                    I agree to the <span className="text-[#0A7A4B] font-bold">Terms of Service</span> and <span className="text-[#0A7A4B] font-bold">Privacy Policy</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <button
                onClick={handlePerformRegister}
                disabled={!agreeTerms}
                className="w-full h-14 rounded-2xl bg-[#0A7A4B] hover:bg-[#08633d] text-white font-extrabold text-sm shadow-lg transition disabled:opacity-40"
              >
                Create Account
              </button>

              <p className="text-center text-xs font-medium text-gray-600">
                Already have an account?{" "}
                <button
                  onClick={() => setScreen("login")}
                  className="font-extrabold text-[#0A7A4B] hover:underline"
                >
                  Login
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 4: Home Screen (Dashboard) */}
        {/* ========================================================= */}
        {screen === "dashboard" && (
          <div className="flex-1 bg-gray-50 text-gray-900 flex flex-col justify-between overflow-hidden">
            {/* Top Header */}
            <div className="bg-white px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <img
                  src="/app_logo_interchanged.jpg"
                  alt="MangaPay Agent Logo"
                  className="w-9 h-9 rounded-xl object-cover shadow-xs border border-emerald-500/20"
                />
                <div>
                  <h3 className="text-sm font-black text-[#0A7A4B] leading-tight">Mangapay</h3>
                  <span className="text-[10px] font-bold text-[#F5C518] bg-[#1A1A1A] px-1.5 py-0.2 rounded uppercase">
                    Agent
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-xs font-extrabold text-[#1A1A1A]">Agent {agent.firstName}</p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0A7A4B] to-emerald-400 p-0.5 shadow-sm">
                  <img
                    src={agent.profileImage}
                    alt={agent.fullName}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Dashboard Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Greeting */}
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                <div>
                  <h2 className="text-lg font-black text-[#1A1A1A]">
                    Good afternoon, {agent.firstName}
                  </h2>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    Here's what's happening with your business today.
                  </p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-200 shrink-0">
                  <Sun size={22} />
                </div>
              </div>

              {/* Large Green Earnings Card */}
              <div className="bg-[#0A7A4B] text-white rounded-[24px] p-6 shadow-xl relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
                
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">Today's Earnings</span>
                  <span className="text-[10px] font-extrabold bg-[#F5C518] text-[#1A1A1A] px-2.5 py-1 rounded-full uppercase">
                    Today
                  </span>
                </div>

                <div className="my-2">
                  <h1 className="text-3xl font-black text-[#F5C518] tracking-tight">
                    ₦{agent.todayEarnings.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                  </h1>
                  <p className="text-xs font-bold text-emerald-200 mt-1 flex items-center gap-1">
                    <span className="text-emerald-300 font-extrabold">↑ +{agent.earningsGrowth}%</span> vs yesterday
                  </p>
                </div>

                <div className="pt-4 border-t border-emerald-600/60 mt-4 flex items-center justify-between">
                  <button
                    onClick={() => triggerToast("Commission breakdown: ₦18,200 Cash-in + ₦6,550 KYC bonuses")}
                    className="text-xs font-bold text-white hover:text-[#F5C518] transition flex items-center gap-1"
                  >
                    <span>View Earnings Breakdown</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Section Title: Quick Actions */}
              <div>
                <h3 className="text-sm font-extrabold text-gray-900 mb-3 uppercase tracking-wider">
                  Quick Actions
                </h3>

                {/* 2x2 Action Cards */}
                <div className="grid grid-cols-2 gap-3.5">
                  {/* Card 1: Green -> Onboard Customer */}
                  <button
                    onClick={() => setOnboardCustomerOpen(true)}
                    className="bg-[#0A7A4B] hover:bg-[#08633d] text-white p-4 rounded-2xl shadow-md text-left transition flex flex-col justify-between h-32 relative overflow-hidden group active:scale-95"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white">
                      <UserPlus size={22} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black leading-snug">Onboard Customer</h4>
                      <p className="text-[10px] text-emerald-100 mt-0.5 font-medium">New Wallet Creation</p>
                    </div>
                  </button>

                  {/* Card 2: Gold -> Verify NIN/BVN */}
                  <button
                    onClick={() => setVerifyIdOpen(true)}
                    className="bg-[#F5C518] hover:bg-[#e0b313] text-[#1A1A1A] p-4 rounded-2xl shadow-md text-left transition flex flex-col justify-between h-32 relative overflow-hidden group active:scale-95"
                  >
                    <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center text-[#1A1A1A]">
                      <CreditCard size={22} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black leading-snug">Verify NIN/BVN</h4>
                      <p className="text-[10px] text-gray-800 mt-0.5 font-bold">CBN Database Check</p>
                    </div>
                  </button>

                  {/* Card 3: Green -> Collect Payment */}
                  <button
                    onClick={() => setCollectPaymentOpen(true)}
                    className="bg-[#0A7A4B] hover:bg-[#08633d] text-white p-4 rounded-2xl shadow-md text-left transition flex flex-col justify-between h-32 relative overflow-hidden group active:scale-95"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white">
                      <Wallet size={22} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black leading-snug">Collect Payment</h4>
                      <p className="text-[10px] text-emerald-100 mt-0.5 font-medium">Cash-in / POS Agent</p>
                    </div>
                  </button>

                  {/* Card 4: Black -> View Transactions */}
                  <button
                    onClick={() => setTransactionsOpen(true)}
                    className="bg-[#1A1A1A] hover:bg-black text-white p-4 rounded-2xl shadow-md text-left transition flex flex-col justify-between h-32 relative overflow-hidden group active:scale-95"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white">
                      <ListOrdered size={22} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black leading-snug">View Transactions</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Audit Ledger Logs</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Fixed Bottom Tab Bar */}
            <div className="bg-white border-t border-gray-100 px-6 py-2.5 flex items-center justify-between shadow-lg">
              <button
                onClick={() => setActiveTab("home")}
                className={`flex flex-col items-center gap-1 ${
                  activeTab === "home" ? "text-[#0A7A4B]" : "text-gray-400"
                }`}
              >
                <Home size={20} />
                <span className="text-[10px] font-bold">Home</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("customers");
                  setOnboardCustomerOpen(true);
                }}
                className={`flex flex-col items-center gap-1 ${
                  activeTab === "customers" ? "text-[#0A7A4B]" : "text-gray-400"
                }`}
              >
                <Users size={20} />
                <span className="text-[10px] font-bold">Customers</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("wallet");
                  setCollectPaymentOpen(true);
                }}
                className={`flex flex-col items-center gap-1 ${
                  activeTab === "wallet" ? "text-[#0A7A4B]" : "text-gray-400"
                }`}
              >
                <Wallet size={20} />
                <span className="text-[10px] font-bold">Wallet</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("profile");
                  setProfileModalOpen(true);
                }}
                className={`flex flex-col items-center gap-1 ${
                  activeTab === "profile" ? "text-[#0A7A4B]" : "text-gray-400"
                }`}
              >
                <User size={20} />
                <span className="text-[10px] font-bold">Profile</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 1: Onboard Customer */}
        {/* ========================================================= */}
        {onboardCustomerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white text-gray-900 w-full max-w-sm rounded-[24px] p-6 shadow-2xl border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="text-[#0A7A4B]" size={20} />
                  <h3 className="text-base font-extrabold">Onboard Customer</h3>
                </div>
                <button onClick={() => setOnboardCustomerOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Customer Full Name</label>
                  <input
                    type="text"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="e.g. Samuel Adebayo"
                    className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold outline-none focus:border-[#0A7A4B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number (+234)</label>
                  <input
                    type="tel"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    placeholder="801 234 5678"
                    className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold outline-none focus:border-[#0A7A4B]"
                  />
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 font-medium">
                  💡 Onboarding bonus: You earn <strong className="font-bold text-[#0A7A4B]">₦500 commission</strong> per customer registered.
                </div>
              </div>

              <button
                onClick={() => {
                  setOnboardCustomerOpen(false);
                  triggerToast(`Customer ${custName || "Samuel"} Onboarded Successfully (+₦500 Bonus)!`);
                  setCustName("");
                  setCustPhone("");
                }}
                disabled={!custName || !custPhone}
                className="mt-5 w-full h-12 rounded-xl bg-[#0A7A4B] text-white font-bold text-xs disabled:opacity-40 hover:bg-[#08633d]"
              >
                Complete Customer Registration
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 2: Verify NIN/BVN */}
        {/* ========================================================= */}
        {verifyIdOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white text-gray-900 w-full max-w-sm rounded-[24px] p-6 shadow-2xl border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="text-[#F5C518]" size={20} />
                  <h3 className="text-base font-extrabold">Verify NIN / BVN</h3>
                </div>
                <button onClick={() => { setVerifyIdOpen(false); setVerifyResult(null); }} className="p-1 rounded-full hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Enter 11-digit BVN or NIN</label>
                  <input
                    type="text"
                    maxLength={11}
                    value={bvnNumber}
                    onChange={(e) => setBvnNumber(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="22114455667"
                    className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-mono font-bold outline-none focus:border-[#0A7A4B]"
                  />
                </div>

                {verifyResult && (
                  <div className="p-3 bg-[#0A7A4B]/10 border border-[#0A7A4B]/30 rounded-xl space-y-1 text-xs text-[#0A7A4B] font-medium">
                    <p className="font-bold text-[#0A7A4B]">✓ Match Found (CBN Identity DB)</p>
                    <p>Name: {verifyResult.name}</p>
                    <p>DOB: {verifyResult.dob}</p>
                    <p>Status: Verified Active</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  if (bvnNumber.length === 11) {
                    setVerifyResult({ name: "CHINEDU OKONKWO", dob: "14/08/1994" });
                  }
                }}
                disabled={bvnNumber.length !== 11}
                className="mt-5 w-full h-12 rounded-xl bg-[#F5C518] text-[#1A1A1A] font-extrabold text-xs disabled:opacity-40 hover:bg-[#e0b313]"
              >
                {verifyResult ? "Identity Verified ✓" : "Run Verification Query"}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 3: Collect Payment */}
        {/* ========================================================= */}
        {collectPaymentOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white text-gray-900 w-full max-w-sm rounded-[24px] p-6 shadow-2xl border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wallet className="text-[#0A7A4B]" size={20} />
                  <h3 className="text-base font-extrabold">Collect Cash Payment</h3>
                </div>
                <button onClick={() => setCollectPaymentOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Customer Phone Number</label>
                  <input
                    type="tel"
                    value={collectCustPhone}
                    onChange={(e) => setCollectCustPhone(e.target.value)}
                    placeholder="0803 123 4567"
                    className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold outline-none focus:border-[#0A7A4B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Amount to Collect (₦)</label>
                  <input
                    type="number"
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-mono font-bold outline-none focus:border-[#0A7A4B]"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  setCollectPaymentOpen(false);
                  triggerToast(`Collected ₦${collectAmount || "5000"} Cash Payment successfully!`);
                  setCollectAmount("");
                  setCollectCustPhone("");
                }}
                disabled={!collectAmount || !collectCustPhone}
                className="mt-5 w-full h-12 rounded-xl bg-[#0A7A4B] text-white font-bold text-xs disabled:opacity-40 hover:bg-[#08633d]"
              >
                Confirm Cash Collection
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 4: View Transactions */}
        {/* ========================================================= */}
        {transactionsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white text-gray-900 w-full max-w-sm rounded-[24px] p-6 shadow-2xl border border-gray-100 max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ListOrdered className="text-[#1A1A1A]" size={20} />
                  <h3 className="text-base font-extrabold">Agent Ledger Logs</h3>
                </div>
                <button onClick={() => setTransactionsOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {[
                  { title: "Cash Deposit - Chinedu O.", amount: "+₦15,000.00", time: "Today 12:40 PM", type: "in" },
                  { title: "NIN Verification Bonus", amount: "+₦750.00", time: "Today 11:15 AM", type: "in" },
                  { title: "Customer Onboarding Bonus", amount: "+₦500.00", time: "Today 10:05 AM", type: "in" },
                  { title: "Commission Payout to Bank", amount: "-₦8,500.00", time: "Yesterday", type: "out" },
                ].map((tx, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-900">{tx.title}</p>
                      <p className="text-[10px] text-gray-500 font-medium">{tx.time}</p>
                    </div>
                    <span className={`text-xs font-extrabold ${tx.type === 'in' ? 'text-emerald-600' : 'text-gray-900'}`}>
                      {tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 5: Dynamic Agent Profile & Logout Modal */}
        {/* ========================================================= */}
        {profileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white text-gray-900 w-full max-w-sm rounded-[24px] p-6 shadow-2xl border border-gray-100 flex flex-col items-center text-center">
              <div className="w-full flex items-center justify-between mb-2">
                <h3 className="text-base font-extrabold">Agent Profile</h3>
                <button onClick={() => setProfileModalOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>

              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#0A7A4B] to-emerald-400 p-1 shadow-md my-3">
                <img
                  src={agent.profileImage}
                  alt={agent.fullName}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>

              <h3 className="text-lg font-black text-[#1A1A1A]">{agent.fullName}</h3>
              <span className="text-xs font-bold text-[#0A7A4B] bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-full mt-1">
                ID: {agent.agentId}
              </span>

              <div className="w-full bg-gray-50 rounded-2xl p-4 my-4 space-y-2 text-left text-xs font-medium text-gray-700 border border-gray-100">
                <div className="flex justify-between py-1 border-b border-gray-200/60">
                  <span className="text-gray-500 font-bold">Phone:</span>
                  <span className="font-extrabold text-gray-900">{agent.phone}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200/60">
                  <span className="text-gray-500 font-bold">Email:</span>
                  <span className="font-extrabold text-gray-900">{agent.email}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500 font-bold">Today's Earnings:</span>
                  <span className="font-extrabold text-[#0A7A4B]">
                    ₦{agent.todayEarnings.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setProfileModalOpen(false);
                  setScreen("login");
                  triggerToast("Logged out of agent account.");
                }}
                className="w-full h-12 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold text-xs transition"
              >
                Log Out / Switch Agent Account
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
