// src/shared/mlflow-tracing.ts
// ---------------------------------------------------------------------------
// MLflow Tracing — disabled in Tauri (was OpenTelemetry Node.js SDK).
//
// The OpenTelemetry NodeTracerProvider requires Node.js APIs that are not
// available in the Tauri webview. Tracing will be re-implemented via a
// Tauri Rust command or the web-compatible @opentelemetry/sdk-trace-web.
// ---------------------------------------------------------------------------

interface MlflowDiagnostics {
  trackingUri: string;
  experimentName: string;
  initialized: boolean;
  experimentId: null;
  otlpUrl: null;
  initError: string | null;
  initDurationMs: null;
  steps: Array<{
    step: string;
    status: "ok" | "error" | "skipped";
    detail: string;
    timestamp: number;
  }>;
}

const diag: MlflowDiagnostics = {
  trackingUri: "",
  experimentName: "",
  initialized: false,
  experimentId: null,
  otlpUrl: null,
  initError: "MLflow tracing disabled in Tauri — Node.js SDK not available in webview",
  initDurationMs: null,
  steps: [],
};

export async function initMlflowTracing(): Promise<void> {
  console.log("[mlflow] Tracing disabled — re-implement via Tauri command or web SDK");
}

export function isMlflowTracingEnabled(): boolean {
  return false;
}

export function getMlflowDiagnostics(): MlflowDiagnostics {
  return { ...diag, steps: [...diag.steps] };
}
