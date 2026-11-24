import { isAxiosError } from 'axios';

/** A readable message for a failed API call: the server's own message when it sent one. */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;
    if (typeof message === 'string' && message) return message;
    if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
  }
  return fallback;
}
