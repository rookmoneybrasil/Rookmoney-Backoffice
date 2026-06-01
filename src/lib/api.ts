// Proxy via Next.js rewrite (avoids CORS + same-domain cookie)
async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/proxy${path}`, {
    ...opts,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opts.headers },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  const json = await res.json() as { data: T }
  return json.data
}

export const api = {
  // Auth
  login:  (secret: string) => req<{ token: string }>('/admin/auth', { method: 'POST', body: JSON.stringify({ secret }) }),
  logout: () => req<void>('/admin/auth/logout', { method: 'POST' }),

  // Stats
  stats: () => req<AdminStats>('/admin/stats'),

  // Users
  users: (p?: Record<string, string>) => {
    const qs = p ? '?' + new URLSearchParams(p).toString() : ''
    return req<UsersPage>(`/admin/users${qs}`)
  },
  user:       (id: string) => req<UserDetail>(`/admin/users/${id}`),
  setPlan:    (id: string, plan: 'FREE' | 'PRO') => req(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ plan }) }),
  setAdmin:   (id: string, isAdmin: boolean)     => req(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ isAdmin }) }),
  deleteUser: (id: string)                        => req(`/admin/users/${id}`, { method: 'DELETE' }),

  // Feedback
  feedback: (p?: Record<string, string>) => {
    const qs = p ? '?' + new URLSearchParams(p).toString() : ''
    return req<FeedbackPage>(`/admin/feedback${qs}`)
  },
  setFeedbackStatus: (id: string, status: string) =>
    req(`/admin/feedback/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number; proUsers: number; freeUsers: number; proRate: number
  newToday: number; newThisWeek: number; newThisMonth: number
  totalTransactions: number; transactionsThisMonth: number; totalGoals: number
  mrr: number; arr: number
  recentUsers: { id: string; name: string; email: string; plan: string; createdAt: string }[]
}

export interface AdminUser {
  id: string; name: string; email: string; plan: string; isAdmin: boolean
  createdAt: string; updatedAt: string
  _count: { transactions: number; goals: number; bills: number; budgets: number; people: number }
}

export interface UserDetail {
  user:               AdminUser & { whatsappPhone?: string | null; stripeCustomerId?: string | null }
  recentTransactions: { id: string; type: string; amount: number; description: string | null; date: string; category: { name: string; icon: string } }[]
}

export interface UsersPage {
  users: AdminUser[]; total: number; page: number; totalPages: number
}

export interface FeedbackItem {
  id: string; type: string; title: string; body: string; status: string; createdAt: string
  user: { id: string; name: string; email: string }
}

export interface FeedbackPage {
  items: FeedbackItem[]; total: number; page: number; totalPages: number
}
