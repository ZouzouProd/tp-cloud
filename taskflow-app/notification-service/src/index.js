require("./tracing");
const { register, metricsMiddleware } = require("./metrics");
const express = require("express");
const pino = require("pino");
const pinoHttp = require("pino-http");
const { context, trace } = require("@opentelemetry/api");
const {
  startSubscriber,
  getNotifications,
  markAsRead,
} = require("./subscriber");

const ERROR_CODE = 500;

const logger = pino({ level: process.env.LOG_LEVEL || "info" });
const app = express();

app.use(express.json());
app.use(
  pinoHttp({
    logger,
    customProps: () => {
      const activeSpan = trace.getSpan(context.active());
      const trace_id = activeSpan?.spanContext().traceId;
      return trace_id ? { trace_id } : {};
    },
    customLogLevel: (req, res) => {
      if (res.statusCode >= ERROR_CODE) return "error";
      return "info";
    },
    customSuccessMessage: (req, res) => {
      if (res.statusCode >= 400) return req.errorMessage ?? `request failed`;
      return `${req.method} completed`;
    },
    customErrorMessage: (req, res, err) => `request failed : ${err.message}`,
  }),
);
app.use(metricsMiddleware);

app.get("/health", (req, res) =>
  res.json({ status: "ok", service: "notification-service" }),
);

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// GET /notifications?userId=xxx
app.get("/notifications", (req, res) => {
  const { userId } = req.query;
  res.json(getNotifications(userId));
});

// PATCH /notifications/:id/read
app.patch("/notifications/:id/read", (req, res) => {
  const notif = markAsRead(req.params.id);
  if (!notif) return res.status(404).json({ error: "Notification not found" });
  res.json(notif);
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, async () => {
  await startSubscriber();
  logger.info({ port: PORT }, "notification-service started");
});
