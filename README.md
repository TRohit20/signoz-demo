# Instrumenting Your Svelte App with OpenTelemetry Collector and SigNoz

This step-by-step implementation guide walks you through different concepts while helping you add "observability" to your Svelte web application. If you're new to terms like OpenTelemetry, SigNoz, or even what observability means, that is alright - this tutorial is designed for an audience of different knowledge levels.

## Prerequisites

This tutorial expects you to have basic understanding of Svelte or SvelteKit and JavaScript

## What is Observability?

Imagine your Svelte application is a complex machine, like a modern car:
* Your car might have a few warning lights – "Check Engine," "Low Fuel." These tell you *if* a known problem occurs.
* Now, imagine your car has an incredibly detailed dashboard with sensors for *everything*: engine speed, individual tire pressures, the exact path it's taking (GPS), how quickly it responds when you press the accelerator, and even the temperature inside and out. With all this rich data, you (or a skilled mechanic) can understand not just *that* something is wrong, but *precisely why* it's wrong, even if it's a completely new or unexpected issue. You can ask new questions about the car's performance and get clear answers.

That's essentially what observability brings to your Svelte or any application. It's about understanding and 'tracing' the state and behavior of your app by examining the data it produces, requests it processes and more. This is incredibly helpful for:
* Finding and fixing bugs much faster
* Understanding why some parts of your app might be slow for users
* Improving the overall user experience
* Making confident changes and adding new features

### Types of Telemetry Data

We collect different types of data, often called **telemetry data**:

1. **Traces:** These are like a detective following a single user's action through your app. For example, when a user clicks a button to load a new page, a trace shows every step of that journey – the click itself, any data fetching from a server, and the time it took to display the new page. **Traces are our main focus in this tutorial.**

2. **Metrics:** These are numbers measured over time. Think of them as your app's vital signs: how many users are on a page, the average time a page takes to load, or the number of errors happening per minute.

3. **Logs:** These are like a detailed diary or journal kept by your app. They are text records of specific events, messages, or errors that happen, like "User [username] logged in successfully at [time]" or "Error: Failed to load image [image_name]."

## Tools We'll Use

### OpenTelemetry (OTel)
Think of OpenTelemetry as a universal toolkit or a set of standard "sensors" and "wiring instructions" for your application. It provides a vendor-neutral, open-source way for your app to generate and send out its telemetry data (traces, metrics, logs). Because it's a standard, you're not locked into one specific company's tools. You can use OpenTelemetry to instrument your app once, and then choose where you want to send that valuable data (Spoiler: we will be sending this treasure of data to SigNoz).

### SigNoz
SigNoz is an open-source observability platform. It's the "mission control center" or the "advanced diagnostic workshop" that receives, stores, and helps you make sense of all the telemetry data sent by OpenTelemetry from your app. SigNoz provides you with:
* Dashboards to visualize your data
* Tools to search and analyze traces
* Ability to set up alerts for when things go wrong
* And more

### OpenTelemetry Collector (Otel Collector)
This is a separate, highly configurable helper application. Imagine it as a smart, local "data processing and forwarding station" that sits between your app and SigNoz (or any other observability vendor).

#### Why use a Collector?
It is a best practice to begin with, and here are few other reasons:
1. **Receives Data:** It can collect telemetry data from your app (and potentially many other apps or services)
2. **Processes Data:** The Collector can modify or clean up your data before sending it on. For example, it can:
   * Add useful information
   * Remove sensitive data
   * Filter out unimportant "noisy" traces
3. **Exports Data:** It can then reliably send the processed data to one or more destinations, like your SigNoz account
4. **Flexibility:** If you ever want to send your data to a different observability tool, you often only need to change the Collector's configuration, not your application's code

## Objectives

In this tutorial, we will:
1. Take a Svelte application
2. "Instrument" this Svelte app using OpenTelemetry's JavaScript libraries
3. Create a special "healthcheck page" (e.g., `/health`)
4. Download, set up, and run an OpenTelemetry Collector locally
5. Configure the Collector to receive all trace data from our Svelte app
6. Configure the Collector to filter out traces from our `/health` page
7. Send the remaining traces to SigNoz Cloud

## Step 1: Prerequisites and Setup

### 1.1 Node.js and npm (Node Package Manager)

SvelteKit and all the OpenTelemetry JavaScript libraries require Node.js and its package manager, npm.

