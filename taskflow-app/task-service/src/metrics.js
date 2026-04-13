const client = require("prom-client");

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"],
});

const httpRequestDurationMs = new client.Histogram({
  name: "http_request_duration_ms",
  help: "HTTP request duration in ms",
  labelNames: ["method", "route", "status"],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2000],
});

const tasksCreatedTotal = new client.Counter({
  name: "tasks_created_total",
  help: "Total number of created tasks",
  labelNames: ["priority"],
});

const tasksStatusChangesTotal = new client.Counter({
  name: "tasks_status_changes_total",
  help: "Total number of task status changes",
  labelNames: ["from_status", "to_status"],
});

const tasksGauge = new client.Gauge({
  name: "tasks_gauge",
  help: "Current number of tasks by status",
  labelNames: ["status"],
});

register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDurationMs);
register.registerMetric(tasksCreatedTotal);
register.registerMetric(tasksStatusChangesTotal);
register.registerMetric(tasksGauge);

function getRouteLabel(req) {
  return req.route?.path ? `${req.baseUrl || ""}${req.route.path}` : req.baseUrl || req.path;
}

function metricsMiddleware(req, res, next) {
  const startedAt = Date.now();

  res.on("finish", () => {
    const labels = {
      method: req.method,
      route: getRouteLabel(req),
      status: String(res.statusCode),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDurationMs.observe(labels, Date.now() - startedAt);
  });

  next();
}

async function refreshTasksGauge(db) {
  const result = await db.query(
    "SELECT status, COUNT(*)::int AS count FROM tasks GROUP BY status",
  );

  tasksGauge.reset();
  result.rows.forEach((row) => {
    tasksGauge.set({ status: row.status }, row.count);
  });
}

module.exports = {
  register,
  metricsMiddleware,
  httpRequestsTotal,
  httpRequestDurationMs,
  tasksCreatedTotal,
  tasksStatusChangesTotal,
  tasksGauge,
  refreshTasksGauge,
};
