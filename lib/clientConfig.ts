export const BACKEND_API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL ?? "http://127.0.0.1:4000";

export function buildBackendUrl(path: string) {
  return `${BACKEND_API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
