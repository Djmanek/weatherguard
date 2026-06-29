import { Navigate } from 'react-router-dom';
import { useAdminMe, useMe } from '../hooks/useAuth';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useMe();
  if (isLoading) return <Spinner />;
  if (isError || !data) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useAdminMe();
  if (isLoading) return <Spinner />;
  if (isError || !data) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f13]">
      <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
