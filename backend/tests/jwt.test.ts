import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import {
  generateToken,
  verifyToken,
  getJwtSecret,
  validateJwtPayload,
  isValidRole,
  JwtPayload,
  JsonWebTokenError,
  TokenExpiredError,
} from "../src/common/jwt";

describe("JWT Utilities (backend/src/common/jwt.ts)", () => {
  const TEST_SECRET = "unit-test-controlled-jwt-secret-key-32b";
  let originalSecret: string | undefined;

  beforeAll(() => {
    originalSecret = process.env.JWT_SECRET;
  });

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;
  });

  afterAll(() => {
    if (originalSecret !== undefined) {
      process.env.JWT_SECRET = originalSecret;
    } else {
      delete process.env.JWT_SECRET;
    }
  });

  describe("Successful Signing and Verification", () => {
    it("should generate and verify a token for a STUDENT role", () => {
      const payload: JwtPayload = {
        id: "student-uuid-123",
        email: "student@example.com",
        role: Role.STUDENT,
      };

      const token = generateToken(payload);
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3);

      const verified = verifyToken(token);
      expect(verified).toEqual(payload);
    });

    it("should generate and verify a token for a BUSINESS role", () => {
      const payload: JwtPayload = {
        id: "business-uuid-456",
        email: "business@example.com",
        role: Role.BUSINESS,
      };

      const token = generateToken(payload);
      const verified = verifyToken(token);
      expect(verified).toEqual(payload);
    });

    it("should generate and verify a token for an ADMIN role", () => {
      const payload: JwtPayload = {
        id: "admin-uuid-789",
        email: "admin@example.com",
        role: Role.ADMIN,
      };

      const token = generateToken(payload);
      const verified = verifyToken(token);
      expect(verified).toEqual(payload);
    });

    it("should default to 15 minutes expiration window", () => {
      const payload: JwtPayload = {
        id: "user-uuid-1",
        email: "user@example.com",
        role: Role.STUDENT,
      };

      const token = generateToken(payload);
      const decoded = jwt.decode(token) as { iat: number; exp: number };

      expect(decoded).toHaveProperty("iat");
      expect(decoded).toHaveProperty("exp");
      // 15 minutes = 900 seconds
      expect(decoded.exp - decoded.iat).toBe(900);
    });

    it("should allow configurable expiration time", () => {
      const payload: JwtPayload = {
        id: "user-uuid-2",
        email: "user2@example.com",
        role: Role.STUDENT,
      };

      const token = generateToken(payload, { expiresIn: "1h" });
      const decoded = jwt.decode(token) as { iat: number; exp: number };

      // 1 hour = 3600 seconds
      expect(decoded.exp - decoded.iat).toBe(3600);
    });
  });

  describe("Expired Tokens", () => {
    it("should throw TokenExpiredError when token is expired", () => {
      const payload: JwtPayload = {
        id: "expired-user-uuid",
        email: "expired@example.com",
        role: Role.STUDENT,
      };

      const token = generateToken(payload, { expiresIn: "0s" });

      expect(() => verifyToken(token)).toThrow(TokenExpiredError);
      expect(() => verifyToken(token)).toThrow("jwt expired");
    });
  });

  describe("Invalid Tokens & Signatures", () => {
    it("should throw JsonWebTokenError when token was signed with a different secret", () => {
      const payload: JwtPayload = {
        id: "diff-secret-user",
        email: "diff@example.com",
        role: Role.STUDENT,
      };

      const differentSecret = "different-unauthorized-secret-999";
      const forgedToken = jwt.sign(payload, differentSecret, { expiresIn: "15m" });

      expect(() => verifyToken(forgedToken)).toThrow(JsonWebTokenError);
      expect(() => verifyToken(forgedToken)).toThrow("invalid signature");
    });

    it("should throw JsonWebTokenError when token signature is tampered with", () => {
      const payload: JwtPayload = {
        id: "tampered-user",
        email: "tampered@example.com",
        role: Role.STUDENT,
      };

      const token = generateToken(payload);
      const tamperedToken = token.slice(0, -5) + "abcde";

      expect(() => verifyToken(tamperedToken)).toThrow(JsonWebTokenError);
      expect(() => verifyToken(tamperedToken)).toThrow("invalid signature");
    });

    it("should throw JsonWebTokenError for malformed strings", () => {
      expect(() => verifyToken("not-a-valid-jwt")).toThrow(JsonWebTokenError);
      expect(() => verifyToken("part1.part2")).toThrow(JsonWebTokenError);
    });

    it("should throw an error for empty or non-string tokens", () => {
      expect(() => verifyToken("")).toThrow("Token must be a non-empty string");
      expect(() => verifyToken("   ")).toThrow("Token must be a non-empty string");
    });
  });

  describe("Malformed Claims & Payload Validation", () => {
    it("should reject generateToken when id is missing or empty", () => {
      const badPayload = {
        id: "",
        email: "bad@example.com",
        role: Role.STUDENT,
      } as JwtPayload;

      expect(() => generateToken(badPayload)).toThrow("Invalid token payload: missing or invalid 'id'");
    });

    it("should reject generateToken when email is missing or empty", () => {
      const badPayload = {
        id: "valid-id",
        email: "",
        role: Role.STUDENT,
      } as JwtPayload;

      expect(() => generateToken(badPayload)).toThrow("Invalid token payload: missing or invalid 'email'");
    });

    it("should reject generateToken when role is not a valid Role enum", () => {
      const badPayload = {
        id: "valid-id",
        email: "user@example.com",
        role: "INVALID_ROLE" as unknown as Role,
      };

      expect(() => generateToken(badPayload)).toThrow("Invalid token payload: missing or invalid 'role'");
    });

    it("should reject verifyToken when valid signature token has malformed id", () => {
      const forgedClaims = { email: "test@example.com", role: Role.STUDENT };
      const token = jwt.sign(forgedClaims, TEST_SECRET);

      expect(() => verifyToken(token)).toThrow("Invalid token payload: missing or invalid 'id'");
    });

    it("should reject verifyToken when valid signature token has malformed role", () => {
      const forgedClaims = { id: "some-id", email: "test@example.com", role: "SUPER_ADMIN" };
      const token = jwt.sign(forgedClaims, TEST_SECRET);

      expect(() => verifyToken(token)).toThrow("Invalid token payload: missing or invalid 'role'");
    });

    it("should reject verifyToken when decoded claims are a primitive string", () => {
      const token = jwt.sign("just-a-plain-string", TEST_SECRET);

      expect(() => verifyToken(token)).toThrow("Invalid token payload: expected an object");
    });

    it("isValidRole should accurately check enum membership", () => {
      expect(isValidRole(Role.STUDENT)).toBe(true);
      expect(isValidRole(Role.BUSINESS)).toBe(true);
      expect(isValidRole(Role.ADMIN)).toBe(true);
      expect(isValidRole("student")).toBe(false); // must be uppercase enum
      expect(isValidRole("UNKNOWN")).toBe(false);
      expect(isValidRole(null)).toBe(false);
      expect(isValidRole(123)).toBe(false);
    });

    it("validateJwtPayload should reject null or non-object values", () => {
      expect(() => validateJwtPayload(null)).toThrow("Invalid token payload: expected an object");
      expect(() => validateJwtPayload(12345)).toThrow("Invalid token payload: expected an object");
    });
  });

  describe("Missing or Empty JWT_SECRET Behavior", () => {
    it("should throw when process.env.JWT_SECRET is undefined", () => {
      delete process.env.JWT_SECRET;

      expect(() => getJwtSecret()).toThrow("JWT_SECRET is not configured or is empty");

      const payload: JwtPayload = {
        id: "u-1",
        email: "test@example.com",
        role: Role.STUDENT,
      };

      expect(() => generateToken(payload)).toThrow("JWT_SECRET is not configured or is empty");
      expect(() => verifyToken("any.token.here")).toThrow("JWT_SECRET is not configured or is empty");
    });

    it("should throw when process.env.JWT_SECRET is empty string", () => {
      process.env.JWT_SECRET = "";

      expect(() => getJwtSecret()).toThrow("JWT_SECRET is not configured or is empty");

      const payload: JwtPayload = {
        id: "u-1",
        email: "test@example.com",
        role: Role.STUDENT,
      };

      expect(() => generateToken(payload)).toThrow("JWT_SECRET is not configured or is empty");
      expect(() => verifyToken("any.token.here")).toThrow("JWT_SECRET is not configured or is empty");
    });

    it("should throw when process.env.JWT_SECRET is only whitespace", () => {
      process.env.JWT_SECRET = "   ";

      expect(() => getJwtSecret()).toThrow("JWT_SECRET is not configured or is empty");
    });
  });
});
