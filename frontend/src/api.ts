const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  // Weather
  weather: (lat: number, lon: number) =>
    request<any>(`/weather?lat=${lat}&lon=${lon}`),

  // Brief
  morningBrief: (loc?: { lat: number; lon: number; label?: string }) =>
    request<any>('/brief/morning', {
      method: 'POST',
      // Only send body when valid coords are present; backend treats missing
      // body as no location (avoids 422 on partial/empty objects).
      ...(loc && typeof loc.lat === 'number' && typeof loc.lon === 'number'
        ? { body: JSON.stringify(loc) }
        : {}),
    }),
  eveningBrief: () => request<any>('/brief/evening'),

  // Flow
  flowDashboard: () => request<any>('/flow/dashboard'),

  // Priorities
  listPriorities: () => request<any>('/priorities'),
  createPriority: (body: { title: string; time?: string; category?: string }) =>
    request<any>('/priorities', { method: 'POST', body: JSON.stringify(body) }),
  updatePriority: (id: string, body: any) =>
    request<any>(`/priorities/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePriority: (id: string) =>
    request<any>(`/priorities/${id}`, { method: 'DELETE' }),

  // Expenses
  listExpenses: (date?: string) =>
    request<any>(`/expenses${date ? `?date=${date}` : ''}`),
  createExpense: (body: { amount: number; category: string; note?: string }) =>
    request<any>('/expenses', { method: 'POST', body: JSON.stringify(body) }),
  deleteExpense: (id: string) =>
    request<any>(`/expenses/${id}`, { method: 'DELETE' }),

  // Habits
  getHabits: () => request<any>('/habits'),
  addWater: () => request<any>('/habits/water', { method: 'POST' }),
  removeWater: () => request<any>('/habits/water/decrement', { method: 'POST' }),
  addFocus: (minutes: number) =>
    request<any>('/habits/focus', {
      method: 'POST',
      body: JSON.stringify({ minutes }),
    }),
  setEnergy: (rating: number) =>
    request<any>('/habits/energy', {
      method: 'PUT',
      body: JSON.stringify({ rating }),
    }),

  // Profile
  profile: () => request<any>('/profile'),
  updateProfile: (body: any) =>
    request<any>('/profile', { method: 'PUT', body: JSON.stringify(body) }),
  resetAll: () => request<any>('/profile/reset', { method: 'DELETE' }),

  // Chat
  chat: (session_id: string, message: string) =>
    request<any>('/chat', {
      method: 'POST',
      body: JSON.stringify({ session_id, message }),
    }),
  chatHistory: (session_id: string) =>
    request<any>(`/chat/history/${session_id}`),
  clearChat: (session_id: string) =>
    request<any>(`/chat/history/${session_id}`, { method: 'DELETE' }),
  chatSuggestions: () => request<any>('/chat/suggestions'),
};
