import request from "supertest";
import { describe, it, expect, vi } from "vitest";
import { createApp } from "../src/app.js";
import { createMetrics } from "../src/metrics.js";

function createTestApp(pool) {
  return createApp({
    pool,
    metrics: createMetrics({ collectDefault: false }),
  });
}

describe("API", () => {
  it("GET /health -> 200 when service is alive", async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const app = createTestApp(pool);

    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("GET /health/db -> 200 when DB answers", async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const app = createTestApp(pool);

    const res = await request(app).get("/health/db");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", database: "up" });
    expect(pool.query).toHaveBeenCalledWith("SELECT 1");
  });

  it("POST /notes without title -> 400", async () => {
    const pool = { query: vi.fn() };
    const app = createTestApp(pool);

    const res = await request(app).post("/notes").send({ content: "yo" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "title is required" });
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("GET /metrics exposes custom metrics", async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const app = createTestApp(pool);

    await request(app).get("/health");
    const res = await request(app).get("/metrics");

    expect(res.status).toBe(200);
    expect(res.text).toContain("http_requests_total");
    expect(res.text).toContain("http_request_duration_seconds");
  });
});
