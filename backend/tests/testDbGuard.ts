/**
 * Test Database Safety Guard
 *
 * Enforces strict isolation for integration tests, guaranteeing tests
 * connect exclusively to 'furan_test'. Prevents accidental data corruption
 * or deletion in development ('furan') or production databases.
 */

const ALLOWED_TEST_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "mysql",
  "furan-mysql",
]);

export function validateTestDatabaseUrl(rawUrl: string | undefined): void {
  if (!rawUrl || typeof rawUrl !== "string" || rawUrl.trim() === "") {
    throw new Error(
      "[DATABASE SAFETY GUARD] FATAL: DATABASE_URL is missing or empty. " +
        "Integration tests require a dedicated 'furan_test' database. " +
        "Configure backend/.env.test (see backend/.env.test.example) or supply a valid DATABASE_URL."
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(
      "[DATABASE SAFETY GUARD] FATAL: DATABASE_URL is malformed. " +
        "Unable to parse database connection URL safely."
    );
  }

  if (parsed.protocol !== "mysql:") {
    throw new Error(
      `[DATABASE SAFETY GUARD] FATAL: Unsupported database protocol '${parsed.protocol}'. ` +
        "Integration tests require a 'mysql:' database."
    );
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!ALLOWED_TEST_HOSTS.has(hostname)) {
    throw new Error(
      `[DATABASE SAFETY GUARD] FATAL: Tests cannot connect to host '${hostname}'. ` +
        "Integration tests are restricted to local or containerized test hosts (e.g. localhost, 127.0.0.1)."
    );
  }

  // Extract database name from pathname (e.g. "/furan_test" -> "furan_test")
  const rawPath = parsed.pathname.replace(/^\/+/, "");
  const dbName = rawPath.split("/")[0].split("?")[0].trim();

  if (!dbName) {
    throw new Error(
      "[DATABASE SAFETY GUARD] FATAL: DATABASE_URL does not specify a database name. " +
        "Integration tests require database 'furan_test'."
    );
  }

  if (dbName !== "furan_test") {
    throw new Error(
      `[DATABASE SAFETY GUARD] FATAL: Safety guard blocked test execution. ` +
        `Tests are restricted exclusively to 'furan_test'. Attempted to target database '${dbName}'. ` +
        "Execution halted to prevent data loss or development database corruption."
    );
  }
}
