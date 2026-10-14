// PetKind -> PET_KIND, HTTPStatus -> HTTP_STATUS, v2Thing -> V2_THING
export function toUpperSnakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toUpperCase();
}

// .acme.pets.v1.GetPetRequest -> GetPetRequest
export function lastSegment(type: string): string {
  return type.slice(type.lastIndexOf('.') + 1);
}

// Whether a number falls in one of the given (inclusive) reserved ranges, e.g. `reserved 2, 5 to 9, 100 to max;`
export function inReservedRange(value: number, ranges: { start: number; end: number | 'max' }[]): boolean {
  return ranges.some(({ start, end }) => value >= start && (end === 'max' || value <= end));
}
