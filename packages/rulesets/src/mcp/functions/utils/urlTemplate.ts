const TEMPLATE_VARIABLE = /{([^{}]+)}/g;

/** Returns the names of all `{variable}` placeholders used in a URL template. */
export function getTemplateVariables(url: string): string[] {
  return Array.from(url.matchAll(TEMPLATE_VARIABLE), match => match[1]);
}

/**
 * Replaces `{variable}` placeholders with sample values so the URL can be checked for validity.
 * Mirrors the substitution performed by the MCP registry before parsing templated URLs.
 */
export function substituteTemplateVariables(url: string): string {
  return url
    .replace(/:{[^{}]+}/g, ':8080')
    .replace(/{host}/g, 'example.com')
    .replace(/{port}/g, '8080')
    .replace(TEMPLATE_VARIABLE, 'placeholder');
}

export function parseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function isLocalhost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host.endsWith('.localhost');
}

const UNSAFE_URL_CHARACTERS = /["'<>\s]/;

/** True when the value is an absolute https URL without characters the registry rejects. */
export function isSafeHttpsUrl(value: string): boolean {
  if (UNSAFE_URL_CHARACTERS.test(value)) return false;
  const url = parseUrl(value);
  return url !== null && url.protocol === 'https:' && url.hostname.length > 0;
}
