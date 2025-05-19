<script>
	import Counter from './Counter.svelte';
	import welcome from '$lib/images/svelte-welcome.webp';
	import welcomeFallback from '$lib/images/svelte-welcome.png';
	import { onMount } from 'svelte';
	import * as otelApi from '@opentelemetry/api';

	let apiData = null;
	let loading = false;
	let error = null;

	async function fetchTestData() {
		loading = true;
		error = null;
		
		// Get the tracer
		const tracer = otelApi.trace.getTracer('svelte-otel-app');
		
		// Start a new span for the API call
		const span = tracer.startSpan('fetch-test-data');
		
		try {
			const response = await fetch('/api/test');
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			apiData = await response.json();
			span.setAttribute('http.status_code', response.status);
			span.setAttribute('response.items_count', apiData.data.items.length);
		} catch (e) {
			error = e.message;
			span.recordException(e);
			span.setStatus({ code: otelApi.SpanStatusCode.ERROR, message: e.message });
		} finally {
			span.end();
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<section>
	<h1>
		<span class="welcome">
			<picture>
				<source srcset={welcome} type="image/webp" />
				<img src={welcomeFallback} alt="Welcome" />
			</picture>
		</span>

		to your new<br />SvelteKit app
	</h1>

	<h2>
		try editing <strong>src/routes/+page.svelte</strong>
	</h2>

	<div class="api-test">
		<button on:click={fetchTestData} disabled={loading}>
			{loading ? 'Loading...' : 'Fetch Test Data'}
		</button>

		{#if error}
			<p class="error">{error}</p>
		{:else if apiData}
			<div class="data-display">
				<h3>API Response:</h3>
				<pre>{JSON.stringify(apiData, null, 2)}</pre>
			</div>
		{/if}
	</div>

	<Counter />
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		flex: 0.6;
	}

	h1 {
		width: 100%;
	}

	.welcome {
		display: block;
		position: relative;
		width: 100%;
		height: 0;
		padding: 0 0 calc(100% * 495 / 2048) 0;
	}

	.welcome img {
		position: absolute;
		width: 100%;
		height: 100%;
		top: 0;
		display: block;
	}

	.api-test {
		margin: 2rem 0;
		padding: 1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		width: 100%;
		max-width: 600px;
	}

	.api-test button {
		padding: 0.5rem 1rem;
		background-color: #ff3e00;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	.api-test button:disabled {
		background-color: #ccc;
		cursor: not-allowed;
	}

	.error {
		color: red;
		margin-top: 1rem;
	}

	.data-display {
		margin-top: 1rem;
		text-align: left;
	}

	.data-display pre {
		background-color: #f5f5f5;
		padding: 1rem;
		border-radius: 4px;
		overflow-x: auto;
	}
</style>
