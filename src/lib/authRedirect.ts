const DEFAULT_ALLOWED_ORIGINS = new Set([
  "http://localhost:8080",
  "http://127.0.0.1:8080",
]);

// OAuth state 검증은 Supabase SDK가 담당하고,
// 앱 코드는 redirect URL이 허용된 origin으로만 향하도록 제한한다.
function getAllowedOrigins(): Set<string> {
  const configuredOrigins = (import.meta.env.VITE_AUTH_REDIRECT_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins]);
}

export function getSafeRedirectUrl(path = "/"): string {
  const currentOrigin = window.location.origin;
  const allowedOrigins = getAllowedOrigins();

  if (!allowedOrigins.has(currentOrigin)) {
    throw new Error("허용되지 않은 인증 리다이렉트 origin이다.");
  }

  return new URL(path, currentOrigin).toString();
}
