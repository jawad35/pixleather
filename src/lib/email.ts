import { SITE } from "./config";

function buildMailto(subject: string, body: string) {
  return `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function openEmail(subject: string, body: string) {
  if (typeof window !== "undefined") window.location.href = buildMailto(subject, body);
}
