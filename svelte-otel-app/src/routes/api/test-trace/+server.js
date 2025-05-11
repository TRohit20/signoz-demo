import { json } from '@sveltejs/kit';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

export async function GET() {
    // Get the tracer
    const tracer = trace.getTracer('svelte-app-tracer');
    
    // Create a span
    const span = tracer.startSpan('test-operation');
    
    try {
        // Add some attributes to the span
        span.setAttribute('test.attribute', 'test-value');
        span.setAttribute('test.timestamp', new Date().toISOString());
        
        // Create a child span for the simulated work
        const childSpan = tracer.startSpan('simulated-work', {}, context.active());
        try {
            // Simulate some work
            await new Promise(resolve => setTimeout(resolve, 100));
            childSpan.setAttribute('work.duration', '100ms');
        } finally {
            childSpan.end();
        }
        
        // Add event to the span
        span.addEvent('test-completed', {
            'test.status': 'success'
        });
        
        return json({
            status: 'success',
            message: 'Trace created successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        // Record the error in the span
        span.recordException(error);
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message
        });
        throw error;
    } finally {
        // End the span
        span.end();
    }
} 