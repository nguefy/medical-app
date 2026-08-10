const API_URL = 'http://localhost:3001/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.error || data?.errors?.[0]?.msg || 'Erreur inconnue';
    throw new Error(message);
  }
  return data;
}

export const api = {
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getPatients: () => request('/patients'),
  createPatient: (patient) =>
    request('/patients', { method: 'POST', body: JSON.stringify(patient) }),
  deletePatient: (id) => request(`/patients/${id}`, { method: 'DELETE' }),
};
