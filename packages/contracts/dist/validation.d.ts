export type ValidationResult = {
    ok: true;
    errors: [];
} | {
    ok: false;
    errors: string[];
};
type UnknownRecord = Record<string, unknown>;
export declare function isRecord(value: unknown): value is UnknownRecord;
export declare function isString(value: unknown): value is string;
export declare function isNumber(value: unknown): value is number;
export declare function isBoolean(value: unknown): value is boolean;
export declare function isStringRecord(value: unknown): value is Record<string, string>;
export declare function isStringArray(value: unknown): value is string[];
export declare function mergeValidationErrors(...errors: string[][]): ValidationResult;
export {};
