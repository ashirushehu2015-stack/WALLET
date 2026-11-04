import { useState } from "react";
import { CheckCircle2, Copy, Download, Share2, X, Smartphone, Zap } from "lucide-react";
import { formatNaira, VASTxReceipt } from "../api/api";

interface Props {
  open: boolean;
  onClose: () => void;
  receipt: VASTxReceipt | null;
}

export default function VASReceiptModal({ open, onClose, receipt }: Props) {
  const [copied, setCopied] = useState(false);

  if (!open || !receipt) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(receipt.transactionReference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const text = `MangaPay Digital Receipt\nReference: ${receipt.transactionReference}\nService: ${receipt.serviceType} (${receipt.network})\nRecipient: ${receipt.recipientPhone}\nAmount: ${formatNaira(receipt.totalAmountPaid)}\nStatus: ${receipt.status}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "MangaPay Transaction Receipt",
          text,
        });
      } catch (e) {
        // user cancelled
      }
    } else {
      navigator.clipboard.writeText(text);
      alert("Receipt copied to clipboard!");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isAirtime = receipt.serviceType === "AIRTIME";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-surface text-text-primary w-full max-w-sm rounded-[28px] p-6 shadow-2xl border border-border animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#0A7A4B] text-white flex items-center justify-center font-black text-sm">
              M
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">MangaPay</p>
              <p className="text-[10px] text-text-secondary">Official Receipt</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-elevated text-text-secondary">
            <X size={18} />
          </button>
        </div>

        {/* Success Icon & Amount */}
        <div className="text-center my-5">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 size={28} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
            {receipt.status}
          </span>
          <h2 className="text-2xl font-black mt-2 text-text-primary">
            {formatNaira(receipt.totalAmountPaid)}
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            {receipt.serviceType} Recharge
          </p>
        </div>

        {/* Receipt Details Box */}
        <div className="bg-elevated rounded-2xl p-4 space-y-2.5 text-xs border border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Recipient Number</span>
            <span className="font-bold font-mono">{receipt.recipientPhone}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Network Operator</span>
            <span className="font-bold flex items-center gap-1.5">
              {isAirtime ? <Smartphone size={13} className="text-accent" /> : <Zap size={13} className="text-accent" />}
              {receipt.network}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Payment Method</span>
            <span className="font-medium">MangaPay Wallet</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Service Fee</span>
            <span className="font-medium text-emerald-600">FREE (₦0.00)</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <span className="text-text-secondary">Date & Time</span>
            <span className="text-[11px] text-text-secondary">
              {new Date(receipt.date).toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Ref No.</span>
            <button
              onClick={handleCopy}
              className="font-mono text-[11px] text-accent flex items-center gap-1 hover:underline"
            >
              <span>{receipt.transactionReference}</span>
              <Copy size={11} />
            </button>
          </div>
          {copied && <p className="text-right text-[10px] text-emerald-600">Reference copied!</p>}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 mt-5">
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-border bg-surface hover:bg-elevated text-xs font-bold text-text-primary transition active:scale-95"
          >
            <Share2 size={14} />
            <span>Share</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-border bg-surface hover:bg-elevated text-xs font-bold text-text-primary transition active:scale-95"
          >
            <Download size={14} />
            <span>Download</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-2 py-3 rounded-xl bg-accent hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition active:scale-95"
        >
          Done
        </button>
      </div>
    </div>
  );
}
