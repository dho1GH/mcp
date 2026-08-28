# Zep Graphiti Temporal Starter

This repository bootstraps Zep Cloud graph context ingestion with Graphiti and Temporal using Node.js and TypeScript.

## Setup

1. Copy the environment template and fill in values.

```bash
cp .env.example .env
```

2. Install dependencies.

```bash
npm install
```

## Development

- Run a local Temporal worker in watch mode:

```bash
npm run worker:dev
```

- Start the sample workflow trigger:

```bash
npm run dev
```

## Build and Run

```bash
npm run build
npm run worker
npm run start
```

## Git hooks

This repo includes a local pre-commit hook that runs `npm run lint`, `npm run typecheck`, and `npm run build`.

## Notes

- Replace the Graphiti and Zep API paths in the clients with the official endpoints for your tenant.
- The workflow orchestrates Graphiti then Zep graph upserts. Adjust ordering or add retries as needed.
