const FIELD_KEY_REGEX = /^(GEN|FIN|PROD|SUP|SALES|COMP|AI)_[a-z][a-z0-9_]*_v\d+$/;

export function validateFieldKey(key: string): void {
  if (!FIELD_KEY_REGEX.test(key)) {
    throw new Error(
      `Invalid field_key: "${key}". Must match {PREFIX}_{snake_case}_v{N} — e.g. FIN_mrr_v1`
    );
  }
}
