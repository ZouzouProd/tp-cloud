"use strict";

const { NodeSDK } = require("@opentelemetry/sdk-node");
const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-http");
const {
  OTLPMetricExporter,
} = require("@opentelemetry/exporter-metrics-otlp-http");
const { PeriodicExportingMetricReader } = require("@opentelemetry/sdk-metrics");
const { Resource } = require("@opentelemetry/resources");
const {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} = require("@opentelemetry/semantic-conventions");

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || "api-gateway";
const SERVICE_VERSION = process.env.OTEL_SERVICE_VERSION || "1.0.0";
const DEPLOYMENT_ENVIRONMENT =
  process.env.OTEL_DEPLOYMENT_ENVIRONMENT || process.env.NODE_ENV;

const baseEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";
const normalizedBase = baseEndpoint.replace(/\/+$/, "");

const tracesEndpoint =
  process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
  `${normalizedBase}/v1/traces`;
const metricsEndpoint =
  process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ||
  `${normalizedBase}/v1/metrics`;

const traceExporter = new OTLPTraceExporter({ url: tracesEndpoint });
const metricReader = new PeriodicExportingMetricReader({
  exporter: new OTLPMetricExporter({ url: metricsEndpoint }),
});

const resourceAttributes = {
  [SEMRESATTRS_SERVICE_NAME]: SERVICE_NAME,
  [SEMRESATTRS_SERVICE_VERSION]: SERVICE_VERSION,
};
if (DEPLOYMENT_ENVIRONMENT) {
  resourceAttributes[SEMRESATTRS_DEPLOYMENT_ENVIRONMENT] =
    DEPLOYMENT_ENVIRONMENT;
}

const sdk = new NodeSDK({
  resource: new Resource(resourceAttributes),
  traceExporter,
  metricReader,
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-http": { enabled: true },
      "@opentelemetry/instrumentation-express": { enabled: true },
      "@opentelemetry/instrumentation-pg": { enabled: true },
    }),
  ],
});

Promise.resolve(sdk.start()).catch((err) => {
  // eslint-disable-next-line no-console
  console.error("OpenTelemetry SDK failed to start", err);
});

let shutdownPromise;
async function shutdown(signal) {
  if (!shutdownPromise) {
    shutdownPromise = sdk
      .shutdown()
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("OpenTelemetry SDK shutdown failed", err);
      })
      .finally(() => {
        if (signal) process.exit(0);
      });
  }
  return shutdownPromise;
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));