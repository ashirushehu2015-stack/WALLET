import { useState, useMemo } from "react";
import { Search, Plus, ArrowUpRight, ArrowDownLeft, Zap, CreditCard, Download, Check, Share2 } from "lucide-react";
import {
  formatNaira,
  formatRelative,
  type Transaction,
} from "../api/api";

interface Props {
  transactions: Transaction[];
}

type Filter = "ALL" | "FUND" | "SEND" | "WITHDRAW" | "UTILITY" | "CARD";

export default function HistoryScreen({ transactions }: Props) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [visibleCount, setVisibleCount] = useState(8);
  const [receiptCopied, setReceiptCopied] = useState(false);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (filter === "FUND" && tx.type !== "FUND") return false;
      if (filter === "SEND" && tx.type !== "SEND") return false;
      if (filter === "WITHDRAW" && tx.type !== "WITHDRAW") return false;
      if (filter === "UTILITY" && tx.type !== "UTILITY") return false;
      if (filter === "CARD" && tx.type !== "CARD_FUND" && tx.type !== "CARD_CREATE") return false;

      if (query) {
        const q = query.toLowerCase();
        return (
          tx.description.toLowerCase().includes(q) ||
          tx.reference.toLowerCase().includes(q) ||
          (tx.counterparty || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, filter, query]);

  const visibleTransactions = filtered.slice(0, visibleCount);

  const statusColor = (s: string) => {
    if (s === "SUCCESS") return "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400";
    if (s === "PROCESSING") return "text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400";
    return "text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400";
  };

  const handleCopyReceipt = () => {
    if (!selected) return;
    const text = `MangaPay Receipt\nRef: ${selected.reference}\nType: ${selected.type}\nAmount: ${formatNaira(selected.amount)}\nStatus: ${selected.status}\nDate: ${new Date(selected.createdAt).toLocaleString()}`;
    navigator.clipboard?.writeText(text);
    setReceiptCopied(true);
    setTimeout(() => setReceiptCopied(false), 2000);
  };

  return (
    <div className="pb-28 px-4 pt-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Transaction History</h1>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search description or reference"
          className="w-full h-12 pl-10 pr-4 rounded-2xl bg-elevated border border-border outline-none focus:border-accent text-sm font-medium"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 pb-1">
        {(
          [
            ["ALL", "All Activity"],
            ["FUND", "Funded"],
            ["SEND", "Sent"],
            ["WITHDRAW", "Withdrawn"],
            ["UTILITY", "Bills & Airtime"],
            ["CARD", "Virtual Cards"],
          ] as [Filter, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => {
              setFilter(id);
              setVisibleCount(8);
            }}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold border transition ${
              filter === id
                ? "bg-accent text-white border-accent shadow-sm"
                : "bg-elevated border-border text-text-primary hover:border-accent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {visibleTransactions.map((tx) => (
          <button
            key={tx.id}
            onClick={() => setSelected(tx)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-surface border border-border text-left hover:border-accent/50 transition"
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                tx.type === "FUND"
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : tx.type === "SEND"
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                  : tx.type === "UTILITY"
                  ? "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400"
                  : tx.type.startsWith("CARD")
                  ? "bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400"
                  : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
              }`}
            >
              {tx.type === "FUND" ? (
                <Plus size={18} />
              ) : tx.type === "SEND" ? (
                <ArrowUpRight size={18} />
              ) : tx.type === "UTILITY" ? (
                <Zap size={18} />
              ) : tx.type.startsWith("CARD") ? (
                <CreditCard size={18} />
              ) : (
                <ArrowDownLeft size={18} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-text-primary truncate">{tx.description}</p>
              <p className="text-[11px] text-text-secondary">
                {formatRelative(tx.createdAt)} · {tx.reference}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p
                className={`text-xs font-bold ${
                  tx.type === "FUND" ? "text-emerald-600 dark:text-emerald-400" : "text-text-primary"
                }`}
              >
                {tx.type === "FUND" ? "+" : "-"}
                {formatNaira(tx.amount)}
              </p>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${statusColor(
                  tx.status
                )}`}
              >
                {tx.status}
              </span>
            </div>
          </button>
        ))}

        {visibleTransactions.length === 0 && (
          <p className="text-center text-xs text-text-secondary py-12">
            No matching transactions found
          </p>
        )}

        {/* Infinite Scroll / Load More trigger */}
        {visibleTransactions.length < filtered.length && (
          <button
            onClick={() => setVisibleCount((prev) => prev + 5)}
            className="mt-4 w-full py-3 rounded-2xl bg-elevated border border-border text-xs font-semibold text-accent hover:border-accent transition"
          >
            Load More Transactions ({filtered.length - visibleTransactions.length} remaining)
          </button>
        )}
      </div>

      {/* Receipt Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-surface text-text-primary w-full max-w-sm rounded-[24px] p-6 shadow-2xl border border-border">
            <div className="text-center border-b border-border pb-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-soft text-accent flex items-center justify-center mx-auto mb-2 font-black text-lg">
                MP
              </div>
              <h3 className="text-base font-bold">MangaPay Receipt</h3>
              <p className="text-xs text-text-secondary">Official Transaction Record</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-text-secondary">Type</span>
                <span className="font-semibold">{selected.type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Amount</span>
                <span className="font-extrabold text-base text-text-primary">
                  {formatNaira(selected.amount)}
                </span>
              </div>
              {selected.fee !== undefined && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Fee</span>
                  <span>{formatNaira(selected.fee)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-secondary">Status</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor(
                    selected.status
                  )}`}
                >
                  {selected.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Reference</span>
                <span className="font-mono text-[11px] font-semibold">{selected.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Date & Time</span>
                <span>
                  {new Date(selected.createdAt).toLocaleString("en-NG")}
                </span>
              </div>
              {selected.counterparty && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Beneficiary / Target</span>
                  <span className="font-semibold">{selected.counterparty}</span>
                </div>
              )}
              {selected.categoryDetails && (
                <div className="p-2.5 bg-elevated rounded-xl border border-border font-mono text-[11px] text-center font-medium">
                  {selected.categoryDetails}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={handleCopyReceipt}
                className="flex-1 h-12 rounded-2xl bg-elevated border border-border font-semibold text-xs flex items-center justify-center gap-1.5 hover:border-accent"
              >
                {receiptCopied ? <Check size={16} className="text-emerald-600" /> : <Share2 size={16} />}
                <span>{receiptCopied ? "Copied" : "Share Receipt"}</span>
              </button>
              <button
                onClick={() => setSelected(null)}
                className="flex-1 h-12 rounded-2xl bg-accent text-white font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

