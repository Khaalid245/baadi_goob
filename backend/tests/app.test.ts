import request from "supertest";
import { app } from "../src/app";
import { getAllowedOrigins } from "../src/common/cors";

describe("Application Endpoints & Base Behavior", () => {
  describe("GET /api/v1/health", () => {
    it("should return status 200 with { status: 'ok' }", async () => {
      const res = await request(app).get("/api/v1/health");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "ok" });
      expect(res.headers["content-type"]).toMatch(/application\/json/);
    });
  });

  describe("GET /api/docs", () => {
    it("should serve or redirect to Swagger documentation", async () => {
      const res = await request(app).get("/api/docs");
      // swagger-ui-express redirects /api/docs to /api/docs/ or returns 200
      expect([200, 301, 302]).toContain(res.status);
    });

    it("GET /api/docs/ should return 200 and include Swagger UI HTML", async () => {
      const res = await request(app).get("/api/docs/");
      expect(res.status).toBe(200);
      expect(res.text).toContain("swagger-ui");
    });
  });

  describe("Unknown Routes (404 Not Found)", () => {
    it("GET /api/v1/nonexistent should return 404 with standard error message", async () => {
      const res = await request(app).get("/api/v1/nonexistent");
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Route not found" });
    });

    it("POST /api/v1/nonexistent should return 404 with standard error message", async () => {
      const res = await request(app).post("/api/v1/nonexistent");
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Route not found" });
    });

    it("GET /unknown-root-path should return 404 with standard error message", async () => {
      const res = await request(app).get("/unknown-root-path");
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Route not found" });
    });
  });

  describe("JSON Syntax Error Handling", () => {
    it("should return 400 with 'Invalid JSON format' when receiving malformed JSON", async () => {
      const res = await request(app)
        .post("/api/v1/health")
        .set("Content-Type", "application/json")
        .send('{"broken_json": ');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Invalid JSON format" });
    });
  });

  describe("CORS Ingress Restriction (SRS Section B3.2)", () => {
    const originalFrontendUrl = process.env.FRONTEND_URL;
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.FRONTEND_URL = "http://localhost:5173";
      process.env.NODE_ENV = "test";
    });

    afterAll(() => {
      process.env.FRONTEND_URL = originalFrontendUrl;
      process.env.NODE_ENV = originalNodeEnv;
    });

    it("1. Allowed frontend origin should receive matching Access-Control-Allow-Origin without credentials", async () => {
      const res = await request(app)
        .get("/api/v1/health")
        .set("Origin", "http://localhost:5173");

      expect(res.status).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
      expect(res.headers["access-control-allow-credentials"]).toBeUndefined();
    });

    it("2. Disallowed origin should NOT receive Access-Control-Allow-Origin header", async () => {
      const res = await request(app)
        .get("/api/v1/health")
        .set("Origin", "http://malicious-unauthorized-website.com");

      expect(res.status).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    });

    it("3. Allowed-origin preflight OPTIONS should return status 204 with full CORS headers without credentials", async () => {
      const res = await request(app)
        .options("/api/v1/auth/login")
        .set("Origin", "http://localhost:5173")
        .set("Access-Control-Request-Method", "POST")
        .set("Access-Control-Request-Headers", "Content-Type,Authorization");

      expect(res.status).toBe(204);
      expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
      expect(res.headers["access-control-allow-methods"]).toMatch(/POST/);
      expect(res.headers["access-control-allow-headers"]).toMatch(/Content-Type/i);
      expect(res.headers["access-control-allow-headers"]).toMatch(/Authorization/i);
      expect(res.headers["access-control-allow-credentials"]).toBeUndefined();
    });

    it("4. Disallowed-origin preflight OPTIONS should NOT grant CORS access", async () => {
      const res = await request(app)
        .options("/api/v1/auth/login")
        .set("Origin", "http://malicious-unauthorized-website.com")
        .set("Access-Control-Request-Method", "POST");

      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    });

    it("5. Requests without an Origin header must succeed without CORS headers (health check & Swagger)", async () => {
      const healthRes = await request(app).get("/api/v1/health");
      expect(healthRes.status).toBe(200);
      expect(healthRes.body).toEqual({ status: "ok" });
      expect(healthRes.headers["access-control-allow-origin"]).toBeUndefined();

      const docsRes = await request(app).get("/api/docs/");
      expect(docsRes.status).toBe(200);
      expect(docsRes.text).toContain("swagger-ui");
      expect(docsRes.headers["access-control-allow-origin"]).toBeUndefined();
    });

    it("6. Trailing-slash normalization: FRONTEND_URL with trailing slash matches browser Origin without slash", async () => {
      process.env.FRONTEND_URL = "http://localhost:5173/";

      const res = await request(app)
        .get("/api/v1/health")
        .set("Origin", "http://localhost:5173");

      expect(res.status).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    });

    it("7. Development loopback behavior: permits 127.0.0.1:5173 when localhost:5173 is configured in non-production", async () => {
      process.env.NODE_ENV = "test";
      process.env.FRONTEND_URL = "http://localhost:5173";

      const res = await request(app)
        .get("/api/v1/health")
        .set("Origin", "http://127.0.0.1:5173");

      expect(res.status).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBe("http://127.0.0.1:5173");
    });

    it("8. Fail-safe production behavior: throws in production if FRONTEND_URL is missing or malformed", () => {
      process.env.NODE_ENV = "production";

      // A. Missing in production
      delete process.env.FRONTEND_URL;
      expect(() => getAllowedOrigins()).toThrow(
        "CRITICAL CONFIGURATION ERROR: FRONTEND_URL must be configured in production"
      );

      // B. Empty string in production
      process.env.FRONTEND_URL = "   ";
      expect(() => getAllowedOrigins()).toThrow(
        "CRITICAL CONFIGURATION ERROR: FRONTEND_URL must be configured in production"
      );

      // C. Malformed URL in production
      process.env.FRONTEND_URL = "not-a-valid-url";
      expect(() => getAllowedOrigins()).toThrow(
        "CRITICAL CONFIGURATION ERROR: Malformed FRONTEND_URL entry 'not-a-valid-url' in production"
      );

      // D. Valid production origin does NOT allow loopback
      process.env.FRONTEND_URL = "https://baadigoob.com";
      const prodOrigins = getAllowedOrigins();
      expect(prodOrigins).toEqual(["https://baadigoob.com"]);
      expect(prodOrigins).not.toContain("http://127.0.0.1:5173");
    });
  });
});

