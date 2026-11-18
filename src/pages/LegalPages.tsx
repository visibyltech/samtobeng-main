import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { LegalDocument } from '../types';

function LegalDocumentView({ docData }: { docData: LegalDocument }) {
  const { isAdmin } = useAuth();

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 space-y-6">
      <div>
        <p className="font-data text-xs uppercase tracking-widest text-steel mb-2">Legal</p>
        <h1 className="font-display font-bold text-3xl sm:text-4xl">{docData.title}</h1>
        <p className="text-xs font-data text-steel mt-2">{docData.lastUpdatedLabel}</p>
      </div>

      {docData.awaitingOriginalContent || !docData.content.trim() ? (
        <div className="rounded-2xl border border-signal/25 bg-signal/5 p-6 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-signal shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h2 className="font-display font-semibold text-base">
                Awaiting Original Content
              </h2>
              <p className="text-sm text-steel leading-relaxed">
                This page was not publicly accessible on the source website during migration and has intentionally not been fabricated.
                An administrator can enter the official SAMTOB P&amp;C text from the Admin Dashboard.
              </p>
              {isAdmin && (
                <Link
                  to="/admin?tab=settings"
                  className="inline-flex bg-signal text-white px-4 py-2 rounded-full text-xs font-medium hover:brightness-110 transition-all"
                >
                  Edit in Admin Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-line rounded-2xl p-6 sm:p-8 whitespace-pre-wrap text-sm text-ink leading-relaxed">
          {docData.content}
        </div>
      )}
    </div>
  );
}

export function TermsPage() {
  const { settings } = useStore();
  return <LegalDocumentView docData={settings.termsDocument} />;
}

export function PrivacyPage() {
  const { settings } = useStore();
  return <LegalDocumentView docData={settings.privacyDocument} />;
}
