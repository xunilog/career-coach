# Configuration

Career Coach uses Anthropic's Claude models to power all AI features — job scoring, company research, resume generation, and the career coach chat.

## API Key Setup

When you launch the app for the first time, you'll see a full-screen page asking for your Anthropic API key. This is the only required configuration.

### Getting an API Key

1. Go to the [Anthropic Console](https://console.anthropic.com).
2. Sign up or log in.
3. Navigate to **API Keys** and create a new key.
4. Copy the key (it starts with `sk-ant-api...`).

### First Launch

1. Paste your key into the input field on the welcome screen.
2. Click **Verify & Continue**.
3. The app calls Anthropic's API to verify your key (no charges incurred).
4. Once verified, your key is stored securely in the local database and the app opens.

If verification fails:

- **Invalid key**: Double-check you copied the full key from the Anthropic Console.
- **No internet**: Check your connection and click **Retry**.

## Updating Your Key

To change your API key later:

1. Click the **gear icon (⚙)** in the top-right corner of the app header.
2. Select **API Keys** from the dropdown menu.
3. Enter your new key and click **Verify & Save**.
4. The new key replaces the old one, and all subsequent LLM calls use the updated key.

## How Your Key Is Stored

- Your API key is stored in a local SQLite database on your machine (`provider_keys` table).
- The key is verified before storage — no unverified keys are persisted.
- In development mode, you can override the stored key by setting the `VITE_ANTHROPIC_API_KEY` environment variable.

## Supported Providers

| Provider      | Model (Standard)  | Environment Variable     |
| ------------- | ----------------- | ------------------------ |
| Anthropic     | Claude Sonnet 4.6 | `VITE_ANTHROPIC_API_KEY` |
| Mistral       | Mistral Medium    | `VITE_MISTRAL_API_KEY`   |
| Google Gemini | Gemini 3.5 Flash  | `VITE_GEMINI_API_KEY`    |
| DeepSeek      | DeepSeek V4 Pro   | `VITE_DEEPSEEK_API_KEY`  |

The app defaults to **Anthropic** in production. The other providers are available in development mode via environment variables. You can switch providers by setting `VITE_LLM_PROVIDER` to `anthropic`, `mistral`, `gemini`, or `deepseek`.

## No Other Configuration Required

Job searches use Indeed and LinkedIn as data sources (via ts-jobspy). No external API keys or accounts are needed for job searching.
