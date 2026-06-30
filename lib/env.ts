/**
 * Validated access to environment variables. Throws a clear error when a
 * required variable is missing so misconfiguration fails fast (Constitution
 * Principle IV — secrets only from the environment).
 */
export function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}
