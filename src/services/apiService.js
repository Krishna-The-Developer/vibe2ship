const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

// List of public endpoints that do not require authentication headers
const PUBLIC_ENDPOINTS = [
  '/api/tasks/urgent-tasks',
  '/api/tasks/urgent',
  '/health',
  '/'
];

function isPublicEndpoint(endpoint) {
  return PUBLIC_ENDPOINTS.some(pub => endpoint === pub || endpoint.startsWith(pub + '/'));
}

export async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Only append Authorization header if the endpoint is NOT public
  if (!isPublicEndpoint(endpoint)) {
    const token = localStorage.getItem('token') || 'mock-auth-token-123';
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`apiFetch failed for ${endpoint}:`, error);
    throw error;
  }
}

export async function getUrgentTasks() {
  return apiFetch('/api/tasks/urgent-tasks');
}
