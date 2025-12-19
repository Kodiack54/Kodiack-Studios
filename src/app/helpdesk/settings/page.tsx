import Link from 'next/link';
import HelpdeskSettings from './components/HelpdeskSettings';

export default function HelpdeskSettingsPage() {
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/helpdesk" className="hover:text-white transition-colors">
              Helpdesk
            </Link>
            <span>/</span>
            <span className="text-white">Settings</span>
          </div>
          <h2 className="text-2xl font-semibold text-white">Helpdesk Settings</h2>
          <p className="text-gray-400 text-sm">
            Configure helpdesk behavior and notifications
          </p>
        </div>
      </div>

      {/* Settings */}
      <HelpdeskSettings />
    </div>
  );
}
