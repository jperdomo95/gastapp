// Single access point for Vite build-time env vars: components import these
// constants instead of reading import.meta.env directly.
// `||` (not `??`): Docker builds without the ARG bake in an empty string.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export const API_BASE = `${API_URL}/api`;
export const GOOGLE_AUTH_ENABLED = import.meta.env.VITE_ENABLE_GOOGLE !== 'false';
