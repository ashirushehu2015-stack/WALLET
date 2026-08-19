import { useState } from "react";
import { X, Smartphone, Wifi, Zap, Tv, ChevronRight } from "lucide-react";
import { formatNaira } from "../api/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onRequestPay: (params: {
    category: string;
    provider: string;
    targetAccount: string;
    amount: number;
    packageTitle?: string;
  }) => void;
  balance: number;
}

type ServiceCategory = "Airtime" | "Data" | "Electricity" | "Cable";

const NETWORKS = [
  { name: "MTN", color: "bg-amber-400 text-slate-950 font-black" },
  { name: "Airtel", color: "bg-rose-600 text-white font-black" },
  { name: "Glo", color: "bg-emerald-600 text-white font-black" },
  { name: "9mobile", color: "bg-lime-600 text-white font-black" },
];

const DATA_PLANS: Record<string, { label: string; amount: number }[]> = {
  MTN: [
    { label: "1.5GB (30 Days)", amount: 1000 },
    { label: "3.0GB (30 Days)", amount: 1500 },
    { label: "7.0GB (30 Days)", amount: 3000 },
    { label: "15GB (30 Days)", amount: 5000 },
  ],
  Airtel: [
    { label: "1.5GB (30 Days)", amount: 1000 },
    { label: "3.5GB (30 Days)", amount: 1500 },
    { label: "10GB (30 Days)", amount: 3000 },
  ],
  Glo: [
    { label: "2.5GB (30 Days)", amount: 1000 },
    { label: "5.8GB (30 Days)", amount: 2000 },
    { label: "10GB (30 Days)", amount: 3000 },
  ],
  "9mobile": [
    { label: "1.5GB (30 Days)", amount: 1000 },
    { label: "4.5GB (30 Days)", amount: 2000 },
  ],
};

const DISCOS = ["IKEDC (Ikeja Electric)", "EKEDC (Eko Electric)", "AEDC (Abuja Electric)", "KEDCO (Kano Electric)"];
const CABLE_PROVIDERS = [
  { name: "DSTV", packages: [{ label: "DSTV Yanga", amount: 4200 }, { label: "DSTV Compact", amount: 12500 }, { label: "DSTV Premium", amount: 29500 }] },
  { name: "GOTV", packages: [{ label: "GOTV Smallie", amount: 1300 }, { label: "GOTV Jinja", amount: 2700 }, { label: "GOTV Max", amount: 4850 }] },
  { name: "StarTimes", packages: [{ label: "Basic Package", amount: 2600 }, { label: "Classic Package", amount: 3800 }] },
];

