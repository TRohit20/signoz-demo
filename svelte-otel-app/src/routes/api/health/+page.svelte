<script>
  import { onMount } from 'svelte';
  onMount(() => {
    console.log('Health check page loaded, OpenTelemetry should be generating a span for this page load.');
  });
</script>

<h1>Application Health</h1>
<p>Status: OK</p>
<p>This page is used for automated health checks. Traces from this page should be filtered by the OpenTelemetry Collector.</p>