import { useState, useEffect, useMemo } from "react";
import { X, Smartphone, Wifi, Zap, Tv, ChevronRight, Search, Loader2, Check } from "lucide-react";
import { formatNaira, getVASDataPlans, VASDataPlan } from "../api/api";

export type ServiceCategory = "Airtime" | "Data" | "Electricity" | "Cable";

interface Props {
  open: boolean;
  onClose: () => void;
  initialCategory?: ServiceCategory;
  balance: number;
  onRequestAirtime: (params: {
    network: string;
    recipientPhone: string;
    amount: number;
  }) => void;
  onRequestData: (params: {
    network: string;
    recipientPhone: string;
    variationCode: string;
    serviceId: string;
    amount: number;
    planName: string;
  }) => void;
  onRequestLegacyPay?: (params: {
    category: string;
    provider: string;
    targetAccount: string;
    amount: number;
    packageTitle?: string;
  }) => void;
}

const NETWORKS = [
  { code: "MTN", name: "MTN", color: "bg-amber-400 text-slate-950 border-amber-500", badge: "MTN" },
  { code: "AIRTEL", name: "Airtel", color: "bg-rose-600 text-white border-rose-700", badge: "Airtel" },
  { code: "GLO", name: "Glo", color: "bg-emerald-600 text-white border-emerald-700", badge: "Glo" },
  { code: "9MOBILE", name: "9mobile", color: "bg-lime-600 text-white border-lime-700", badge: "9mobile" },
];

const AIRTIME_QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

const DISCOS = [
  "IKEDC (Ikeja Electric)",
  "EKEDC (Eko Electric)",
  "AEDC (Abuja Electric)",
  "KEDCO (Kano Electric)",
  "PHED (Port Harcourt Electric)",
  "IBEDC (Ibadan Electric)",
];

const CABLE_PROVIDERS = [
  {
    name: "DSTV",
    packages: [
      { label: "DSTV Yanga", amount: 4200 },
      { label: "DSTV Compact", amount: 12500 },
      { label: "DSTV Premium", amount: 29500 },
    ],
  },
  {
    name: "GOTV",
    packages: [
      { label: "GOTV Smallie", amount: 1300 },
      { label: "GOTV Jinja", amount: 2700 },
      { label: "GOTV Max", amount: 4850 },
      { label: "GOTV Supa", amount: 6400 },
    ],
  },
  {
    name: "StarTimes",
    packages: [
      { label: "Nova Package", amount: 1500 },
      { label: "Basic Package", amount: 2600 },
      { label: "Classic Package", amount: 3800 },
    ],
  },
];

function detectTelecomPrefix(num: string): string | null {
  const clean = num.replace(/\D/g, "");
  let prefix = "";
  if (clean.startsWith("234") && clean.length >= 6) {
    prefix = "0" + clean.slice(3, 6);
  } else if (clean.startsWith("0") && clean.length >= 4) {
    prefix = clean.slice(0, 4);
  } else {
    return null;
  }

  const mtn = ["0803", "0806", "0703", "0706", "0813", "0816", "0810", "0814", "0903", "0906", "0913", "0916"];
  const airtel = ["0802", "0808", "0708", "0812", "0701", "0902", "0901", "0904", "0907", "0912"];
  const glo = ["0805", "0807", "0705", "0815", "0811", "0905", "0915"];
  const nineMobile = ["0809", "0817", "0818", "0909", "0908"];

  if (mtn.includes(prefix)) return "MTN";
  if (airtel.includes(prefix)) return "AIRTEL";
  if (glo.includes(prefix)) return "GLO";
  if (nineMobile.includes(prefix)) return "9MOBILE";
  return null;
}

