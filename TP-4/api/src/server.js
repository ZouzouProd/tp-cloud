import { createApp } from "./app.js";
import { createPoolFromEnv, waitForDb } from "./db.js";
import { logger } from "./logger.js";

try {
  const pool = createPoolFromEnv();
  await waitForDb(pool);

  const app = createApp({ pool });

  // =======================
  // Start server
  // =======================

  const port = process.env.API_PORT || process.env.PORT || 3000;
  app.listen(port, () => {
    logger.info({ port }, "API is running");
  });
} catch (err) {
  logger.error({ err: err.message }, "API startup failed");
  process.exit(1);
}
