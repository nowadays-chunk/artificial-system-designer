"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRecord = isRecord;
exports.isString = isString;
exports.isNumber = isNumber;
exports.isBoolean = isBoolean;
exports.isStringRecord = isStringRecord;
exports.isStringArray = isStringArray;
exports.mergeValidationErrors = mergeValidationErrors;
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isString(value) {
    return typeof value === "string";
}
function isNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}
function isBoolean(value) {
    return typeof value === "boolean";
}
function isStringRecord(value) {
    if (!isRecord(value)) {
        return false;
    }
    return Object.values(value).every(isString);
}
function isStringArray(value) {
    return Array.isArray(value) && value.every(isString);
}
function mergeValidationErrors(...errors) {
    const flattened = errors.flat();
    if (flattened.length > 0) {
        return { ok: false, errors: flattened };
    }
    return { ok: true, errors: [] };
}
