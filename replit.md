# Jarvis Controller — Replit Workspace Context

## System Architecture
Jarvis Controller is a zero-touch, modular FastAPI personal assistant engine designed for low-memory environments and dual-engine AI processing.

┌─────────────────┐      ┌─────────────────────────┐      ┌─────────────────┐
│ Client / Web    ├─────►│ FastAPI (app/main.py)   ├─────►│ Groq API        │
└─────────────────┘      │ Dynamic Router Engine   │      │ (Fast LLM/STT)  │
└────────────┬────────────┘      └─────────────────┘
│                   ┌─────────────────┐
├──────────────────►│ Gemini API      │
│                   │ (Heavy/Vision)  │
│                   └─────────────────┘
│                   ┌─────────────────┐
└──────────────────►│ n8n Webhooks    │
│ (Automations)   │
└─────────────────┘

## Directory Map
```text
.
├── app/
│   ├── core/
│   │   ├── config.py         # Pydantic BaseSettings loading API keys & secrets
│   │   ├── security.py       # Constant-time X-API-Key verification
│   │   ├── llm.py            # Async Groq + Gemini unified client
│   │   └── n8n.py            # Async webhook dispatcher to n8n engine
│   ├── modules/              # Pluggable feature modules
│   │   ├── jobs/             # POST /api/jobs/tailor
│   │   ├── travel/           # POST /api/travel/plan
│   │   └── voice/            # POST /api/voice/transcribe, /api/voice/intent
│   └── main.py               # Dynamic importlib module scanner
├── .replit                   # Replit runtime and agent instructions
├── replit.md                 # System context documentation
└── requirements.txt          # Dependencies
Module Development Contract
When adding or modifying a module in app/modules/<module_name>/:

__init__.py: Must be empty.

router.py: Must expose a router named router:
router = APIRouter(dependencies=[Depends(verify_api_key)])

schemas.py: Pydantic v2 schemas. Every response model must include module: str = "<module_name>".

service.py: Business logic using @staticmethod async methods. No direct route handling or FastAPI imports.

Environment Secrets Required
Set these key-value pairs in Replit Tools > Secrets:

GROQ_API_KEY: Groq API authorization key.

GEMINI_API_KEY: Google Gemini API key.

API_SECRET_KEY: Master secret key for X-API-Key header authentication.

N8N_WEBHOOK_BASE_URL: Base URL for n8n execution triggers.


---

### 3. `requirements.txt`

Add this streamlined `requirements.txt` to ensure Replit installs all required dependencies cleanly:

```text
fastapi>=0.110.0
uvicorn[standard]>=0.28.0
pydantic>=2.6.0
pydantic-settings>=2.2.0
httpx>=0.27.0
google-genai>=0.1.0
python-multipart>=0.0.9
uvloop>=0.19.0; sys_platform != "win32"