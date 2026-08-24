import { ArrowLeft, ShieldCheck } from "lucide-react";

interface Props {
  onBackToHome?: () => void;
  onNavigateToTerms?: () => void;
}

export default function PrivacyPolicy({ onBackToHome, onNavigateToTerms }: Props) {
  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onBackToHome) {
      onBackToHome();
    } else {
      window.location.href = "/";
    }
  };

  const handleTermsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigateToTerms) {
      onNavigateToTerms();
    } else {
      window.location.href = "/terms";
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
            <a href="/privacy" className="text-[#0A7A4B] font-extrabold border-b-2 border-[#0A7A4B] pb-0.5">
              Privacy Policy
            </a>
            <a
              href="/terms"
              onClick={handleTermsClick}
              className="hover:text-[#0A7A4B] transition"
            >
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
              <ShieldCheck size={26} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                Privacy Policy – MangaPay
              </h1>
              <p className="text-xs text-gray-500 font-semibold mt-1">
                Last Updated: August 24, 2026
              </p>
            </div>
          </div>
        </div>

        <div className="prose prose-emerald max-w-none text-sm text-gray-700 leading-relaxed space-y-6">
          <p className="text-base text-gray-800 font-medium">
            MangaPay (“we”, “us”, or “our”) respects your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our mobile application and related services.
          </p>

          {/* 1. Information We Collect */}
          <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-3 shadow-xs">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0A7A4B] text-white text-xs flex items-center justify-center font-bold shrink-0">1</span>
              Information We Collect
            </h2>
            <ul className="list-disc list-inside space-y-1.5 text-xs font-medium text-gray-700 pl-2">
              <li>Full name</li>
              <li>Phone number</li>
              <li>Email address</li>
              <li>Bank Verification Number (BVN)</li>
              <li>National Identification Number (NIN)</li>
              <li>Profile photograph / selfie (for verification)</li>
              <li>Transaction history</li>
              <li>Device information (device type, operating system, IP address)</li>
              <li>Location data (only when necessary for security or compliance)</li>
            </ul>
          </section>

          {/* 2. Sensitive Personal Data */}
          <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-3 shadow-xs">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0A7A4B] text-white text-xs flex items-center justify-center font-bold shrink-0">2</span>
              Sensitive Personal Data
            </h2>
            <p className="text-xs text-gray-700 font-medium leading-relaxed">
              We collect sensitive personal data such as your Bank Verification Number (BVN) and National Identification Number (NIN). This data is collected only for identity verification and regulatory compliance purposes, with your explicit consent.
            </p>
          </section>

          {/* 3. How We Use Your Information */}
          <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-3 shadow-xs">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0A7A4B] text-white text-xs flex items-center justify-center font-bold shrink-0">3</span>
              How We Use Your Information
            </h2>
            <p className="text-xs text-gray-600 font-medium">We use your information to:</p>
            <ul className="list-disc list-inside space-y-1.5 text-xs font-medium text-gray-700 pl-2">
              <li>Create and manage your agent account</li>
              <li>Verify your identity (BVN and NIN)</li>
              <li>Process customer onboarding and payments</li>
              <li>Calculate and display commissions/earnings</li>
              <li>Prevent fraud and ensure security</li>
              <li>Comply with Central Bank of Nigeria (CBN) and other regulatory requirements</li>
              <li>Improve our services</li>
            </ul>
          </section>

          {/* 4. Your Consent */}
          <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-3 shadow-xs">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0A7A4B] text-white text-xs flex items-center justify-center font-bold shrink-0">4</span>
              Your Consent
            </h2>
            <p className="text-xs text-gray-700 font-medium leading-relaxed">
              By using MangaPay and providing your BVN or NIN, you give us clear consent to process this information for the purposes stated in this Privacy Policy. You may withdraw your consent at any time by contacting us, subject to legal and regulatory requirements.
            </p>
          </section>

          {/* 5. Legal Basis for Processing */}
          <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-3 shadow-xs">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0A7A4B] text-white text-xs flex items-center justify-center font-bold shrink-0">5</span>
              Legal Basis for Processing
            </h2>
            <p className="text-xs text-gray-600 font-medium">We process your data based on:</p>
            <ul className="list-disc list-inside space-y-1.5 text-xs font-medium text-gray-700 pl-2">
              <li>Your consent</li>
              <li>Performance of a contract</li>
              <li>Legal and regulatory obligations</li>
              <li>Legitimate interest (fraud prevention and security)</li>
            </ul>
          </section>

          {/* 6. How We Share Your Information */}
          <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-3 shadow-xs">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0A7A4B] text-white text-xs flex items-center justify-center font-bold shrink-0">6</span>
              How We Share Your Information
            </h2>
            <p className="text-xs text-gray-600 font-medium">We may share your information with:</p>
            <ul className="list-disc list-inside space-y-1.5 text-xs font-medium text-gray-700 pl-2">
              <li>Identity verification partners (NIBSS, NIMC, or licensed providers)</li>
              <li>Payment processors and banking partners</li>
              <li>Regulatory authorities when required by law</li>
              <li>Service providers who help us operate the app (under strict confidentiality)</li>
            </ul>
            <p className="text-xs font-bold text-[#0A7A4B] pt-1">
              We do <span className="underline">not</span> sell your personal data.
            </p>
          </section>

          {/* 7. Data Security */}
          <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-3 shadow-xs">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0A7A4B] text-white text-xs flex items-center justify-center font-bold shrink-0">7</span>
              Data Security
            </h2>
            <p className="text-xs text-gray-700 font-medium leading-relaxed">
              We use industry-standard security measures including encryption, secure servers, and access controls to protect your information.
            </p>
          </section>

          {/* 8. Data Retention */}
          <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-3 shadow-xs">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0A7A4B] text-white text-xs flex items-center justify-center font-bold shrink-0">8</span>
              Data Retention
            </h2>
            <p className="text-xs text-gray-700 font-medium leading-relaxed">
              We retain your personal data only for as long as necessary to provide our services and to comply with Nigerian laws (including Central Bank of Nigeria (CBN) and Nigeria Data Protection Act (NDPA) requirements). Financial and identity records are typically retained for a minimum of 5–7 years.
            </p>
          </section>

          {/* 9. Your Rights */}
          <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-3 shadow-xs">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0A7A4B] text-white text-xs flex items-center justify-center font-bold shrink-0">9</span>
              Your Rights
            </h2>
            <p className="text-xs text-gray-600 font-medium">Under the Nigeria Data Protection Act (NDPA), you have the right to:</p>
            <ul className="list-disc list-inside space-y-1.5 text-xs font-medium text-gray-700 pl-2">
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data (where legally allowed)</li>
              <li>Withdraw consent</li>
              <li>Lodge a complaint with the Nigeria Data Protection Commission (NDPC)</li>
            </ul>
            <p className="text-xs text-gray-700 pt-2 font-medium">
              To exercise any of these rights, contact us at: <strong className="text-[#0A7A4B]">support@mangapay.ng</strong>
            </p>
          </section>

          {/* 10. International Data Transfers */}
          <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-3 shadow-xs">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0A7A4B] text-white text-xs flex items-center justify-center font-bold shrink-0">10</span>
              International Data Transfers
            </h2>
            <p className="text-xs text-gray-700 font-medium leading-relaxed">
              If we transfer your data outside Nigeria, we will ensure appropriate safeguards are in place to protect your information in line with applicable data protection laws.
            </p>
          </section>

          {/* 11. Children’s Privacy */}
          <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-3 shadow-xs">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0A7A4B] text-white text-xs flex items-center justify-center font-bold shrink-0">11</span>
              Children’s Privacy
            </h2>
            <p className="text-xs text-gray-700 font-medium">
              Our services are not intended for persons under 18 years of age.
            </p>
          </section>

          {/* 12. Changes to This Policy */}
          <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-3 shadow-xs">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0A7A4B] text-white text-xs flex items-center justify-center font-bold shrink-0">12</span>
              Changes to This Policy
            </h2>
            <p className="text-xs text-gray-700 font-medium">
              We may update this Privacy Policy from time to time. We will notify you of significant changes through the app or by email.
            </p>
          </section>

          {/* 13. Contact for Privacy Matters */}
          <section className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200 space-y-2 text-center shadow-xs">
            <h2 className="text-base font-extrabold text-[#0A7A4B]">13. Contact for Privacy Matters</h2>
            <p className="text-xs text-gray-700 font-medium">
              For any privacy-related questions or requests, please email:
            </p>
            <p className="text-sm font-extrabold text-[#0A7A4B] hover:underline">
              support@mangapay.ng
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
            <a href="/privacy" className="text-[#0A7A4B]">Privacy Policy</a>
            <a href="/terms" onClick={handleTermsClick} className="hover:text-[#0A7A4B] transition">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