#### How to Check if You Already Have Them:
1. Open your computer's **Terminal**
   * **macOS:** Find Terminal in `Applications > Utilities` or search using Spotlight (`Cmd + Space`, then type "Terminal")
   * **Windows:** Use "Command Prompt", "PowerShell", or "Windows Terminal"
   * **Linux:** Usually `Ctrl + Alt + T` opens a terminal

2. Check Node.js version:
   ```bash
   node -v
   ```
   If installed, you'll see a version number like `v18.17.0` or `v20.5.0`

3. Check npm version:
   ```bash
   npm -v
   ```
   If installed, you'll see a version number like `9.6.7` or `10.1.0`

#### How to Install Node.js and npm:
1. Visit [https://nodejs.org/](https://nodejs.org/)
2. Download the **LTS (Long Term Support)** version for your OS
3. Run the installer and follow the on-screen instructions
4. **Important:** Close and reopen your terminal after installation
5. Verify installation by running `node -v` and `npm -v` again

### 1.2 SigNoz Cloud Account & Ingestion Details

SigNoz is where your app's performance data will be sent, stored, and visualized.

#### Signing Up for SigNoz Cloud:
1. Navigate to SigNoz sign-up page
2. Fill in required details (name, email, password)
3. Find these crucial pieces of information:
   * **OTLP HTTP Endpoint URL for Traces:** Format like `https://ingest.<region>.signoz.cloud:443/v1/traces`
   * **SigNoz Access Token:** A secret key for authenticating data submissions

Store these values securely in a text file:
```text
SigNoz OTLP Endpoint URL: <paste the URL here>
SigNoz Access Token: <paste the token here>
```

If you have any difficulties finding these values or need more details, refer to:
- [SigNoz Cloud Overview](https://signoz.io/docs/ingestion/signoz-cloud/overview/#endpoint)
- [SigNoz Cloud Keys](https://signoz.io/docs/ingestion/signoz-cloud/keys/)

## Step 2: Setting Up Your SvelteKit Project

### 2.1 Create Your SvelteKit Project

1. Open your terminal and navigate to your projects directory:
   ```bash
   # macOS/Linux
   cd ~/Documents/Projects
   
   # Windows
   cd C:\Users\YourUserName\Documents\Projects
   ```

2. Create a new SvelteKit project:
   ```bash
   npm create svelte@latest demo-otel-app
   ```

3. Follow the setup prompts:
   * Choose "SvelteKit demo app"
   * Select "No" for TypeScript (or "Yes" if you're comfortable with it)
   * Enable ESLint and Prettier
   * Disable Playwright and Vitest

4. Navigate to your project and install dependencies:
   ```bash
   cd demo-otel-app
   npm install
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Visit `http://localhost:5173/` in your browser to verify the setup

### 2.2 Add a Healthcheck Page

1. Create a new directory and file:
   ```
   src/routes/health/+page.svelte
   ```

2. Add the following code to `+page.svelte`:
   ```svelte
   <script>
     import { onMount } from 'svelte';

     onMount(() => {
       console.log('The /health page has loaded in the browser. (OpenTelemetry should trace this page load if active).');
     });
   </script>

   <div>
     <h1>Application Health Status</h1>
     <p>Status: OK - Everything is running smoothly!</p>
     <p>
       This page is typically used by automated monitoring systems (like load balancers or uptime checkers)
       to verify that the application is responsive and healthy.
     </p>
     <p>
       For our OpenTelemetry setup, we will configure the OpenTelemetry Collector to specifically
       <strong>filter out (ignore)</strong> any performance traces generated from visits to this `/health` page.
       This helps keep our main performance data clean and focused on real user interactions.
     </p>
   </div>

   <style>
     div {
       padding: 25px;
       font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
       text-align: center;
       max-width: 650px;
       margin: 50px auto;
       border: 1px solid #d3d3d3;
       border-radius: 8px;
       background-color: #f9f9f9;
       box-shadow: 0 2px 4px rgba(0,0,0,0.1);
     }
     h1 {
       color: #2c3e50;
       margin-bottom: 20px;
     }
     p {
       color: #34495e;
       font-size: 1.1em;
       line-height: 1.6;
     }
   </style>
   ```

3. Test the healthcheck page:
   * Start the development server if not running: `npm run dev`
   * Visit `http://localhost:5173/health`
   * Check the browser console for the log message
   * Stop the server with `Ctrl+C` when done

## Resources

* [SvelteKit Official Documentation: Creating a Project](https://kit.svelte.dev/docs/creating-a-project)
* [Svelte Interactive Tutorial](https://svelte.dev/tutorial/basics)
