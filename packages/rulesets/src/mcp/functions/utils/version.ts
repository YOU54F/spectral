const VERSION_CORE = String.raw`v?\d+(?:\.\d+){0,3}(?:-[0-9A-Za-z.-]+)?`;

// The patterns below mirror the MCP registry's version range detection.
const COMPARATOR_RANGE = new RegExp(String.raw`^\s*(?:\^|~|>=|<=|>|<|=)\s*${VERSION_CORE}\s*$`);
const HYPHEN_RANGE = new RegExp(String.raw`^\s*${VERSION_CORE}\s-\s*${VERSION_CORE}\s*$`);
const OR_RANGE = new RegExp(String.raw`^\s*(?:${VERSION_CORE}\s*)(?:\|\|\s*${VERSION_CORE}\s*)+$`);
const DOTTED_VERSION_LIKE = /^\s*(?:v?\d+|x|X|\*)(?:\.(?:\d+|x|X|\*)){1,2}(?:-[0-9A-Za-z.-]+)?\s*$/;
const WILDCARD = /[xX*]/;

export function isVersionRange(version: string): boolean {
  const trimmed = version.trim();
  if (trimmed === '*' || trimmed.toLowerCase() === 'x') return true;
  if (COMPARATOR_RANGE.test(version) || HYPHEN_RANGE.test(version) || OR_RANGE.test(version)) return true;
  return DOTTED_VERSION_LIKE.test(version) && WILDCARD.test(version);
}

// https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
export const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
