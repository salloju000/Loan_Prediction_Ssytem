"""
main.py — FastAPI backend for the Loan Prediction System.

Run with:
    uvicorn main:app --port 8000

    # Development with auto-reload:
    uvicorn main:app --reload --port 8000

Environment variables:
    ALLOWED_ORIGINS   Comma-separated CORS origins (default: localhost dev servers)
    ARTIFACTS_PATH    Override path to model artifacts pickle file
    LOG_LEVEL         Logging level: DEBUG | INFO | WARNING | ERROR (default: INFO)

API Docs (auto-generated):
    http://localhost:8000/docs      ← Swagger UI
    http://localhost:8000/redoc     ← ReDoc
"""

from __future__ import annotations

import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from loan_predictor import ArtifactLoadError, LoanPredictor, PredictionError
from schemas import ErrorResponse, LoanPredictRequest, LoanPredictResponse
from logging_config import setup_logging

# ── Logging ───────────────────────────────────────────────────────────────────
setup_logging(os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
ARTIFACTS_PATH = Path(
    os.getenv("ARTIFACTS_PATH", str(BASE_DIR / "loan_model_artifacts.pkl"))
)

_DEFAULT_ORIGINS = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",  # CRA / fallback
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]
ALLOWED_ORIGINS: list[str] = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", ",".join(_DEFAULT_ORIGINS)).split(",")
    if o.strip()
]

API_VERSION = "1.0.0"

# ── Rate Limiting ─────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ── App state ─────────────────────────────────────────────────────────────────
# Stored on app.state so it's accessible in routes without a global variable.
# This avoids the fragile `global predictor` anti-pattern and is safe under
# async workers because it is written exactly once at startup.

# ── Lifespan (replaces deprecated @app.on_event) ─────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup; clean up on shutdown."""
    # ── Startup ───────────────────────────────────────────────────────────────
    app.state.predictor = None
    if not ARTIFACTS_PATH.exists():
        logger.error(
            "Model artifacts not found at '%s'. "
            "Run loan_pipeline.py first to generate loan_model_artifacts.pkl.",
            ARTIFACTS_PATH,
        )
    else:
        try:
            app.state.predictor = LoanPredictor(str(ARTIFACTS_PATH))
            logger.info("Model loaded successfully from '%s'", ARTIFACTS_PATH)
        except ArtifactLoadError as exc:
            logger.error("Failed to load model artifacts: %s", exc)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Unexpected error loading model: %s", exc)

    yield  # ── Application runs here ─────────────────────────────────────────

    # ── Shutdown ──────────────────────────────────────────────────────────────
    logger.info("Shutting down Loan Prediction API")


# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Loan Prediction API",
    description="""
## Loan Eligibility Prediction System

Predicts loan approval and sanctioned amount for 5 loan types:
- 🏠 Home Loan
- 🚗 Car Loan
- 🏍️ Bike Loan
- 📚 Education Loan
- 💼 Personal Loan

### How it works
1. Submit applicant details via `POST /predict`
2. Model 1 (classifier) predicts **approval probability**
3. Model 2 (regressor) predicts **sanctioned amount** (only if approved)
4. Full breakdown returned with financial health metrics
    """,
    version=API_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Middleware ────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_correlation_id_and_log(request: Request, call_next):
    """
    Middleware that:
    1. Generates/extracts a Correlation ID.
    2. Attaches it to logs for this request.
    3. Adds it to the response header.
    4. Logs the final status and duration.
    """
    correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))

    # Store on request state for easy access in routes if needed
    request.state.correlation_id = correlation_id

    start = time.perf_counter()

    # Process request
    response = await call_next(request)

    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
    response.headers["X-Correlation-ID"] = correlation_id

    # Structured log via 'extra'
    logger.info(
        "Request processed",
        extra={
            "correlation_id": correlation_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": elapsed_ms,
            "client_ip": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent", "unknown"),
        },
    )

    return response


@app.middleware("http")
async def csrf_protection_middleware(request: Request, call_next):
    """
    Prevent Cross-Site Request Forgery by enforcing strict Origin/Referer
    checks for state-changing methods.
    """
    # 1. Skip safe methods
    if request.method in ("GET", "HEAD", "OPTIONS", "TRACE"):
        return await call_next(request)

    # 2. Extract origin or referer
    origin = request.headers.get("origin")
    referer = request.headers.get("referer")

    # 3. Validate
    # In a cross-origin setting (which this API supports via CORS),
    # the browser SHOULD send an Origin header for POST requests.
    # We ensure either Origin or Referer matches our allowed list.
    source = origin or referer
    if not source:
        logger.warning(
            "CSRF block: Missing Origin/Referer header",
            extra={
                "correlation_id": getattr(request.state, "correlation_id", "unknown")
            },
        )
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": "CSRF protection: Missing Origin or Referer header"},
        )

    # Simple check: Does the source start with any of our allowed origins?
    is_allowed = any(source.startswith(o) for o in ALLOWED_ORIGINS)

    if not is_allowed:
        logger.warning(
            "CSRF block: Untrusted source",
            extra={
                "correlation_id": getattr(request.state, "correlation_id", "unknown"),
                "source": source,
            },
        )
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": f"CSRF protection: Source '{source}' is not trusted"},
        )

    return await call_next(request)


