import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Me {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: 'user' | 'admin';
  status: 'pending' | 'approved' | 'rejected';
  telegramLinked: boolean;
  city: string | null;
}

export function useMe() {
  return useQuery<Me>({
    queryKey: ['me'],
    queryFn: async () => {
      const token = localStorage.getItem('wg_token');
      if (!token) throw new Error('No token');
      const res = await api.get<Me>('/users/me');
      return res.data;
    },
    retry: false,
  });
}

export function useAdminMe() {
  return useQuery<Me>({
    queryKey: ['admin-me'],
    queryFn: async () => {
      const res = await api.get<Me>('/admin/me');
      return res.data;
    },
    retry: false,
  });
}
