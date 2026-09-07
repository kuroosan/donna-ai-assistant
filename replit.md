# Donna AI Assistant

Donna is a modular FastAPI assistant backend designed for Replit and other low-memory environments.

## Backend Structure

```text
backend/
├── app/
│   ├── core/
│   │   ├── config.py       # Environment-backed application settings
│   │   ├── llm.py          # Groq client for chat and speech-to-text
│   │   ├── n8n.py          # Async n8n webhook client
│   │   └── security.py     # API key verification
│   ├── main.py              # FastAPI application entry point
│   └── modules/             # Feature modules as they are added
└── requirements.txt
```

The FastAPI entry point is `backend/app/main.py`, exposed as `app.main:app` when the working directory is `backend`.

## AI Engines

The backend uses a dual-engine strategy:

- Groq handles fast conversational tasks and speech-to-text.
- Gemini handles heavier reasoning and vision tasks.

## Module Contract

Each module under `app/modules/<name>/` follows these rules:

- `router.py` must expose `router` and protect it with `verify_api_key`.
- `schemas.py` response models must include `module: str`.
- `service.py` contains business logic and uses `@staticmethod` methods.
- Modules remain isolated and must not import from one another.

## Automation Layer

The n8n integration dispatches module workflows through webhooks using `N8N_WEBHOOK_BASE_URL`. Workflow names are appended to that base URL, and requests use the configured timeout.

## Planned Modules

- Chat
- Jobs
- Travel
- Voice
- Desktop

## Required Secrets

Configure these environment secrets:

- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `API_SECRET_KEY`
- `ALLOWED_ORIGINS`
- `N8N_WEBHOOK_BASE_URL`

## Run

```bash
cd backend && uvicorn app.main:app
```