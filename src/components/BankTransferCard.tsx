import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Copy } from 'lucide-react';
import { useStore } from '../context/StoreContext';

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard API unavailable
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div>
        <p className="text-[11px] uppercase tracking-wider text-steel font-data">{label}</p>
        <p className="font-data font-semibold text-sm">{value || 'Not configured'}</p>
      </div>
      {value && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={handleCopy}
          className="p-2 rounded-full hover:bg-ink/5 text-steel hover:text-signal transition-colors"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check size={16} className="text-mint" /> : <Copy size={16} />}
        </motion.button>
      )}
    </div>
  );
}

export function BankTransferCard({ amount }: { amount?: string }) {
  const { settings } = useStore();
  const acct = settings.bankTransferAccount;

  return (
    <div className="rounded-2xl border border-signal/20 bg-signal/5 p-5">
      <p className="text-sm font-semibold mb-1">Pay by Bank Transfer</p>
      <p className="text-xs text-steel mb-3">
        {amount
          ? `Transfer ${amount} to the account below.`
          : 'Transfer the order total to the account below.'}{' '}
        {acct.instructions ||
          "We'll confirm your payment and begin processing your order."}
      </p>
      <div className="divide-y divide-signal/10">
        <CopyField label="Account Name" value={acct.accountName} />
        <CopyField label="Account Number" value={acct.accountNumber} />
        <CopyField label="Bank" value={acct.bankName} />
      </div>
    </div>
  );
}
