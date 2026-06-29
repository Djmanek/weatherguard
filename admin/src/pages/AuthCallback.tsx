import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      navigate('/login');
      return;
    }

    localStorage.setItem('wg_token', token);
    // Drop the token from URL immediately
    window.history.replaceState({}, '', '/auth/callback');

    // Decide where to route based on role
    api.get('/admin/me')
      .then(() => navigate('/admin'))
      .catch(() =>
        api.get('/users/me')
          .then(() => navigate('/dashboard'))
          .catch(() => navigate('/login'))
      );
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f13]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-zinc-500">Signing you in…</p>
      </div>
    </div>
  );
}
