import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAdminMe } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface User {
  _id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  status: 'pending' | 'approved' | 'rejected';
  provider: 'google' | 'github';
  telegramChatId: string | null;
  city: string | null;
  createdAt: string;
}

type Filter = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_PILL: Record<string, string> = {
  pending: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  approved: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  rejected: 'bg-red-400/10 text-red-400 border-red-400/20',
};

export default function AdminDashboard() {
  const { data: me, isLoading: meLoading } = useAdminMe();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [dispatchMsg, setDispatchMsg] = useState('');

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get<User[]>('/admin/users', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      return res.data;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/users/${id}/status`, { status }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['admin-users'] });
      const previous = qc.getQueryData<User[]>(['admin-users']);
      qc.setQueryData<User[]>(['admin-users'], (old) =>
        old?.map((u) => u._id === id ? { ...u, status: status as User['status'] } : u) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['admin-users'], context.previous);
    },
    onSuccess: (_data, { id, status }) => {
      // Directly update cache with confirmed data — no refetch
      qc.setQueryData<User[]>(['admin-users'], (old) =>
        old?.map((u) => u._id === id ? { ...u, status: status as User['status'] } : u) ?? []
      );
    },
  });

  const dispatchAlerts = useMutation({
    mutationFn: () => api.post('/alerts/dispatch'),
    onSuccess: () => {
      setDispatchMsg('Alerts sent to all approved users!');
      setTimeout(() => setDispatchMsg(''), 3000);
    },
  });

  function logout() {
    localStorage.removeItem('wg_token');
    navigate('/login');
  }

  if (meLoading) {
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

  const filtered = filter === 'all' ? users : users.filter((u) => u.status === filter);
  const pendingCount = users.filter((u) => u.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white">
      {/* Nav */}
      <nav className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 3C7.5 3 4 6.36 4 10.5c0 2.18.92 4.14 2.4 5.54L12 21l5.6-4.96A7.37 7.37 0 0 0 20 10.5C20 6.36 16.5 3 12 3Z" fill="#6366f1" opacity=".4"/>
              <path d="M12 7a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" fill="#6366f1"/>
            </svg>
          </div>
          <span className="font-semibold text-sm">WeatherGuard</span>
          <span className="text-xs text-zinc-600 bg-white/5 px-2 py-0.5 rounded-full">Admin</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Manual dispatch button */}
          <button
            onClick={() => dispatchAlerts.mutate()}
            disabled={dispatchAlerts.isPending}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7Z"/>
            </svg>
            {dispatchAlerts.isPending ? 'Sending…' : 'Send Alerts Now'}
          </button>

          <div className="flex items-center gap-2">
            {me.avatarUrl && <img src={me.avatarUrl} alt="" className="w-7 h-7 rounded-full" />}
            <span className="text-sm text-zinc-400">{me.displayName}</span>
          </div>
          <button onClick={logout} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            Sign out
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-semibold">Access Requests</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {pendingCount > 0
                ? `${pendingCount} request${pendingCount > 1 ? 's' : ''} waiting for review`
                : 'All requests have been reviewed'}
            </p>
          </div>

          {dispatchMsg && (
            <span className="text-xs text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-lg border border-emerald-400/20">
              ✓ {dispatchMsg}
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {(['pending', 'approved', 'rejected'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(filter === s ? 'all' : s)}
              className={`rounded-xl border p-4 text-left transition-all ${
                filter === s ? STATUS_PILL[s] + ' border-current' : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
            >
              <p className="text-2xl font-semibold">{users.filter((u) => u.status === s).length}</p>
              <p className="text-xs text-zinc-500 mt-1 capitalize">{s}</p>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-zinc-600 text-sm">
              No {filter === 'all' ? '' : filter} users yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500">User</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500">Provider</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500">Telegram</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500">Requested</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user, i) => (
                  <tr
                    key={user._id}
                    className={`border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors ${
                      i % 2 === 0 ? '' : 'bg-white/[0.01]'
                    }`}
                  >
                    {/* User */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold flex-shrink-0">
                            {user.displayName[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">{user.displayName}</p>
                          <p className="text-zinc-500 text-xs truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Provider */}
                    <td className="px-5 py-4">
                      <span className="text-xs text-zinc-400 capitalize">{user.provider}</span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex text-xs px-2 py-0.5 rounded-full border ${STATUS_PILL[user.status]}`}>
                        {user.status}
                      </span>
                    </td>

                    {/* Telegram */}
                    <td className="px-5 py-4">
                      {user.telegramChatId ? (
                        <span className="text-xs text-emerald-400">✓ Linked</span>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 text-zinc-500 text-xs">
                      {new Date(user.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {user.status !== 'approved' && (
                          <button
                            onClick={() => updateStatus.mutate({ id: user._id, status: 'approved' })}
                            disabled={updateStatus.isPending}
                            className="px-3 py-1 rounded-lg text-xs font-medium bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 transition-colors disabled:opacity-50"
                          >
                            Approve
                          </button>
                        )}
                        {user.status !== 'rejected' && (
                          <button
                            onClick={() => updateStatus.mutate({ id: user._id, status: 'rejected' })}
                            disabled={updateStatus.isPending}
                            className="px-3 py-1 rounded-lg text-xs font-medium bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20 transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                        )}
                        {user.status === 'approved' && user.status !== 'rejected' && (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}