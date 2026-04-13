import client from "prom-client";

function getRouteLabel(req) {
  if (req.route?.path) {
    return `${req.baseUrl || ""}${req.route.path}`;
  }

  return req.path;
}

export function createMetrics({ collectDefault = true } = {}) {
  const register = new client.Registry();

  if (collectDefault) {
    client.collectDefaultMetrics({ register });
  }

  const httpRequestsTotal = new client.Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status_code"],
    registers: [register],
  });

  const httpRequestDurationSeconds = new client.Histogram({
    name: "http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    registers: [register],
  });

  function middleware(req, res, next) {
    const start = process.hrtime.bigint();

    res.on("finish", () => {
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
      const labels = {
        method: req.method,
        route: getRouteLabel(req),
        status_code: String(res.statusCode),
      };

      httpRequestsTotal.inc(labels);
      httpRequestDurationSeconds.observe(labels, durationSeconds);
    });

    next();
  }

  async function metricsHandler(_, res) {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  }

  return {
    middleware,
    metricsHandler,
    register,
  };
}
