import * as otelApi from '@opentelemetry/api';
import * as otelResources from '@opentelemetry/resources';
import * as otelSemanticConventions from '@opentelemetry/semantic-conventions';
import * as otelSdkTraceWeb from '@opentelemetry/sdk-trace-web';
import * as otelExporterTraceOtlpHttp from '@opentelemetry/exporter-trace-otlp-http';
import * as otelInstrumentation from '@opentelemetry/instrumentation';
import * as otelAutoInstWeb from '@opentelemetry/auto-instrumentations-web';
import * as otelContextZone from '@opentelemetry/context-zone';
import * as otelSdkTraceBase from '@opentelemetry/sdk-trace-base'; 

// Destructure/assign the specific classes/objects we need from the namespaces
const { trace: otelApiTrace, DiagConsoleLogger, DiagLogLevel, diag } = otelApi; 
const { Resource } = otelResources;
const { SemanticResourceAttributes } = otelSemanticConventions;
const { WebTracerProvider, SimpleSpanProcessor, BatchSpanProcessor } = otelSdkTraceWeb; 
const { OTLPTraceExporter } = otelExporterTraceOtlpHttp;
const { registerInstrumentations } = otelInstrumentation;
const { getWebAutoInstrumentations } = otelAutoInstWeb;
const { ZoneContextManager } = otelContextZone;
const { ConsoleSpanExporter } = otelSdkTraceBase;

// --- BEGIN DIAGNOSTIC LOGS FOR IMPORTS (Crucial for debugging!) ---
// These logs will help me confirm if the above destructuring was successful.
console.log('[OTel Init - Values Check] otelApiTrace:', typeof otelApiTrace, otelApiTrace);
console.log('[OTel Init - Values Check] Resource:', typeof Resource, Resource);
console.log('[OTel Init - Values Check] SemanticResourceAttributes:', typeof SemanticResourceAttributes, SemanticResourceAttributes);
console.log('[OTel Init - Values Check] WebTracerProvider:', typeof WebTracerProvider, WebTracerProvider);
console.log('[OTel Init - Values Check] SimpleSpanProcessor:', typeof SimpleSpanProcessor, SimpleSpanProcessor);
console.log('[OTel Init - Values Check] BatchSpanProcessor:', typeof BatchSpanProcessor, BatchSpanProcessor); // Check this too
console.log('[OTel Init - Values Check] OTLPTraceExporter:', typeof OTLPTraceExporter, OTLPTraceExporter);
console.log('[OTel Init - Values Check] registerInstrumentations:', typeof registerInstrumentations, registerInstrumentations);
console.log('[OTel Init - Values Check] getWebAutoInstrumentations:', typeof getWebAutoInstrumentations, getWebAutoInstrumentations);
console.log('[OTel Init - Values Check] ZoneContextManager:', typeof ZoneContextManager, ZoneContextManager);
console.log('[OTel Init - Values Check] ConsoleSpanExporter:', typeof ConsoleSpanExporter, ConsoleSpanExporter);
// --- END DIAGNOSTIC LOGS FOR IMPORTS ---

// More detailed OpenTelemetry internal logging (for debugging OTel itself)
// if (diag && DiagLogLevel) {
//   diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG); // Or INFO
//   console.log('[OTel Init] OpenTelemetry internal diagnostic logging set to DEBUG.');
// }

const COLLECTOR_OTLP_HTTP_ENDPOINT = 'http://localhost:4318/v1/traces';