export default function ServicesBottomSheet({
  open,
  onClose,
  initialCategory = "Airtime",
  balance,
  onRequestAirtime,
  onRequestData,
  onRequestLegacyPay,
}: Props) {
  const [category, setCategory] = useState<ServiceCategory>(initialCategory);
  const [network, setNetwork] = useState<string>("MTN");
  const [userSelectedNetwork, setUserSelectedNetwork] = useState(false);
  const [phone, setPhone] = useState("");
  const [airtimeAmount, setAirtimeAmount] = useState<string>("1000");

  // Data plans state
  const [dataPlans, setDataPlans] = useState<VASDataPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<VASDataPlan | null>(null);
  const [planFilter, setPlanFilter] = useState<"ALL" | "DAILY" | "WEEKLY" | "MONTHLY">("ALL");
  const [planSearch, setPlanSearch] = useState("");

  // Electricity state
  const [disco, setDisco] = useState(DISCOS[0]);
  const [meterNum, setMeterNum] = useState("");
  const [powerAmount, setPowerAmount] = useState("2000");

  // Cable state
  const [cableProvider, setCableProvider] = useState(CABLE_PROVIDERS[0]);
  const [smartcardNum, setSmartcardNum] = useState("");
  const [cablePackage, setCablePackage] = useState(CABLE_PROVIDERS[0].packages[0]);

  // Sync initialCategory
  useEffect(() => {
    if (open) {
      setCategory(initialCategory);
    }
  }, [open, initialCategory]);

  // Auto-detect network from phone unless user explicitly chose one
  useEffect(() => {
    if (!userSelectedNetwork && phone.length >= 4) {
      const detected = detectTelecomPrefix(phone);
      if (detected) {
        setNetwork(detected);
      }
    }
  }, [phone, userSelectedNetwork]);

  // Fetch data plans when network changes or modal opens on Data tab
  useEffect(() => {
    if (category === "Data" && open) {
      let isMounted = true;
      setLoadingPlans(true);
      getVASDataPlans(network)
        .then((plans) => {
          if (isMounted) {
            setDataPlans(plans);
            setSelectedPlan(plans[0] || null);
            setLoadingPlans(false);
          }
        })
        .catch(() => {
          if (isMounted) setLoadingPlans(false);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [category, network, open]);

  // Filtered plans
  const filteredPlans = useMemo(() => {
    return dataPlans.filter((p) => {
      const name = p.name.toLowerCase();
      const allowance = (p.dataAllowance || "").toLowerCase();
      const validity = (p.validity || "").toLowerCase();
      const term = planSearch.toLowerCase();

      const matchesSearch = !term || name.includes(term) || allowance.includes(term);
      if (!matchesSearch) return false;

      if (planFilter === "DAILY") {
        return validity.includes("1 day") || validity.includes("day") || name.includes("daily") || name.includes("1-day");
      }
      if (planFilter === "WEEKLY") {
        return validity.includes("7 days") || validity.includes("week") || name.includes("weekly");
      }
      if (planFilter === "MONTHLY") {
        return validity.includes("30 days") || validity.includes("month") || name.includes("monthly");
      }
      return true;
    });
  }, [dataPlans, planFilter, planSearch]);

  if (!open) return null;

  const numericAirtime = Number(airtimeAmount.replace(/[^0-9]/g, "")) || 0;
  const numericPower = Number(powerAmount.replace(/[^0-9]/g, "")) || 0;

  const currentPayAmount =
    category === "Airtime"
      ? numericAirtime
      : category === "Data"
      ? selectedPlan?.sellingPrice || 0
      : category === "Electricity"
      ? numericPower
      : cablePackage?.amount || 0;

  const canAfford = balance >= currentPayAmount && currentPayAmount >= 50;

  const handleProceed = () => {
    if (!canAfford) return;

    if (category === "Airtime") {
      onRequestAirtime({
        network,
        recipientPhone: phone.trim(),
        amount: numericAirtime,
      });
      onClose();
    } else if (category === "Data") {
      if (!selectedPlan) return;
      onRequestData({
        network,
        recipientPhone: phone.trim(),
        variationCode: selectedPlan.variationCode,
        serviceId: selectedPlan.serviceId,
        amount: selectedPlan.sellingPrice,
        planName: selectedPlan.name,
      });
      onClose();
    } else if (onRequestLegacyPay) {
      if (category === "Electricity") {
        onRequestLegacyPay({
          category: "Electricity",
          provider: disco.split(" ")[0],
          targetAccount: meterNum || "0412-9981-301",
          amount: numericPower,
        });
      } else {
        onRequestLegacyPay({
          category: "Cable",
          provider: cableProvider.name,
          targetAccount: smartcardNum || "7019283019",
          amount: cablePackage.amount,
          packageTitle: cablePackage.label,
        });
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs">
      <div className="bg-surface text-text-primary w-full max-w-md rounded-t-[28px] p-6 pb-8 shadow-2xl max-h-[92vh] overflow-y-auto border-t border-border flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div>
            <h3 className="text-base font-bold text-text-primary">Bills & Value Added Services</h3>
            <p className="text-[11px] text-text-secondary">Instant airtime, data and utility payments</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-elevated text-text-secondary transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="grid grid-cols-4 gap-2 my-4">
          {[
            { id: "Airtime", label: "Airtime", icon: Smartphone },
            { id: "Data", label: "Buy Data", icon: Wifi },
            { id: "Electricity", label: "Power", icon: Zap },
            { id: "Cable", label: "Cable TV", icon: Tv },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setCategory(id as ServiceCategory);
              }}
              className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl border text-xs font-semibold transition ${
                category === id
                  ? "bg-accent text-white border-accent shadow-sm"
                  : "bg-elevated border-border text-text-primary hover:border-accent"
              }`}
            >
              <Icon size={18} className="mb-1" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Network & Phone Input for Airtime & Data */}
        {(category === "Airtime" || category === "Data") && (
          <div className="space-y-4">
            {/* Network Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-text-secondary">Select Network</label>
                <span className="text-[10px] text-text-secondary">
                  Active: <strong className="text-accent">{network}</strong>
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {NETWORKS.map((n) => {
                  const isSelected = network === n.code;
                  return (
                    <button
                      key={n.code}
                      type="button"
                      onClick={() => {
                        setNetwork(n.code);
                        setUserSelectedNetwork(true);
                      }}
                      className={`h-11 rounded-xl font-bold text-xs border flex items-center justify-center gap-1 transition relative ${n.color} ${
                        isSelected ? "ring-2 ring-accent ring-offset-2 scale-[1.02] shadow-sm" : "opacity-70 hover:opacity-100"
                      }`}
                    >
                      <span>{n.badge}</span>
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recipient Phone */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Recipient Phone Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0803 123 4567"
                  className="w-full h-12 px-4 rounded-2xl bg-elevated border border-border text-sm font-semibold outline-none focus:border-accent"
                />
                {phone.length >= 4 && (
                  <span className="absolute right-3 top-3 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-surface border border-border text-text-secondary">
                    {network}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AIRTIME CONTENT */}
        {category === "Airtime" && (
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Airtime Amount (₦)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={airtimeAmount}
                onChange={(e) => {
                  const clean = e.target.value.replace(/[^0-9]/g, "");
                  setAirtimeAmount(clean ? Number(clean).toLocaleString() : "");
                }}
                placeholder="500"
                className="w-full h-12 px-4 rounded-2xl bg-elevated border border-border text-xl font-black outline-none focus:border-accent"
              />
            </div>

            {/* Quick Pills */}
            <div className="grid grid-cols-3 gap-2">
              {AIRTIME_QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAirtimeAmount(amt.toLocaleString())}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    numericAirtime === amt
                      ? "bg-accent-soft border-accent text-accent"
                      : "bg-elevated border-border text-text-primary hover:border-accent"
                  }`}
                >
                  ₦{amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* DATA CONTENT */}
        {category === "Data" && (
          <div className="space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-secondary">Select Data Bundle</label>
              {loadingPlans && (
                <span className="text-[10px] text-accent flex items-center gap-1 font-medium">
                  <Loader2 size={12} className="animate-spin" /> Fetching bundles...
                </span>
              )}
            </div>

            {/* Plan Filter Chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
              {(["ALL", "DAILY", "WEEKLY", "MONTHLY"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setPlanFilter(filter)}
                  className={`px-3 py-1 rounded-full font-semibold whitespace-nowrap text-[11px] transition ${
                    planFilter === filter
                      ? "bg-accent text-white"
                      : "bg-elevated text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-3 text-text-secondary" />
              <input
                type="text"
                placeholder="Search plans (e.g. 1.5GB, 10GB)..."
                value={planSearch}
                onChange={(e) => setPlanSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-elevated border border-border text-xs outline-none focus:border-accent"
              />
            </div>

            {/* Plans List */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {filteredPlans.length === 0 ? (
                <p className="text-xs text-text-secondary text-center py-6">
                  {loadingPlans ? "Loading telecom bundles..." : "No bundles match your filter."}
                </p>
              ) : (
                filteredPlans.map((plan) => {
                  const isSelected = selectedPlan?.variationCode === plan.variationCode;
                  return (
                    <button
                      key={plan.variationCode}
                      type="button"
                      onClick={() => setSelectedPlan(plan)}
                      className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition ${
                        isSelected
                          ? "bg-accent-soft border-accent ring-1 ring-accent"
                          : "bg-elevated border-border hover:border-accent/50"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-xs text-text-primary">{plan.name}</p>
                        <p className="text-[10px] text-text-secondary">{plan.validity || "Standard validity"}</p>
                      </div>
                      <span className="font-extrabold text-sm text-accent">
                        {formatNaira(plan.sellingPrice)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ELECTRICITY CONTENT */}
        {category === "Electricity" && (
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Electricity Provider (DISCO)
              </label>
              <select
                value={disco}
                onChange={(e) => setDisco(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl bg-elevated border border-border text-sm font-semibold outline-none focus:border-accent"
              >
                {DISCOS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
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
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Amount (₦)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={powerAmount}
                onChange={(e) => {
                  const clean = e.target.value.replace(/[^0-9]/g, "");
                  setPowerAmount(clean ? Number(clean).toLocaleString() : "");
                }}
                placeholder="2000"
                className="w-full h-12 px-4 rounded-2xl bg-elevated border border-border text-lg font-bold outline-none focus:border-accent"
              />
            </div>
          </div>
        )}

        {/* CABLE TV CONTENT */}
        {category === "Cable" && (
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Select Cable Provider
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
                        ? "bg-accent text-white border-accent shadow-sm"
                        : "bg-elevated border-border text-text-primary"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
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
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Subscription Package
              </label>
              <div className="space-y-2">
                {cableProvider.packages.map((pkg) => (
                  <button
                    key={pkg.label}
                    type="button"
                    onClick={() => setCablePackage(pkg)}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between text-xs font-semibold transition ${
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
          </div>
        )}

        {/* Order Summary Card */}
        <div className="mt-5 p-3.5 rounded-2xl bg-elevated/70 border border-border/80 text-xs space-y-1.5">
          <div className="flex justify-between text-text-secondary">
            <span>Available Balance</span>
            <span className="font-semibold text-text-primary">{formatNaira(balance)}</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Transaction Fee</span>
            <span className="font-semibold text-emerald-600">FREE (₦0.00)</span>
          </div>
          <div className="flex justify-between font-bold text-text-primary pt-1 border-t border-border/60">
            <span>Total Debit</span>
            <span className="text-sm text-accent">{formatNaira(currentPayAmount)}</span>
          </div>
          {currentPayAmount > balance && (
            <p className="text-[11px] font-semibold text-rose-500 pt-1 text-right">
              Insufficient balance. Please fund your wallet.
            </p>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={handleProceed}
          disabled={!canAfford}
          className="mt-4 w-full h-13 rounded-2xl bg-accent text-white font-bold flex items-center justify-center gap-2 disabled:opacity-40 hover:opacity-95 transition active:scale-[0.99] shadow-sm"
        >
          <span>Confirm & Pay {formatNaira(currentPayAmount)}</span>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
