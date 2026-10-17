import { validateTestDatabaseUrl } from "./testDbGuard";

describe("Test Database Safety Guard (tests/testDbGuard.ts)", () => {
  describe("Missing or Empty Configuration", () => {
    it("should throw when DATABASE_URL is undefined", () => {
      expect(() => validateTestDatabaseUrl(undefined)).toThrow(
        "[DATABASE SAFETY GUARD] FATAL: DATABASE_URL is missing or empty"
      );
    });

    it("should throw when DATABASE_URL is empty string", () => {
      expect(() => validateTestDatabaseUrl("")).toThrow(
        "[DATABASE SAFETY GUARD] FATAL: DATABASE_URL is missing or empty"
      );
    });

    it("should throw when DATABASE_URL is only whitespace", () => {
      expect(() => validateTestDatabaseUrl("   ")).toThrow(
        "[DATABASE SAFETY GUARD] FATAL: DATABASE_URL is missing or empty"
      );
    });
  });

  describe("Malformed URL Formats", () => {
    it("should throw when URL cannot be parsed", () => {
      expect(() => validateTestDatabaseUrl("not-a-valid-connection-string")).toThrow(
        "[DATABASE SAFETY GUARD] FATAL: DATABASE_URL is malformed"
      );
    });

    it("should throw when protocol is not mysql:", () => {
      expect(() =>
        validateTestDatabaseUrl("postgres://root:secret@localhost:5432/furan_test")
      ).toThrow("Unsupported database protocol 'postgres:'");

      expect(() =>
        validateTestDatabaseUrl("http://localhost:3306/furan_test")
      ).toThrow("Unsupported database protocol 'http:'");
    });

    it("should throw when database name is omitted", () => {
      expect(() =>
        validateTestDatabaseUrl("mysql://root:secret@localhost:3306")
      ).toThrow("DATABASE_URL does not specify a database name");

      expect(() =>
        validateTestDatabaseUrl("mysql://root:secret@localhost:3306/")
      ).toThrow("DATABASE_URL does not specify a database name");
    });
  });

  describe("Target Database Name Restrictions (Fail-Closed)", () => {
    it("should strictly reject the development database 'furan'", () => {
      expect(() =>
        validateTestDatabaseUrl("mysql://root:supersecret@localhost:3306/furan")
      ).toThrow(
        "Tests are restricted exclusively to 'furan_test'. Attempted to target database 'furan'"
      );
    });

    it("should strictly reject 'production'", () => {
      expect(() =>
        validateTestDatabaseUrl("mysql://admin:pw@localhost:3306/production")
      ).toThrow(
        "Tests are restricted exclusively to 'furan_test'. Attempted to target database 'production'"
      );
    });

    it("should strictly reject 'furan_dev' or other variations", () => {
      expect(() =>
        validateTestDatabaseUrl("mysql://root:pw@localhost:3306/furan_dev")
      ).toThrow(
        "Tests are restricted exclusively to 'furan_test'. Attempted to target database 'furan_dev'"
      );
    });
  });

  describe("Host Restrictions", () => {
    it("should reject unexpected remote hosts", () => {
      expect(() =>
        validateTestDatabaseUrl("mysql://root:pw@remote.rds.amazonaws.com:3306/furan_test")
      ).toThrow(
        "Tests cannot connect to host 'remote.rds.amazonaws.com'"
      );
    });
  });

  describe("Valid Test Database Targets", () => {
    it("should accept localhost with database furan_test", () => {
      expect(() =>
        validateTestDatabaseUrl("mysql://root:pw@localhost:3306/furan_test")
      ).not.toThrow();
    });

    it("should accept 127.0.0.1 with database furan_test", () => {
      expect(() =>
        validateTestDatabaseUrl("mysql://root:ci_pass@127.0.0.1:3306/furan_test")
      ).not.toThrow();
    });

    it("should accept container hosts like 'furan-mysql' or 'mysql'", () => {
      expect(() =>
        validateTestDatabaseUrl("mysql://root:pw@furan-mysql:3306/furan_test")
      ).not.toThrow();

      expect(() =>
        validateTestDatabaseUrl("mysql://root:pw@mysql:3306/furan_test")
      ).not.toThrow();
    });

    it("should accept connection string with query parameters on furan_test", () => {
      expect(() =>
        validateTestDatabaseUrl(
          "mysql://root:pw@localhost:3306/furan_test?connect_timeout=10&ssl=false"
        )
      ).not.toThrow();
    });
  });

  describe("Credential Privacy", () => {
    it("should NEVER include password or secret credentials in error messages", () => {
      const sensitivePassword = "SuperSensitivePassword987!";
      try {
        validateTestDatabaseUrl(
          `mysql://admin_user:${sensitivePassword}@localhost:3306/furan`
        );
        fail("Expected error was not thrown");
      } catch (err: unknown) {
        const message = (err as Error).message;
        expect(message).not.toContain(sensitivePassword);
        expect(message).not.toContain("admin_user");
        expect(message).toContain("furan");
      }
    });
  });
});
