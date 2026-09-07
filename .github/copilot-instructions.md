# Donna AI Assistant: Copilot Instructions

## Project Context

Donna is a modular AI assistant workspace with a Python FastAPI backend and a pnpm TypeScript monorepo. The backend is the primary runtime service; the frontend and generated libraries live under `artifacts/` and `lib/`.

Current top-level areas:

- `backend/`: FastAPI service, settings, LLM clients, n8n integration, and Python dependencies.
- `artifacts/api-server/`: TypeScript API server package.
- `artifacts/jarvis-controller/`: Vite frontend package.
- `artifacts/mockup-sandbox/`: Vite mockup/sandbox package.
- `lib/api-client-react/`: Generated React API client.
- `lib/api-spec/`: OpenAPI source and Orval configuration.
- `lib/api-zod/`: Generated Zod API types.
- `lib/db/`: Drizzle database package and schema.
- `scripts/`: Workspace scripts.
- `.replit`, `Dockerfile`, and `docker-compose.yml`: deployment and local service configuration.

Treat generated files as outputs. Prefer changing their source specification or generator configuration instead of editing generated code directly.

## Commands

Use pnpm for the JavaScript/TypeScript workspace:

```bash
pnpm install
pnpm typecheck
pnpm build
```

`pnpm build` runs the workspace typecheck and then builds packages that expose a `build` script. Run package-local commands only when the change is scoped to that package.

Run the backend from the repository root with:

```bash
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The Docker image uses `backend/app/main.py` as `app.main:app`. Keep Docker, Replit, and local commands aligned with that import path; inspect the existing compose command before changing deployment configuration.

## Backend Conventions

- Keep backend imports rooted at `app` when running from `backend`.
- Use Pydantic Settings in `backend/app/core/config.py` for environment configuration.
- Never hard-code API keys, credentials, webhook URLs, or other secrets.
- Preserve existing pinned dependency versions in `backend/requirements.txt` when adding packages.
- Use async I/O for HTTP integrations and close long-lived `httpx.AsyncClient` instances with an async `close()` method.
- Use `structlog.get_logger(__name__)` for backend integration logging.
- Convert external-service failures into clear, actionable exceptions while preserving the original exception as the cause.
- Keep optional integrations optional: Gemini and n8n may be unconfigured in local development.

## AI Integration

The project uses a dual-engine strategy:

- Groq handles fast chat and speech-to-text workloads.
- Gemini handles heavier reasoning and vision workloads.
- n8n handles workflow automation through webhook triggers.

Relevant settings include `GROQ_API_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `N8N_WEBHOOK_BASE_URL`, `N8N_TIMEOUT_SECONDS`, and `DESKTOP_AUTOMATION_ENABLED`.

## Module Contract

Feature modules belong under `backend/app/modules/<module_name>/` and must remain isolated from one another.

- `router.py` must expose a variable named `router`.
- Protected routers should use `verify_api_key` from `app.core.security`.
- `schemas.py` should use Pydantic v2 models; response models include `module: str`.
- `service.py` contains business logic, uses `@staticmethod` methods, and does not import FastAPI route primitives.
- Do not add cross-module imports. Shared behavior belongs in `app/core/`.

## Frontend and API Packages

- Preserve the existing React, Vite, Tailwind, and shadcn-style conventions in the package being changed.
- Update the OpenAPI source before regenerating API clients or Zod types.
- Avoid manual edits to `lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/` unless the task explicitly concerns generated output.
- Keep UI changes responsive and accessible, including keyboard focus, semantic controls, and useful loading/error states.

## Configuration and Secrets

Required backend secrets are supplied through the environment rather than committed files:

- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `API_SECRET_KEY`
- `ALLOWED_ORIGINS`
- `N8N_WEBHOOK_BASE_URL`

Do not print secret values in logs, diagnostics, examples, or test output. Use placeholders in documentation.

## Change and Validation Rules

- Read the nearest implementation and tests before editing.
- Make the smallest change that fixes the requested behavior.
- Do not revert unrelated user changes.
- After editing Python, run the narrowest available Python compile, test, or type check; editor diagnostics are a fallback when Python is unavailable.
- After editing TypeScript, run the narrowest package typecheck or test, then run `pnpm typecheck` for shared or generated changes.
- Validate configuration changes without requiring production credentials where possible.
- Report unavailable tools or blocked runtime checks explicitly instead of claiming a build passed.
