// Proxy via Next.js rewrite (avoids CORS + same-domain cookie)
async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/proxy${path}`, {
    ...opts,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opts.headers },
  })
  // Handle expired/invalid session — redirect to login
  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Sessão expirada')
  }
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

  // Growth
  growth: () => req<GrowthData>('/admin/growth'),

  // MRR history
  mrrHistory: () => req<MrrHistory>('/admin/mrr-history'),

  // Users
  users: (p?: Record<string, string>) => {
    const qs = p ? '?' + new URLSearchParams(p).toString() : ''
    return req<UsersPage>(`/admin/users${qs}`)
  },
  user:       (id: string) => req<UserDetail>(`/admin/users/${id}`),
  setPlan:    (id: string, plan: 'FREE' | 'PRO') => req(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ plan }) }),
  setAdmin:   (id: string, isAdmin: boolean)     => req(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ isAdmin }) }),
  deleteUser:  (id: string)                        => req(`/admin/users/${id}`, { method: 'DELETE' }),
  exportUsers: () => { window.open('/api/proxy/admin/users/export', '_blank') },
  sendEmail:  (userId: string, subject: string, message: string) =>
    req<{ message: string }>('/admin/users/email', { method: 'POST', body: JSON.stringify({ userId, subject, message }) }),

  // Subscriptions (PRO with Stripe renewal dates)
  subscriptions: () => req<SubscriptionsData>('/admin/subscriptions'),

  // Feedback
  feedback: (p?: Record<string, string>) => {
    const qs = p ? '?' + new URLSearchParams(p).toString() : ''
    return req<FeedbackPage>(`/admin/feedback${qs}`)
  },
  setFeedbackStatus: (id: string, status: string) =>
    req(`/admin/feedback/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Admin logs
  logs: (p?: Record<string, string>) => {
    const qs = p ? '?' + new URLSearchParams(p).toString() : ''
    return req<LogsPage>(`/admin/logs${qs}`)
  },

  // Default categories
  categories: () => req<DefaultCategory[]>('/admin/categories'),
  createCategory: (data: { name: string; icon: string; color: string }) =>
    req<DefaultCategory>('/admin/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: { name: string; icon: string; color: string }) =>
    req<DefaultCategory>(`/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCategory: (id: string) =>
    req(`/admin/categories/${id}`, { method: 'DELETE' }),
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number; proUsers: number; proManual: number; freeUsers: number; proRate: number
  newToday: number; newThisWeek: number; newThisMonth: number
  totalTransactions: number; transactionsThisMonth: number; totalGoals: number
  mrr: number; arr: number
  openFeedbackCount: number
  newProThisMonth:     number
  churnThisMonth:      number
  growthVsLastMonth:   number | null
  recentFeedback: { id: string; type: string; title: string; createdAt: string; user: { name: string } }[]
  recentLogs:     AdminLog[]
  recentUsers:    { id: string; name: string; email: string; plan: string; createdAt: string }[]
}

export interface GrowthData {
  daily:   { date: string; count: number }[]
  monthly: { month: string; count: number }[]
}

export interface MrrHistory {
  monthly:    { month: string; newPro: number; mrr: number }[]
  currentPro: number
  currentMrr: number
  currentArr: number
  proRate:    number
}

export interface AdminUser {
  id: string; name: string; email: string; plan: string; isAdmin: boolean
  createdAt: string; updatedAt: string; stripeSubscriptionId: string | null
  _count: { transactions: number; goals: number; bills: number; budgets: number; people: number }
}

export interface AdminLog {
  id: string; action: string; targetId: string; details: string; createdAt: string
}

export interface UserDetail {
  user:               AdminUser & { whatsappPhone?: string | null; stripeCustomerId?: string | null }
  recentTransactions: { id: string; type: string; amount: number; description: string | null; date: string; category: { name: string; icon: string } }[]
  logs:               AdminLog[]
}

export interface UsersPage {
  users: AdminUser[]; total: number; page: number; totalPages: number
}

export interface SubscriptionEntry {
  id: string; name: string; email: string; createdAt: string
  stripeSubId: string | null
  renewalDate: string | null
  cancelAtPeriodEnd: boolean
  hasStripe: boolean
}

export interface SubscriptionsData {
  subscriptions: SubscriptionEntry[]
  total: number
}

export interface DefaultCategory {
  id: string; name: string; icon: string; color: string
}

export interface FeedbackItem {
  id: string; type: string; title: string; body: string; status: string; createdAt: string
  imageData?: string | null
  user: { id: string; name: string; email: string }
}

export interface FeedbackPage {
  items: FeedbackItem[]; total: number; page: number; totalPages: number
}

export interface LogsPage {
  items: AdminLog[]; total: number; page: number; totalPages: number
}
