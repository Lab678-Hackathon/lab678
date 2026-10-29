from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.config import settings
from app.core.exceptions import AppError
from app.models.common import Envelope
from app.api import health


@asynccontextmanager
async def lifespan(app: FastAPI):
    missing = settings.missing_keys()
    if missing:
        print(f"[startup] ⚠️  missing keys: {missing}")
    else:
        print(f"[startup] ✅ env ok | provider={settings.llm_provider} | rag={settings.rag_enabled}")
    yield


app = FastAPI(title="AI Hackathon Framework", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=Envelope.error_response(
            code=type(exc).__name__,
            message=exc.message,
        ).model_dump(),
    )


@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content=Envelope.error_response(
            code="ValidationError",
            message=str(exc.errors()[0].get("msg", "Validation failed")),
        ).model_dump(),
    )


# ── 라우터 등록 ────────────────────────────────────
app.include_router(health.router)
from app.api import topic
app.include_router(topic.router)