export default function ServicesBottomSheet({
  open,
  onClose,
  onRequestPay,
  balance,
}: Props) {
  const [category, setCategory] = useState<ServiceCategory>("Airtime");
  const [network, setNetwork] = useState("MTN");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<{ label: string; amount: number } | null>(null);
  
  // Electricity state
  const [disco, setDisco] = useState(DISCOS[0]);
  const [meterNum, setMeterNum] = useState("");

  // Cable state
  const [cableProvider, setCableProvider] = useState(CABLE_PROVIDERS[0]);
  const [smartcardNum, setSmartcardNum] = useState("");
  const [cablePackage, setCablePackage] = useState(CABLE_PROVIDERS[0].packages[0]);

  if (!open) return null;

  const currentAmount =
    category === "Airtime" || category === "Electricity"
      ? Number(amount.replace(/,/g, "")) || 0
      : category === "Data"
      ? selectedPlan?.amount || 0
      : cablePackage?.amount || 0;

  const handleProceed = () => {
    if (currentAmount < 50) return;
    if (currentAmount > balance) return;

    let targetAccount = "";
    let provider = "";
    let packageTitle = undefined;

    if (category === "Airtime") {
      provider = network;
      targetAccount = phone || "08012345678";
    } else if (category === "Data") {
      provider = network;
      targetAccount = phone || "08012345678";
      packageTitle = selectedPlan?.label;
    } else if (category === "Electricity") {
      provider = disco.split(" ")[0];
      targetAccount = meterNum || "0412-9981-301";
    } else {
      provider = cableProvider.name;
      targetAccount = smartcardNum || "7019283019";
      packageTitle = cablePackage.label;
    }

    onRequestPay({
      category,
      provider,
      targetAccount,
      amount: currentAmount,
      packageTitle,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface text-text-primary w-full max-w-md rounded-t-[24px] p-6 pb-8 shadow-soft max-h-[90vh] overflow-y-auto border-t border-border">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">Bills & Utilities</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-elevated text-text-secondary"
          >
            <X size={20} />
          </button>
        </div>

        {/* Category Selector */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { id: "Airtime", label: "Airtime", icon: Smartphone },
            { id: "Data", label: "Data", icon: Wifi },
            { id: "Electricity", label: "Power", icon: Zap },
            { id: "Cable", label: "Cable TV", icon: Tv },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setCategory(id as ServiceCategory);
                setSelectedPlan(null);
              }}
              className={`flex flex-col items-center justify-center py-3 px-1 rounded-2xl border text-xs font-semibold transition ${
                category === id
                  ? "bg-accent text-white border-accent shadow-sm"
                  : "bg-elevated border-border text-text-primary hover:border-accent"
              }`}
            >
              <Icon size={20} className="mb-1" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Form per Category */}
        <div className="space-y-4">
          {(category === "Airtime" || category === "Data") && (
            <>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Select Network Provider
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {NETWORKS.map((n) => (
                    <button
                      key={n.name}
                      type="button"
                      onClick={() => setNetwork(n.name)}
                      className={`h-11 rounded-xl font-bold text-xs border transition ${n.color} ${
                        network === n.name ? "ring-2 ring-accent ring-offset-2" : "opacity-75 hover:opacity-100"
                      }`}
                    >
                      {n.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 08031234567"
                  className="w-full h-12 px-4 rounded-2xl bg-elevated border border-border text-sm font-medium outline-none focus:border-accent"
                />
              </div>
            </>
          )}

          {category === "Airtime" && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Amount (₦)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, "");
                  setAmount(v ? Number(v).toLocaleString() : "");
                }}
                placeholder="0"
                className="w-full h-12 px-4 rounded-2xl bg-elevated border border-border text-lg font-bold outline-none focus:border-accent"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {[200, 500, 1000, 2000, 5000].map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAmount(a.toLocaleString())}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-elevated border border-border hover:border-accent"
                  >
                    ₦{a}
                  </button>
                ))}
              </div>
            </div>
          )}

          {category === "Data" && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Select Data Bundle
              </label>
              <div className="space-y-2">
                {(DATA_PLANS[network] || DATA_PLANS["MTN"]).map((plan) => (
                  <button
                    key={plan.label}
                    type="button"
                    onClick={() => setSelectedPlan(plan)}
                    className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-xs font-semibold transition ${
                      selectedPlan?.label === plan.label
                        ? "bg-accent-soft border-accent text-accent"
                        : "bg-elevated border-border text-text-primary hover:border-accent"
                    }`}
                  >
                    <span>{plan.label}</span>
                    <span className="font-bold text-sm">{formatNaira(plan.amount)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {category === "Electricity" && (
            <>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Select Electricity Provider (DISCO)
                </label>
                <select
                  value={disco}
                  onChange={(e) => setDisco(e.target.value)}
                  className="w-full h-12 px-4 rounded-2xl bg-elevated border border-border text-sm font-medium outline-none focus:border-accent"
                >
                  {DISCOS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Meter Number
                </label>
                <input
                  type="text"
                  value={meterNum}
                  onChange={(e) => setMeterNum(e.target.value)}
                  placeholder="e.g. 0418 9921 341"
                  className="w-full h-12 px-4 rounded-2xl bg-elevated border border-border text-sm font-mono outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Amount (₦)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, "");
                    setAmount(v ? Number(v).toLocaleString() : "");
                  }}
                  placeholder="0"
                  className="w-full h-12 px-4 rounded-2xl bg-elevated border border-border text-lg font-bold outline-none focus:border-accent"
                />
              </div>
            </>
          )}

          {category === "Cable" && (
            <>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Select Provider
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CABLE_PROVIDERS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => {
                        setCableProvider(c);
                        setCablePackage(c.packages[0]);
                      }}
                      className={`h-11 rounded-xl font-bold text-xs border transition ${
                        cableProvider.name === c.name
                          ? "bg-accent text-white border-accent"
                          : "bg-elevated border-border text-text-primary"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Smartcard / IUC Number
                </label>
                <input
                  type="text"
                  value={smartcardNum}
                  onChange={(e) => setSmartcardNum(e.target.value)}
                  placeholder="e.g. 7019283019"
                  className="w-full h-12 px-4 rounded-2xl bg-elevated border border-border text-sm font-mono outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Select Subscription Package
                </label>
                <div className="space-y-2">
                  {cableProvider.packages.map((pkg) => (
                    <button
                      key={pkg.label}
                      type="button"
                      onClick={() => setCablePackage(pkg)}
                      className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-xs font-semibold transition ${
                        cablePackage.label === pkg.label
                          ? "bg-accent-soft border-accent text-accent"
                          : "bg-elevated border-border text-text-primary hover:border-accent"
                      }`}
                    >
                      <span>{pkg.label}</span>
                      <span className="font-bold text-sm">{formatNaira(pkg.amount)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={handleProceed}
          disabled={currentAmount < 50 || currentAmount > balance}
          className="mt-6 w-full h-14 rounded-2xl bg-accent text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40 hover:opacity-90 transition active:scale-[0.99]"
        >
          <span>Pay {formatNaira(currentAmount)}</span>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
