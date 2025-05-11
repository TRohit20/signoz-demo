import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';

// Test the connection to SigNoz first
fetch('https://ingest.<YOUR-REGION>.signoz.cloud/v1/traces', {
  method: 'POST',
  headers: {
    'signoz-access-token': '${SIGNZ_ACCESS_TOKEN}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    resourceSpans: [{
      resource: {
        attributes: [{
          key: 'service.name',
          value: { stringValue: 'svelte-app' }
        }]
      },
      scopeSpans: [{
        spans: [{
          traceId: '00000000000000000000000000000000',
          spanId: '0000000000000000',
          name: 'test-connection',
          kind: 1,
          startTimeUnixNano: Date.now() * 1000000,
          endTimeUnixNano: Date.now() * 1000000
        }]
      }]
    }]
  })
}).then(response => {
  console.log('SigNoz connection test response:', response.status, response.statusText);
}).catch(error => {
  console.error('SigNoz connection test failed:', error);
});

// Set up the OTLP exporter with more debugging
const exporter = new OTLPTraceExporter({
  url: 'https://ingest.in.signoz.cloud/v1/traces',
  headers: {
    'signoz-access-token': '1JOYAoopEA25PDz0GQ46L2hDG0NPeFHc0n6a',
    'Content-Type': 'application/json'
  },
  onSuccess: (response) => {
    console.log('Trace exported successfully:', response);
  },
  onError: (error) => {
    console.error('Trace export failed:', error);
  }
});

// Configure the tracer provider with the span processor
const provider = new WebTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'svelte-app',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'development',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  }),
  spanProcessor: new SimpleSpanProcessor(exporter)
});

// Register the provider
provider.register();

// Register auto-instrumentations
registerInstrumentations({
  instrumentations: [
    getWebAutoInstrumentations(),
    new FetchInstrumentation()
  ],
});

// Create a test span to verify the setup
const tracer = trace.getTracer('svelte-app-tracer');

// Function to create and send a test span
function createTestSpan() {
  const span = tracer.startSpan('test-span');
  span.setAttribute('test.attribute', 'test-value');
  span.setAttribute('test.timestamp', new Date().toISOString());
  span.addEvent('test-event', {
    'test.message': 'Test event from browser'
  });
  span.end();
  console.log('Test span created and ended');
}

// Create initial test span
createTestSpan();

// Create test span every 5 seconds
setInterval(createTestSpan, 5000);

console.log('OpenTelemetry initialized!');