export function initializeOpenTelemetry(serviceName = 'svelte-otel-app') {
  console.log(`[OTel Init] Starting OpenTelemetry initialization for service: ${serviceName}`);
  console.log('[OTel Init] Environment check:', {
    isBrowser: typeof window !== 'undefined',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
    collectorEndpoint: COLLECTOR_OTLP_HTTP_ENDPOINT
  });

  try {
    // Enable OpenTelemetry debug logging
    if (diag && DiagLogLevel) {
      diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
      console.log('[OTel Init] OpenTelemetry internal diagnostic logging enabled');
    }

    // --- Essential Type Checks Cz importing these packages and utilising these fucntions are a not straight forward in Vite ---
    // Learnt the hard way.
    if (typeof Resource !== 'function') throw new Error('Resource class not imported correctly.');
    if (typeof WebTracerProvider !== 'function') throw new Error('WebTracerProvider class not imported correctly.');
    if (typeof SimpleSpanProcessor !== 'function') throw new Error('SimpleSpanProcessor class not imported correctly.');
    if (typeof BatchSpanProcessor !== 'function') throw new Error('BatchSpanProcessor class not imported correctly.');
    if (typeof OTLPTraceExporter !== 'function') throw new Error('OTLPTraceExporter class not imported correctly.');
    if (typeof ConsoleSpanExporter !== 'function') throw new Error('ConsoleSpanExporter class not imported correctly.');
    if (typeof ZoneContextManager !== 'function') throw new Error('ZoneContextManager class not imported correctly.');
    if (typeof registerInstrumentations !== 'function') throw new Error('registerInstrumentations function not imported correctly.');
    if (typeof getWebAutoInstrumentations !== 'function') throw new Error('getWebAutoInstrumentations function not imported correctly.');
    if (!SemanticResourceAttributes || typeof SemanticResourceAttributes.SERVICE_NAME !== 'string') { 
        throw new Error('SemanticResourceAttributes not imported correctly or SERVICE_NAME is missing.');
    }
    if (!otelApiTrace || typeof otelApiTrace.getTracer !== 'function') {
        throw new Error('OpenTelemetry API (trace) not imported correctly.');
    }
    console.log('[OTel Init] All essential OTel classes/functions appear to be imported.');
    // --- End Essential Type Checks ---

    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'development',
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
      })
    );
    console.log('[OTel Init] Resource created:', resource.attributes);

    const provider = new WebTracerProvider({
      resource: resource,
    });
    console.log('[OTel Init] WebTracerProvider instantiated:', provider);

    // Verify provider methods
    if (typeof provider.addSpanProcessor !== 'function') {
      throw new Error('WebTracerProvider is not properly initialized - addSpanProcessor is not a function');
    }

    // For debugging in browser console (Traces show up in the console but not in Collector, useful for debugging in that case)
    const consoleDebugExporter = new ConsoleSpanExporter();
    const consoleProcessor = new SimpleSpanProcessor(consoleDebugExporter);
    provider.addSpanProcessor(consoleProcessor);
    console.log('[OTel Init] ConsoleSpanExporter processor added.');

    // For sending to OTLP Collector (Continual of above)
    const otlpCollectorExporter = new OTLPTraceExporter({
      url: COLLECTOR_OTLP_HTTP_ENDPOINT,
      headers: {
        'Content-Type': 'application/json',
      },
      onSuccess: () => console.log('[OTel OTLP Exporter] SUCCESS: Trace batch exported to Collector.'),
      onError: (error) => {
        console.error('[OTel OTLP Exporter] ERROR: Trace batch export to Collector FAILED:', error);
        console.error('[OTel OTLP Exporter] Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
    });

 
    const otlpProcessor = new BatchSpanProcessor(otlpCollectorExporter, {
      scheduledDelayMillis: 1000, // Send every second
      maxQueueSize: 2048, // Maximum queue size
      maxExportBatchSize: 512, // Maximum batch size
    });

    try {
      provider.addSpanProcessor(otlpProcessor);
      console.log('[OTel Init] OTLPExporter with BatchSpanProcessor added.');
    } catch (error) {
      console.error('[OTel Init] Failed to add OTLP processor:', error);
      throw error;
    }

  
    try {
      provider.register({
        contextManager: new ZoneContextManager()
      });
      console.log('[OTel Init] WebTracerProvider registered globally with ZoneContextManager.');
    } catch (error) {
      console.error('[OTel Init] Failed to register provider:', error);
      throw error;
    }


    try {
      registerInstrumentations({
        instrumentations: [
          getWebAutoInstrumentations({
            // Enable all auto-instrumentations
            '@opentelemetry/instrumentation-fetch': {
              propagateTraceHeaderCorsUrls: [/.+/g], // Propagate W3C trace context to all origins
              clearTimingResources: true,
            },
            '@opentelemetry/instrumentation-document-load': {},
            '@opentelemetry/instrumentation-user-interaction': {},
            '@opentelemetry/instrumentation-xml-http-request': {}
          }),
        ],
      });
      console.log('[OTel Init] Auto-instrumentations registered.');
    } catch (error) {
      console.error('[OTel Init] Failed to register instrumentations:', error);
      throw error;
    }

    // Manual Test Span
    try {
      const tracer = otelApiTrace.getTracer(`${serviceName}-manual-tracer`);
      const testSpan = tracer.startSpan('frontend-initialization-test-span');
      testSpan.setAttribute('init.status', 'success');
      testSpan.setAttribute('app.language', 'Svelte (JavaScript)');
      testSpan.setAttribute('test.timestamp', new Date().toISOString());
      testSpan.addEvent('OpenTelemetryInitialized', {
        timestamp: new Date().toISOString(),
        collectorEndpoint: COLLECTOR_OTLP_HTTP_ENDPOINT
      });
      
      // Log detailed span information
      const spanContext = testSpan.spanContext();
      console.log('[OTel Test Span] Detailed span information:', {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
        traceFlags: spanContext.traceFlags,
        isRemote: spanContext.isRemote,
        attributes: testSpan.attributes,
        events: testSpan.events,
        status: testSpan.status
      });
      
      testSpan.end();
      console.log(`[OTel Init] Manual test span 'frontend-initialization-test-span' created and ended. TraceID: ${testSpan.spanContext().traceId}.`);
    } catch (error) {
      console.error('[OTel Init] Failed to create test span:', error);
      throw error;
    }

    console.log(`[OTel Init] OpenTelemetry initialization function completed successfully for service: ${serviceName}.`);

  } catch (error) {
    console.error('[OTel Init CRITICAL] Uncaught error during OpenTelemetry initialization:', error);
  }
}