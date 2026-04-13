import express from "express";
import pinoHttp from "pino-http";
import { logger } from "./logger.js";
import { createMetrics } from "./metrics.js";

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringOrUndefined(value) {
  return value === undefined || typeof value === "string";
}

function parseId(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    res.locals.logMessage = "Invalid id. Expected a positive integer.";
    logger.warn({ id: req.params.id }, "invalid note id");
    res.status(400).json({ error: "Invalid id. Expected a positive integer." });
    return null;
  }

  return id;
}

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function createApp({ pool, metrics = createMetrics() }) {
  const app = express();

  app.use(
    pinoHttp({
      logger,
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
      customSuccessMessage: (_req, res) => {
        if (res.statusCode >= 400) {
          return (
            res.locals?.logMessage ??
            `request failed with status ${res.statusCode}`
          );
        }

        return "request completed";
      },
      customErrorMessage: (_req, res, err) => {
        return res.locals?.logMessage ?? err?.message ?? "request error";
      },
    }),
  );

  app.use(express.json());
  app.use(metrics.middleware);

  app.get("/health", (_, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/health/db", asyncHandler(async (_, res) => {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok", database: "up" });
  }));

  app.get("/metrics", metrics.metricsHandler);

  app.get("/notes", asyncHandler(async (_, res) => {
    logger.info("fetching all notes");

    const result = await pool.query(
      "SELECT * FROM notes ORDER BY created_at DESC",
    );

    res.json(result.rows);
  }));

  app.post("/notes", asyncHandler(async (req, res) => {
    const { title, content } = req.body;

    logger.info({ title }, "creating note");

    if (!isNonEmptyString(title)) {
      res.locals.logMessage = "title is required";
      logger.warn({ body: req.body }, "missing or invalid title");
      return res.status(400).json({
        error: "title is required",
      });
    }

    const result = await pool.query(
      "INSERT INTO notes (title, content) VALUES ($1, $2) RETURNING *",
      [title.trim(), content ?? ""],
    );

    logger.info({ id: result.rows[0].id }, "note created");
    res.status(201).json(result.rows[0]);
  }));

  app.put("/notes/:id", asyncHandler(async (req, res) => {
    const id = parseId(req, res);
    if (id === null) return;

    const { title, content } = req.body;

    logger.info({ id }, "updating note");

    if (!isNonEmptyString(title)) {
      res.locals.logMessage = "title is required and must be a non-empty string";
      logger.warn({ id, body: req.body }, "missing or invalid title");
      return res.status(400).json({
        error: "title is required and must be a non-empty string",
      });
    }

    if (!isStringOrUndefined(content)) {
      res.locals.logMessage = "content must be a string if provided";
      logger.warn({ id, body: req.body }, "invalid content type");
      return res.status(400).json({
        error: "content must be a string if provided",
      });
    }

    const result = await pool.query(
      `
      UPDATE notes
      SET title = $1,
          content = $2
      WHERE id = $3
      RETURNING *
      `,
      [title.trim(), content ?? "", id],
    );

    if (result.rows.length === 0) {
      res.locals.logMessage = "note not found";
      logger.warn({ id }, "note not found for update");
      return res.status(404).json({ error: "note not found" });
    }

    logger.info({ id }, "note updated");
    res.json(result.rows[0]);
  }));

  app.get("/notes/:id", asyncHandler(async (req, res) => {
    const id = parseId(req, res);
    if (id === null) return;

    logger.info({ id }, "fetching note");

    const result = await pool.query("SELECT * FROM notes WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      res.locals.logMessage = "note not found";
      logger.warn({ id }, "note not found");
      return res.status(404).json({ error: "note not found" });
    }

    res.json(result.rows[0]);
  }));

  app.delete("/notes/:id", asyncHandler(async (req, res) => {
    const id = parseId(req, res);
    if (id === null) return;

    logger.info({ id }, "deleting note");

    const result = await pool.query(
      "DELETE FROM notes WHERE id = $1 RETURNING *",
      [id],
    );

    if (result.rows.length === 0) {
      res.locals.logMessage = "note not found";
      logger.warn({ id }, "note not found for deletion");
      return res.status(404).json({ error: "note not found" });
    }

    logger.info({ id }, "note deleted");
    res.status(204).send();
  }));

  app.use((req, res) => {
    res.locals.logMessage = "Endpoint not found";
    logger.warn({ method: req.method, path: req.path }, "endpoint not found");
    res.status(404).json({ error: "Endpoint not found" });
  });

  app.use((err, req, res, _next) => {
    res.locals.logMessage = err?.message ?? "Internal server error";
    logger.error(
      { err: err.message, method: req.method, path: req.path },
      "unhandled request error",
    );

    if (req.path === "/health/db") {
      res.locals.logMessage = "Database down";
      return res.status(503).json({ status: "error", database: "down" });
    }

    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
