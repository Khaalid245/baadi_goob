import request from "supertest";
import { app } from "../src/app";

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
});
