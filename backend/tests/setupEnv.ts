import dotenv from "dotenv";
import path from "path";
import { validateTestDatabaseUrl } from "./testDbGuard";

// 1. Force NODE_ENV to "test"
process.env.NODE_ENV = "test";

// 2. Explicitly load backend/.env.test if it exists on disk.
// In CI environments (e.g. GitHub Actions), DATABASE_URL and JWT_SECRET are
// already present in process.env. dotenv.config() does not overwrite existing
// environment variables by default, which ensures CI configurations are preserved.
const envTestPath = path.resolve(__dirname, "../.env.test");
dotenv.config({ path: envTestPath, quiet: true });

// 3. Fallback for JWT_SECRET if not supplied in .env.test or process.env
// Guarantees an isolated test secret for unit/integration tests without leaking or reusing secrets
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test_environment_jwt_secret_key_32_bytes_min";
}

// 4. Execute the fail-fast database safety guard
// Ensures that before ANY test file runs or any Prisma connection is opened,
// DATABASE_URL is verified to strictly target 'furan_test'.
validateTestDatabaseUrl(process.env.DATABASE_URL);
