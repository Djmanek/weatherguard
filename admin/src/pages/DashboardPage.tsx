import { useMe } from '../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending Approval',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10 border-amber-400/20',
    icon: '⏳',
    message: 'Your request has been received. An admin will review it shortly.',
  },
  approved: {
    label: 'Approved',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10 border-emerald-400/20',
    icon: '✅',
    message: 'You\'re approved! Link your Telegram account below to receive weather alerts.',
  },
  rejected: {
    label: 'Access Denied',
    color: 'text-red-400',
    bg: 'bg-red-400/10 border-red-400/20',
    icon: '✗',
    message: 'Your access request was not approved. Contact the admin for more info.',
  },
};

export default function DashboardPage() {
  const { data: me, isLoading } = useMe();
  const navigate = useNavigate();

  const { data: telegramLink } = useQuery({
    queryKey: ['telegram-link'],
    queryFn: async () => {
      const res = await api.get<{ url: string; token: string }>('/users/telegram-link');
      return res.data;
    },
    enabled: !!me,
  });

  function logout() {
    localStorage.removeItem('wg_token');
    navigate('/login');
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f13]">
        <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!me) {
    navigate('/login');
    return null;
  }

  const status = STATUS_CONFIG[me.status];

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white">
      {/* Nav */}
      <nav className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 3C7.5 3 4 6.36 4 10.5c0 2.18.92 4.14 2.4 5.54L12 21l5.6-4.96A7.37 7.37 0 0 0 20 10.5C20 6.36 16.5 3 12 3Z" fill="#6366f1" opacity=".4"/>
              <path d="M12 7a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" fill="#6366f1"/>
            </svg>
          </div>
          <span className="font-semibold text-sm text-white">WeatherGuard</span>
        </div>
        <div className="flex items-center gap-3">
          {me.avatarUrl && (
            <img src={me.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
          )}
          <span className="text-sm text-zinc-400">{me.displayName}</span>
          <button
            onClick={logout}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      <main className="max-w-lg mx-auto px-6 py-12 space-y-6">
        {/* Status card */}
        <div className={`rounded-2xl border p-6 ${status.bg}`}>
          <div className="flex items-start gap-4">
            <span className="text-2xl">{status.icon}</span>
            <div>
              <p className={`font-semibold text-sm ${status.color}`}>{status.label}</p>
              <p className="mt-1 text-sm text-zinc-400 leading-relaxed">{status.message}</p>
            </div>
          </div>
        </div>

        {/* Profile card */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 space-y-4">
          <h2 className="text-sm font-medium text-zinc-300">Your Account</h2>
          <div className="space-y-3 text-sm">
            <Row label="Name" value={me.displayName} />
            <Row label="Email" value={me.email} />
            <Row label="Location" value={me.city ?? 'Not set'} />
          </div>
        </div>

        {/* Telegram link card */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-300">Telegram Alerts</h2>
            {me.telegramLinked ? (
              <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">Linked</span>
            ) : (
              <span className="text-xs text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full">Not linked</span>
            )}
          </div>

          {me.telegramLinked ? (
            <p className="text-sm text-zinc-500">
              Your Telegram is linked. Once approved, alerts will be sent automatically every hour.
              {me.city && ` Alerts for: ${me.city}.`}
            </p>
          ) : (
            <>
              <p className="text-sm text-zinc-500">
                Link your Telegram account to receive automated weather alerts once you're approved.
              </p>
              {telegramLink && (
                <a
                  href={telegramLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#229ED9] text-white text-sm font-medium hover:bg-[#1a8bbf] transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm4.64 6.8-1.7 8.02c-.12.56-.46.7-.93.43l-2.57-1.89-1.24 1.19c-.14.14-.25.25-.52.25l.18-2.6 4.74-4.28c.21-.18-.04-.28-.31-.1L7.97 14.4l-2.53-.79c-.55-.17-.56-.55.12-.81l9.87-3.8c.46-.17.86.11.21.8Z"/>
                  </svg>
                  Open Telegram to Link
                </a>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-200">{value}</span>
    </div>
  );
}
