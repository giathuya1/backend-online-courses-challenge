// src/validators/common.validator.ts
// Reusable validation primitives — zero dependencies on Express

export interface ValidationViolation {
  field: string;
  rule: string;
  message: string;
}

// ─── Primitive checkers ───────────────────────────────────────────────────────

export const isString  = (v: unknown): v is string  => typeof v === 'string';
export const isNumber  = (v: unknown): v is number  => typeof v === 'number' && Number.isFinite(v);
export const isArray   = (v: unknown): v is unknown[] => Array.isArray(v);

export const isValidEmail = (email: unknown): boolean =>
  isString(email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export const isValidDate = (d: unknown): boolean =>
  isString(d) && !isNaN(Date.parse(d));

export const isNonEmptyString = (v: unknown): v is string =>
  isString(v) && v.trim().length > 0;

// ─── Field-level rule builders ────────────────────────────────────────────────

type Builder = (violations: ValidationViolation[], value: unknown, field: string) => void;

export const required: Builder = (v, value, field) => {
  if (value === undefined || value === null || value === '')
    v.push({ field, rule: 'required', message: `${field} is required` });
};

export const minLength = (min: number): Builder => (v, value, field) => {
  if (isString(value) && value.trim().length < min)
    v.push({ field, rule: 'minLength', message: `${field} must be at least ${min} characters` });
};

export const maxLength = (max: number): Builder => (v, value, field) => {
  if (isString(value) && value.trim().length > max)
    v.push({ field, rule: 'maxLength', message: `${field} must be at most ${max} characters` });
};

export const emailRule: Builder = (v, value, field) => {
  if (value !== undefined && !isValidEmail(value))
    v.push({ field, rule: 'email', message: `${field} must be a valid email address` });
};

export const enumRule = (allowed: string[]): Builder => (v, value, field) => {
  if (value !== undefined && !allowed.includes(value as string))
    v.push({ field, rule: 'enum', message: `${field} must be one of: ${allowed.join(', ')}` });
};

export const positiveInt: Builder = (v, value, field) => {
  if (value !== undefined && (!Number.isInteger(value) || (value as number) <= 0))
    v.push({ field, rule: 'positiveInt', message: `${field} must be a positive integer` });
};

export const dateRule: Builder = (v, value, field) => {
  if (value !== undefined && !isValidDate(value))
    v.push({ field, rule: 'date', message: `${field} must be a valid ISO date string` });
};

// ─── Pagination helper ────────────────────────────────────────────────────────

export const validPagination = (page: number, limit: number): ValidationViolation[] => {
  const v: ValidationViolation[] = [];
  if (!Number.isInteger(page)  || page  < 1)  v.push({ field: 'page',  rule: 'min', message: 'page must be >= 1' });
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    v.push({ field: 'limit', rule: 'range', message: 'limit must be between 1 and 100' });
  return v;
};

// ─── Fluent builder  ──────────────────────────────────────────────────────────
// Usage:
//   const v = new FieldValidator(body.email, 'email').required().email().violations;

export class FieldValidator {
  public violations: ValidationViolation[] = [];
  constructor(private value: unknown, private field: string) {}

  required() {
    if (this.value === undefined || this.value === null || this.value === '')
      this.violations.push({ field: this.field, rule: 'required', message: `${this.field} is required` });
    return this;
  }
  minLength(min: number) { minLength(min)(this.violations, this.value, this.field); return this; }
  maxLength(max: number) { maxLength(max)(this.violations, this.value, this.field); return this; }
  email()               { emailRule(this.violations, this.value, this.field);       return this; }
  enum(allowed: string[]) { enumRule(allowed)(this.violations, this.value, this.field); return this; }
  positiveInt()         { positiveInt(this.violations, this.value, this.field);     return this; }
  date()                { dateRule(this.violations, this.value, this.field);        return this; }
}