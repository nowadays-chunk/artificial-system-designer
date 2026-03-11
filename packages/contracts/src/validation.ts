export type ValidationResult =
  | { ok: true; errors: [] }
  | { ok: false; errors: string[] };

type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function isStringRecord(value: unknown): value is Record<string, string> {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every(isString);
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

export function mergeValidationErrors(...errors: string[][]): ValidationResult {
  const flattened = errors.flat();
  if (flattened.length > 0) {
    return { ok: false, errors: flattened };
  }

  return { ok: true, errors: [] };
}