# ── Global exception handlers ─────────────────────────────────────────────────


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all: prevent raw tracebacks from leaking to clients."""
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred. Please try again later."
        },
    )


# ── Health endpoints ──────────────────────────────────────────────────────────


@app.get("/", tags=["Health"], include_in_schema=False)
async def root(request: Request):
    model_loaded = request.app.state.predictor is not None
    return {
        "service": "Loan Prediction API",
        "version": API_VERSION,
        "model_loaded": model_loaded,
        "status": "ok" if model_loaded else "model_not_loaded",
    }


@app.get(
    "/health",
    tags=["Health"],
    summary="Service health check",
    responses={
        200: {"description": "Service is healthy"},
        503: {"description": "Model not loaded — service is degraded"},
    },
)
async def health(request: Request):
    model_loaded = request.app.state.predictor is not None
    payload = {
        "status": "ok" if model_loaded else "degraded",
        "model_loaded": model_loaded,
        "version": API_VERSION,
    }
    status_code = (
        status.HTTP_200_OK if model_loaded else status.HTTP_503_SERVICE_UNAVAILABLE
    )
    return JSONResponse(content=payload, status_code=status_code)


# ── Prediction endpoint ───────────────────────────────────────────────────────


@app.post(
    "/predict",
    response_model=LoanPredictResponse,
    status_code=status.HTTP_200_OK,
    responses={
        422: {"model": ErrorResponse, "description": "Input validation error"},
        500: {"model": ErrorResponse, "description": "Model inference error"},
        503: {"model": ErrorResponse, "description": "Model not loaded"},
    },
    tags=["Prediction"],
    summary="Predict loan eligibility and sanctioned amount",
)
@limiter.limit("10/minute")
async def predict(request: Request, body: LoanPredictRequest):
    """
    Submit applicant details and receive:

    - **approved** — boolean approval decision
    - **approval_probability** — confidence score (0–100%)
    - **loan_grade** — A+ to E rating
    - **sanctioned_amount** — amount the bank would sanction
    - **monthly_emi** — projected monthly EMI
    - **rejection_reasons** — specific reasons if rejected
    - **breakdown** — full financial health analysis
    """
    predictor: LoanPredictor | None = request.app.state.predictor

    if predictor is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model not loaded. Please contact the system administrator.",
        )

    applicant = _request_to_applicant(body)

    try:
        result = predictor.predict(applicant)
    except PredictionError as exc:
        logger.error("Prediction failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Model inference failed. Please try again or contact support.",
        ) from exc

    # Predictor returns {"status": "error", "errors": [...]} for validation issues.
    # These shouldn't normally occur since Pydantic already validates the schema,
    # but we guard against any edge cases in the predictor's own validation layer.
    if result.get("status") == "error":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": "Input validation failed at the prediction layer",
                "errors": result.get("errors", []),
            },
        )

    return result


# ── Helpers ───────────────────────────────────────────────────────────────────


def _request_to_applicant(req: LoanPredictRequest) -> dict[str, Any]:
    """
    Convert a validated Pydantic request model into the flat dict
    expected by LoanPredictor.predict().

    Keeps main.py free of scattered `if field is not None` checks and
    makes it trivial to test the mapping in isolation.
    """
    applicant: dict[str, Any] = {
        "loan_type": req.loan_type.value,
        "age": req.age,
        "gender": req.gender.value,
        "marital_status": req.marital_status.value,
        "dependents": req.dependents,
        "education": req.education.value,
        "employment_type": req.employment_type.value,
        "years_of_experience": req.years_of_experience,
        "monthly_income": req.monthly_income,
        "coapplicant_income": req.coapplicant_income,
        "credit_score": req.credit_score,
        "existing_emis": req.existing_emis,
        "existing_loans_count": req.existing_loans_count,
        "property_area": req.property_area.value,
        "loan_amount_requested": req.loan_amount_requested,
        "loan_tenure_months": req.loan_tenure_months,
    }

    # Conditional loan-type-specific fields — only include when provided
    optional_fields: dict[str, Any] = {
        "property_value": req.property_value,
        "vehicle_price": req.vehicle_price,
        "vehicle_age_years": req.vehicle_age_years,
        "course_type": req.course_type.value if req.course_type is not None else None,
        "institution_tier": req.institution_tier.value
        if req.institution_tier is not None
        else None,
    }
    applicant.update({k: v for k, v in optional_fields.items() if v is not None})

    return applicant


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",  # noqa: S104
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("RELOAD", "false").lower() == "true",
        log_level=os.getenv("LOG_LEVEL", "info").lower(),
    )
