import { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { BnplCheckoutPayload, getBnplAvailability, launchReplacementBnpl } from '../lib/bnpl';

interface KlumpButtonProps {
  payload?: BnplCheckoutPayload;
}

export function KlumpButton({ payload }: KlumpButtonProps) {
  const { settings } = useStore();
  const availability = getBnplAvailability(settings.bnpl);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleClick() {
    setFeedback(null);
    if (!availability.available || !payload) {
      setFeedback(
        availability.controlledMessage ||
          'No active BNPL provider is configured. Please select Bank Transfer or Save-to-Buy.'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await launchReplacementBnpl(settings.bnpl, payload);
      if (!res.launched) {
        setFeedback(res.message);
      }
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Unable to initialize BNPL payment.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full space-y-2.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`w-full bg-black text-white py-4 px-6 rounded-xl font-medium text-sm flex flex-col items-center justify-center gap-1 transition-all shadow-md ${
          availability.available
            ? 'hover:bg-zinc-900'
            : 'opacity-65 cursor-not-allowed'
        }`}
      >
        <span className="text-base font-semibold">
          {loading
            ? 'Initializing BNPL...'
            : availability.available
              ? availability.title
              : availability.title}
        </span>
        <span className="text-xs text-zinc-400">
          {availability.available ? availability.subtitle : availability.subtitle}
        </span>
      </button>

      {(feedback || !availability.available) && (
        <div className="rounded-xl border border-signal/25 bg-signal/5 p-3.5 text-xs text-ink leading-relaxed">
          {feedback || availability.controlledMessage}
        </div>
      )}
    </div>
  );
}
