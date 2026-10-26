# Failora

AI Reliability and Recovery Verification Platform

## Vision

Failora helps developers identify failures in AI applications, test recovery behavior, and improve reliability.

- Detect failures and errors in AI applications
- Test failure scenarios: timeout, HTTP 429, HTTP 500, malformed responses
- Verify retry and fallback mechanisms work as expected
- Measure recovery behavior, success rate, and latency after failures
- Convert failures into repeatable regression tests
- Provide clear reports so developers understand root causes

## Setup

```bash
# Clone the repository
git clone https://github.com/madhavikodale/Failora.git
cd Failora

# Install dependencies
npm install

# Copy environment config
cp .env.example .env
```

## Running Tests

```bash
# Run all workspace tests
npm run test

# Run type checking
npm run typecheck
```

## Mock AI Service

A controlled localhost-only mock service for safe failure injection:

```bash
npm run mock-ai
```

Endpoints:

| Endpoint | Description |
|---|---|
| `GET /health` | Health check |
| `ANY /respond?mode=ok` | Normal 200 response |
| `ANY /respond?mode=slow&delay=5000` | Delays then responds (use for timeout tests) |
| `ANY /respond?mode=429` | Returns HTTP 429 with Retry-After |
| `ANY /respond?mode=500` | Returns HTTP 500 |
| `ANY /respond?mode=malformed` | Returns invalid JSON |

## Project Structure

```
packages/
  core/       # Failure-testing engine (scenarios, runner, evaluator)
  mock-ai/    # Localhost mock AI service for controlled testing
```

## Tech Stack

- Node.js 22+ with native TypeScript support (`--experimental-strip-types`)
- npm workspaces (monorepo)
- Vitest for testing
- No native dependencies (avoids platform compatibility issues)

## Security Notes

- Never run fault injection against unauthorized external systems
- Mock AI service binds to `127.0.0.1` only
- Use `.env.example` as template; never commit `.env`
