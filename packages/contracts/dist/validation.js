export function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function isString(value) {
    return typeof value === "string";
}
export function isNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}
export function isBoolean(value) {
    return typeof value === "boolean";
}
export function isStringRecord(value) {
    if (!isRecord(value)) {
        return false;
    }
    return Object.values(value).every(isString);
}
export function isStringArray(value) {
    return Array.isArray(value) && value.every(isString);
}
export function mergeValidationErrors(...errors) {
    const flattened = errors.flat();
    if (flattened.length > 0) {
        return { ok: false, errors: flattened };
    }
    return { ok: true, errors: [] };
}
