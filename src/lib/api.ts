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
  login:       (secret: string) => req<AdminLoginResult>('/admin/auth', { method: 'POST', body: JSON.stringify({ secret }) }),
  loginWithPassword: (email: string, password: string) => req<AdminLoginResult>('/admin/auth', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout:      () => req<void>('/admin/auth/logout', { method: 'POST' }),
  me:          () => req<AdminIdentity>('/admin/me'),

  // Admin accounts (superadmin only)
  admins:       () => req<{ admins: AdminAccount[] }>('/admin/admins'),
  createAdmin:  (data: { email: string; password: string; name: string; role: string }) =>
    req<AdminAccount>('/admin/admins', { method: 'POST', body: JSON.stringify(data) }),
  updateAdmin:  (id: string, data: { role?: string; active?: boolean; password?: string }) =>
    req<AdminAccount>(`/admin/admins/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAdmin:  (id: string) => req<void>(`/admin/admins/${id}`, { method: 'DELETE' }),

  // Stats
  stats: () => req<AdminStats>('/admin/stats'),

  // Growth
  growth: () => req<GrowthData>('/admin/growth'),

  // MRR history
  mrrHistory: () => req<MrrHistory>('/admin/mrr-history'),

  // Reports
  reports: () => req<ReportsData>('/admin/reports'),

  // Users
  users: (p?: Record<string, string>) => {
    const qs = p ? '?' + new URLSearchParams(p).toString() : ''
    return req<UsersPage>(`/admin/users${qs}`)
  },
  user:         (id: string) => req<UserDetail>(`/admin/users/${id}`),
  setManualPro: (id: string, duration: '3m' | '6m' | '12m' | 'lifetime', reason: string) =>
    req(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ plan: 'PRO', duration, reason }) }),
  setManualProPlus: (id: string, duration: '3m' | '6m' | '12m' | 'lifetime', reason: string) =>
    req(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ plan: 'PRO_PLUS', duration, reason }) }),
  setPlanFree:  (id: string) =>
    req(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ plan: 'FREE' }) }),
  setPlanPro:   (id: string) =>
    req(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ plan: 'PRO' }) }),
  setAdmin:     (id: string, isAdmin: boolean) =>
    req(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ isAdmin }) }),
  deleteUser:      (id: string) => req(`/admin/users/${id}`, { method: 'DELETE' }),
  updateAdminNotes:(id: string, adminNotes: string) =>
    req(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ adminNotes }) }),
  exportUsers:  () => { window.open('/api/proxy/admin/users/export', '_blank') },
  sendEmail:    (userId: string, subject: string, message: string) =>
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

  // Push broadcast
  pushBroadcast: (title: string, body: string, audience: 'all' | 'pro' | 'pro_plus', screen?: string) =>
    req<{ sent: number; total: number }>('/admin/push-broadcast', {
      method: 'POST', body: JSON.stringify({ title, body, audience, screen }),
    }),

  // App settings
  getSettings:    () => req<AppSettings>('/admin/app-settings'),
  updateSetting:  (key: string, value: string) =>
    req<{ key: string; value: string }>('/admin/app-settings', { method: 'PATCH', body: JSON.stringify({ key, value }) }),

  // Impersonation
  impersonate: (userId: string) =>
    req<{ url: string; user: { id: string; name: string; email: string } }>('/admin/impersonate', {
      method: 'POST', body: JSON.stringify({ userId }),
    }),

  // Bulk email
  bulkEmail: (userIds: string[], subject: string, message: string) =>
    req<{ sent: number; failed: number; total: number }>('/admin/users/bulk-email', {
      method: 'POST', body: JSON.stringify({ userIds, subject, message }),
    }),

  // Newsletter
  newsletter: (p?: Record<string, string>) => {
    const qs = p ? '?' + new URLSearchParams(p).toString() : ''
    return req<NewsletterPage>(`/admin/newsletter${qs}`)
  },
  newsletterToggle: (id: string, isActive: boolean) =>
    req<NewsletterSubscriber>(`/admin/newsletter`, { method: 'PATCH', body: JSON.stringify({ id, isActive }) }),
  newsletterDelete: (id: string) =>
    req(`/admin/newsletter`, { method: 'DELETE', body: JSON.stringify({ id }) }),

  // Email flows
  emailFlows: () => req<EmailFlowsData>('/admin/email-flows'),

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
  totalUsers: number; proUsers: number; freeUsers: number; proRate: number
  onlineUsers: number
  newToday: number; newThisWeek: number; newThisMonth: number
  totalTransactions: number; transactionsThisMonth: number; totalGoals: number
  // PRO breakdown
  proTotal: number; proStripe: number; proManual: number
  mrrPro: number; convPro: number; churnPro: number
  // PRO+ breakdown
  proPlusTotal: number; proPlusStripe: number; proPlusManual: number
  mrrProPlus: number; convProPlus: number; churnProPlus: number
  // Totals
  mrr: number; arr: number
  openFeedbackCount: number
  manualExpiringCount:  number
  growthVsLastMonth:    number | null
  recentFeedback: { id: string; type: string; title: string; createdAt: string; user: { name: string } }[]
  recentLogs:     AdminLog[]
  recentUsers:    { id: string; name: string; email: string; plan: string; createdAt: string }[]
  androidUsers:   number
  iosUsers:       number
  webOnlyUsers:   number
  emailDripStarted:    number
  emailDripCompleted:  number
  emailPromoSent:      number
  emailInactivitySent: number
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

export interface ReportsData {
  revenue: {
    month: string; stripeNew: number; manualNew: number
    mrrStripe: number; mrrManual: number; mrr: number
  }[]
  acquisition: { month: string; signups: number; newPro: number; conversionRate: number }[]
  churn:       { month: string; churn: number }[]
  usage: {
    topUsers: { id: string; name: string; email: string; txCount: number }[]
    avgTx:    number
    avgGoals: number
  }
  cohort: { cohortMonth: string; total: number; active30d: number; retentionRate: number }[]
  funnel: { totalUsers: number; onboarded: number; hasTransactions: number; hasGoals: number }
}

export interface ChatUsageData {
  month: { totalMessages: number; totalCostUsd: number; avgCostPerMessage: number; projectedCostUsd: number }
  daily: { date: string; web: number; whatsapp: number; costUsd: number }[]
  topUsers: { userId: string; name: string | null; email: string; plan: string; messages: number; costUsd: number }[]
}

export interface AdminLoginResult {
  token: string
  role?: 'support' | 'superadmin'
  email?: string
  name?: string
}

export interface AdminIdentity {
  email: string
  role:  'support' | 'superadmin'
}

export interface AdminAccount {
  id:          string
  email:       string
  name:        string
  role:        'support' | 'superadmin'
  active:      boolean
  lastLoginAt: string | null
  createdAt:   string
}

export interface WhatsAppLogItem {
  id:          string
  phone:       string
  direction:   'inbound' | 'outbound'
  status:      'received' | 'sent' | 'failed'
  messageType: string
  error:       string | null
  createdAt:   string
  user:        { id: string; name: string; email: string } | null
}

export interface WhatsAppLogsData {
  summary: { today: number; failureRate7d: number; activeUsers7d: number }
  items:   WhatsAppLogItem[]
  total:   number
  page:    number
  totalPages: number
}

export interface CronRun {
  id:         string
  name:       string
  status:     'success' | 'error'
  startedAt:  string
  finishedAt: string | null
  durationMs: number | null
  error:      string | null
  meta:       Record<string, unknown> | null
}

export interface CronRunsData {
  latest: { name: string; expectedEveryHours: number; lastRun: CronRun | null }[]
  items:  CronRun[]
  total:  number
  page:   number
  totalPages: number
}

export interface AppSettings {
  churn_alert_threshold: string
  admin_alert_email:     string
  [key: string]:         string
}

export interface AdminUser {
  id: string; name: string; email: string; plan: string; isAdmin: boolean
  createdAt: string; updatedAt: string; stripeSubscriptionId: string | null
  stripeCancelAtPeriodEnd?: boolean; stripeCurrentPeriodEnd?: string | null
  lastActiveAt: string | null
  proPlanExpiresAt: string | null; proPlanReason: string | null; adminNotes: string | null
  whatsappPhone?: string | null
  loginMethod?: 'google' | 'email'
  hasOnboarded?: boolean
  hasMobileApp?: boolean
  profileImage?: string | null
  bio?: string | null; city?: string | null; occupation?: string | null; birthdate?: string | null
  currency?: string; dateFormat?: string
  notifBillReminder?: boolean; notifCategoryLimit?: boolean; notifMonthlyEmail?: boolean
  chatUsageMonth?: string | null; chatUsageCount?: number
  scannerUsageMonth?: string | null; scannerUsageCount?: number
  _count: { transactions: number; goals: number; bills: number; budgets: number; people: number; incomeSources?: number; recurringBills?: number }
}

export interface AdminLog {
  id: string; action: string; targetId: string; details: string; createdAt: string; actorEmail?: string | null
}

export interface FinancialSummary {
  firstTransactionDate: string | null
  totalIncome: number
  totalExpense: number
}

export interface UserDetail {
  user:               AdminUser & { whatsappPhone?: string | null; stripeCustomerId?: string | null }
  recentTransactions: { id: string; type: string; amount: number; description: string | null; date: string; category: { name: string; icon: string } }[]
  logs:               AdminLog[]
  financialSummary?:  FinancialSummary
}

export interface UsersPage {
  users: AdminUser[]; total: number; page: number; totalPages: number
}

export interface SubscriptionEntry {
  id: string; name: string; email: string; plan: string; createdAt: string
  stripeSubId: string | null
  renewalDate: string | null
  cancelAtPeriodEnd: boolean
  hasStripe: boolean
  proPlanExpiresAt: string | null
  proPlanReason:    string | null
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

export interface BroadcastResult {
  sent: number; total: number
}

export interface EmailFlow {
  id: string; name: string; trigger: string; description: string
  sent: number | null; audience: string
  type: 'transactional' | 'lifecycle' | 'conversion' | 'reengagement' | 'marketing' | 'internal'
}

export interface EmailFlowsData {
  flows: EmailFlow[]
  totalUsers: number; freeUsers: number
  usersWithActivity: number; usersInactive7d: number
}

export interface NewsletterSubscriber {
  id: string; email: string; name: string | null; isActive: boolean
  unsubscribeToken: string; createdAt: string
}

export interface NewsletterPage {
  items: NewsletterSubscriber[]; total: number; activeCount: number
  page: number; totalPages: number
}
