// Thin client for the Spring Boot REST API.
// In development the Vite proxy forwards /api to the backend; in production set
// VITE_API_BASE_URL to the backend's origin.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status, fieldErrors = null) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(BASE_URL + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach the server. Check that the backend is running.", 0);
  }

  if (response.status === 204) return null;

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    // The backend returns RFC 7807 ProblemDetail bodies: { detail, errors? }
    throw new ApiError(data?.detail || `Request failed (${response.status})`, response.status, data?.errors);
  }
  return data;
}

const id = (value) => encodeURIComponent(value);

export const api = {
  // Employees
  listEmployees: () => request('/api/employees'),
  getEmployee: (employeeId) => request(`/api/employees/${id(employeeId)}`),
  createEmployee: (employee) => request('/api/employees', { method: 'POST', body: employee }),
  updateEmployee: (employeeId, employee) =>
    request(`/api/employees/${id(employeeId)}`, { method: 'PUT', body: employee }),
  messagesFor: (employeeId) => request(`/api/employees/${id(employeeId)}/messages`),
  pendingMessagesFor: (employeeId) => request(`/api/employees/${id(employeeId)}/messages/pending`),

  // Important messages
  listMessages: () => request('/api/messages'),
  getMessage: (messageId) => request(`/api/messages/${id(messageId)}`),
  createMessage: (message) => request('/api/messages', { method: 'POST', body: message }),
  updateMessage: (messageId, message) =>
    request(`/api/messages/${id(messageId)}`, { method: 'PUT', body: message }),
  deleteMessage: (messageId) => request(`/api/messages/${id(messageId)}`, { method: 'DELETE' }),
  acknowledge: (messageId, employeeId) =>
    request(`/api/messages/${id(messageId)}/acknowledgements/${id(employeeId)}`, { method: 'POST' }),
};
