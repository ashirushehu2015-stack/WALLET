import { ArrowLeft, FileText } from "lucide-react";

interface Props {
  onBackToHome?: () => void;
  onNavigateToPrivacy?: () => void;
}

export default function TermsOfService({ onBackToHome, onNavigateToPrivacy }: Props) {
  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onBackToHome) {
      onBackToHome();
    } else {
      window.location.href = "/";
    }
  };

  const handlePrivacyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigateToPrivacy) {
      onNavigateToPrivacy();
    } else {
      window.location.href = "/privacy";
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col justify-between selection:bg-[#0A7A4B] selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 md:px-8 py-4 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" onClick={handleHomeClick} className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-[#0A7A4B] text-white flex items-center justify-center font-black text-xl shadow-xs group-hover:scale-105 transition">
                M
              </div>
              <span className="font-extrabold text-xl tracking-tight text-[#0A7A4B]">
                MangaPay
              </span>
            </a>
          </div>

          <nav className="flex items-center gap-4 text-xs font-bold text-gray-600">
            <a
              href="/"
              onClick={handleHomeClick}
              className="hover:text-[#0A7A4B] transition hidden sm:inline-block"
            >
              Home
            </a>
            <a
              href="/privacy"
              onClick={handlePrivacyClick}
              className="hover:text-[#0A7A4B] transition"
            >
              Privacy Policy
            </a>
            <a href="/terms" className="text-[#0A7A4B] font-extrabold border-b-2 border-[#0A7A4B] pb-0.5">
              Terms of Service
            </a>
          </nav>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="mb-8">
          <a
            href="/"
            onClick={handleHomeClick}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A7A4B] hover:underline mb-4"
          >
            <ArrowLeft size={16} />
            <span>Back to MangaPay</span>
          </a>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#0A7A4B] flex items-center justify-center border border-emerald-100 shadow-xs">
              <FileText size={26} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                Terms of Service – MangaPay
              </h1>
              <p className="text-xs text-gray-500 font-semibold mt-1">
                Last Updated: August 24, 2026
              </p>
            </div>
          </div>
        </div>

        <div className="prose prose-emerald max-w-none text-sm text-gray-700 leading-relaxed space-y-6">
          <p className="text-base text-gray-800 font-medium">
            Welcome to MangaPay. By creating an account or using our services, you agree to these Terms of Service.
          </p>

          <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-3">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0A7A4B] text-white text-xs flex items-center justify-center font-bold">1</span>
              Eligibility
            </h2>
            <p className="text-xs text-gray-700 font-medium">
              You must be at least 18 years old and have a valid Nigerian BVN and/or NIN to use MangaPay as an agent.
            </p>
          </section>

          <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-3">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0A7A4B] text-white text-xs flex items-center justify-center font-bold">2</span>
              Account Registration
            </h2>
            <p className="text-xs text-gray-700 font-medium">
              You agree to provide accurate and complete information during registration. You are responsible for keeping your login details secure.
            </p>
          </section>

          <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-3">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0A7A4B] text-white text-xs flex items-center justify-center font-bold">3</span>
              Agent Responsibilities
            </h2>
            <p className="text-xs text-gray-600 font-medium">As a MangaPay Agent, you agree to:</p>
            <ul className="list-disc list-inside space-y-1.5 text-xs font-medium text-gray-700 pl-2">
              <li>Verify customer identities honestly and accurately</li>
              <li>Not engage in fraudulent activities</li>
              <li>Follow all applicable CBN and Nigerian laws</li>
              <li>Treat customer information confidentially</li>
            </ul>
          </section>

          <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-3">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0A7A4B] text-white text-xs flex items-center justify-center font-bold">4</span>
              Prohibited Activities
            </h2>
            <p className="text-xs text-gray-600 font-medium">You must not:</p>
            <ul className="list-disc list-inside space-y-1.5 text-xs font-medium text-gray-700 pl-2">
              <li>Use the app for money laundering or illegal activities</li>
              <li>Share your account with others</li>
              <li>Attempt to hack or disrupt the service</li>
              <li>Misrepresent your identity or earnings</li>
            </ul>
          </section>

          <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-3">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0A7A4B] text-white text-xs flex items-center justify-center font-bold">5</span>
              Commissions and Payments
            </h2>
            <p className="text-xs text-gray-700 font-medium">
              Commissions are calculated based on successful transactions. MangaPay reserves the right to review, withhold, or reverse commissions in cases of suspected fraud or error.
            </p>
          </section>

          <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-3">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0A7A4B] text-white text-xs flex items-center justify-center font-bold">6</span>
              Termination
            </h2>
            <p className="text-xs text-gray-700 font-medium">
              We may suspend or terminate your account if you violate these Terms or engage in suspicious activity.
            </p>
          </section>

          <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-3">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0A7A4B] text-white text-xs flex items-center justify-center font-bold">7</span>
              Limitation of Liability
            </h2>
            <p className="text-xs text-gray-700 font-medium">
              MangaPay is not liable for any losses arising from unauthorized access to your account, network issues, or actions of third parties, except where required by law.
            </p>
          </section>

          <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-3">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0A7A4B] text-white text-xs flex items-center justify-center font-bold">8</span>
              Changes to the Terms
            </h2>
            <p className="text-xs text-gray-700 font-medium">
              We may update these Terms from time to time. Continued use of the app after changes means you accept the new Terms.
            </p>
          </section>

          <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-3">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0A7A4B] text-white text-xs flex items-center justify-center font-bold">9</span>
              Governing Law
            </h2>
            <p className="text-xs text-gray-700 font-medium">
              These Terms are governed by the laws of the Federal Republic of Nigeria.
            </p>
          </section>

          <section className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200 space-y-2 text-center">
            <h2 className="text-base font-extrabold text-[#0A7A4B]">10. Contact</h2>
            <p className="text-xs text-gray-700 font-medium">
              For support or complaints, contact us at:
            </p>
            <p className="text-sm font-extrabold text-[#0A7A4B] hover:underline">
              Email: support@mangapay.ng
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-100 py-8 px-4 md:px-8 mt-12">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <p className="text-xs font-bold text-gray-800">MangaPay Financial Technologies Limited</p>
            <p className="text-[11px] text-gray-500 mt-0.5">© 2026 MangaPay. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-gray-600">
            <a href="/" onClick={handleHomeClick} className="hover:text-[#0A7A4B] transition">Home</a>
            <a href="/privacy" onClick={handlePrivacyClick} className="hover:text-[#0A7A4B] transition">Privacy Policy</a>
            <a href="/terms" className="text-[#0A7A4B]">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
