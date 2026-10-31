/**
 * Only allow same-origin, absolute-path redirects. This keeps `?next=` from
 * turning the auth flow into an open redirect.
 */
export function sanitizeNextPath(
  value: string | string[] | null | undefined,
  fallback = "/",
) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || typeof raw !== "string") {
    return fallback;
  }

  const path = raw.trim();
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    path.startsWith("/login") ||
    path.startsWith("/auth")
  ) {
    return fallback;
  }

  return path;
}
