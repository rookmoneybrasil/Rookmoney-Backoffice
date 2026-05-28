/**
 * API client para Rookmoney-Backoffice
 * Todas as chamadas vão para Rookmoney-API
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }

  const json = await res.json()
  return json.data as T
}

export const api = {
  // Admin Stats
  stats:   () => request<AdminStats>('/admin/stats'),

  // Admin Users
  users:   (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<UserListResponse>(`/admin/users${qs}`)
  },
  user:    (id: string) => request<AdminUser>(`/admin/users/${id}`),
  setPlan: (id: string, plan: 'FREE' | 'PRO') =>
    request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ plan }) }),
  setAdmin: (id: string, isAdmin: boolean) =>
    request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ isAdmin }) }),
  deleteUser: (id: string) =>
    request(`/admin/users/${id}`, { method: 'DELETE' }),
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers:        number
  proUsers:          number
  freeUsers:         number
  proRate:           number
  newThisMonth:      number
  totalTransactions: number
  mrr:               number
  arr:               number
}

export interface AdminUser {
  id:           string
  name:         string
  email:        string
  plan:         string
  isAdmin:      boolean
  createdAt:    string
  _count: {
    transactions: number
    goals:        number
    bills:        number
  }
}

export interface UserListResponse {
  users:      AdminUser[]
  total:      number
  page:       number
  totalPages: number
}
