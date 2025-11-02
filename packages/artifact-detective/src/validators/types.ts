export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export type ValidatorFunction = (content: string) => ValidationResult;
