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
  morningBrief: () => request<any>('/brief/morning'),
  eveningBrief: () => request<any>('/brief/evening'),
  flowDashboard: () => request<any>('/flow/dashboard'),
  profile: () => request<any>('/profile'),
  updateProfile: (body: any) =>
    request<any>('/profile', { method: 'PUT', body: JSON.stringify(body) }),
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
