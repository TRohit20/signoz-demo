import { trace as otelApiTrace, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base'; 

import * as OTelSdkTraceWeb from '@opentelemetry/sdk-trace-web';

// --- DIAGNOSTIC LOGS for @opentelemetry/sdk-trace-web ---
console.log('[OTel Import Check] OTelSdkTraceWeb (namespace import):', OTelSdkTraceWeb);
const WebTracerProvider = OTelSdkTraceWeb.WebTracerProvider;
const SimpleSpanProcessor = OTelSdkTraceWeb.SimpleSpanProcessor;
const BatchSpanProcessor = OTelSdkTraceWeb.BatchSpanProcessor;

console.log('[OTel Import Check] typeof WebTracerProvider from namespace:', typeof WebTracerProvider, WebTracerProvider);
console.log('[OTel Import Check] typeof SimpleSpanProcessor from namespace:', typeof SimpleSpanProcessor, SimpleSpanProcessor);

const COLLECTOR_OTLP_HTTP_ENDPOINT = 'http://localhost:4318/v1/traces';

export function initializeOpenTelemetry(serviceName = 'default-svelte-service') {
  console.log(`[OTel Init] Initializing OpenTelemetry for service: ${serviceName}`);

  // Defensive checks
  if (typeof Resource !== 'function' || typeof Resource.default !== 'function') {
    console.error('[OTel Init CRITICAL] Resource class not imported correctly.'); return;
  }
  if (typeof WebTracerProvider !== 'function') { 
    console.error('[OTel Init CRITICAL] WebTracerProvider class not imported correctly from OTelSdkTraceWeb namespace.');
    console.error('[OTel Init CRITICAL] Inspected WebTracerProvider:', WebTracerProvider);
    console.error('[OTel Init CRITICAL] Full OTelSdkTraceWeb namespace was:', OTelSdkTraceWeb); 
    return;
  }
  if (typeof SimpleSpanProcessor !== 'function') {
    console.error('[OTel Init CRITICAL] SimpleSpanProcessor not imported correctly from OTelSdkTraceWeb namespace.'); return;
  }
   if (typeof OTLPTraceExporter !== 'function') {
    console.error('[OTel Init CRITICAL] OTLPTraceExporter not imported correctly.'); return;
  }
  if (typeof ConsoleSpanExporter !== 'function') {
    console.error('[OTel Init CRITICAL] ConsoleSpanExporter not imported correctly.'); return;
  }

  const resource = Resource.default().merge(
    new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'development',
      [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    })
  );
  console.log('[OTel Init] Resource created.');

  const provider = new WebTracerProvider({ 
    resource: resource,
  });
  console.log('[OTel Init] WebTracerProvider instantiated. Provider object:', provider);
  console.log('[OTel Init] Checking provider.addSpanProcessor before call: typeof = ', typeof provider.addSpanProcessor);

  const otlpExporter = new OTLPTraceExporter({
    url: COLLECTOR_OTLP_HTTP_ENDPOINT,
    onSuccess: () => console.log('[OTel OTLP Exporter] Trace batch exported to Collector'),
    onError: (error) => console.error('[OTel OTLP Exporter] Trace batch export to Collector failed:', error)
  });
  console.log('[OTel Init] OTLPExporter created.');

  const consoleExporterForDebug = new ConsoleSpanExporter();
  console.log('[OTel Init] ConsoleExporter created.');


  if(typeof SimpleSpanProcessor === 'function') {
    provider.addSpanProcessor(new SimpleSpanProcessor(consoleExporterForDebug));
    console.log('[OTel Init] ConsoleSpanExporter processor added.');

    provider.addSpanProcessor(new SimpleSpanProcessor(otlpExporter));
    console.log('[OTel Init] OTLPSpanProcessor (Simple) added.');
  } else {
    console.error("[OTel Init CRITICAL] SimpleSpanProcessor is not a function, can't add span processors!");
  }


  provider.register({ contextManager: new ZoneContextManager() });
  console.log('[OTel Init] Provider registered.');

  registerInstrumentations({
    instrumentations: [getWebAutoInstrumentations()],
  });
  console.log('[OTel Init] Auto-instrumentations registered.');

  const tracer = otelApiTrace.getTracer('svelte-frontend-tracer'); 
  function createAndLogTestSpan(spanName = 'manual-test-span-from-init') {
    const span = tracer.startSpan(spanName);
    console.log(`[OTel] Manual span "${spanName}" started. TraceID: ${span.spanContext().traceId}`);
    span.end(); 
    console.log(`[OTel] Manual span "${spanName}" ended.`);
  }
  createAndLogTestSpan('initial-load-test-span');
  // setInterval(() => createAndLogTestSpan('periodic-test-span'), 7000);

  console.log(`[OTel Init] OpenTelemetry initialization nominally complete for ${serviceName}.`);
}