# app.py
"""
Flask backend for the Python Code Analyser & Optimiser.

Endpoints
---------
POST /api/analyse
    Body : { "code": str, "optimization_level": "none" | "level1" | "level2" }
    Returns the full PipelineResult dict.

GET  /api/health
    Simple liveness probe.

CORS is enabled for all origins so the React/Vite dev server (typically
http://localhost:5173) can call freely. Tighten CORS_ORIGINS in production.
"""

import asyncio
import traceback

from flask import Flask, jsonify, request
from flask_cors import CORS

from core.pipeline import run_pipeline

# ─────────────────────────────────────────────────────────────────────────────
# APP SETUP
# ─────────────────────────────────────────────────────────────────────────────

app = Flask(__name__)

# Allow all origins in development; replace "*" with your deployed frontend URL
# in production, e.g. "https://yourapp.com"
CORS(app, resources={r"/api/*": {"origins": "*"}})

VALID_LEVELS = {"none", "level1", "level2"}


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _run_async(coro):
    """
    Run an async coroutine from a synchronous Flask view.
    Creates a fresh event loop each time to avoid conflicts.
    """
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def _error_response(message: str, status: int = 400):
    return jsonify({"error": message}), status


# ─────────────────────────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    """Liveness probe — used by the frontend to check if the server is up."""
    return jsonify({"status": "ok"}), 200


@app.route("/api/analyse", methods=["POST"])
def analyse():
    """
    Main analysis endpoint.

    Request JSON
    ------------
    {
        "code":               "<python source>",
        "optimization_level": "none" | "level1" | "level2"   (optional, default "none")
    }

    Response JSON
    -------------
    Full PipelineResult dict (see pipeline.py / _to_dict).

    Key fields the frontend should consume:
    ┌─────────────────────────────┬──────────────────────────────────────────┐
    │ passed_error_check          │ bool — false means code was rejected     │
    │ error_report                │ dict — full error_checker output         │
    │ error_report.security       │ list[str] — security issues found        │
    │ error_report.runtime_risks  │ list[str] — runtime warnings             │
    │ error_report.optimization   │ dict — optimization findings             │
    │ original_analysis           │ dict — complexity_checker output         │
    │ original_analysis.functions │ list — per-function metrics              │
    │ original_analysis.loc       │ dict — lines of code breakdown           │
    │ original_analysis.halstead  │ dict — Halstead metrics                  │
    │ original_analysis.          │                                          │
    │   maintainability_index     │ float — MI score 0-100                   │
    │ original_analysis.mi_label  │ "High" | "Moderate" | "Low"              │
    │ original_code               │ str — original submitted code            │
    │ optimized_code              │ str — optimized code (or same as above)  │
    │ optimized_analysis          │ dict — same shape as original_analysis   │
    │ optimization_level          │ str — which level was applied            │
    │ l1_changes                  │ list[str] — rule optimizer change notes  │
    │ l2.winning_model            │ str — which LLM won                      │
    │ l2.changes_applied          │ list[str] — LLM's own change notes       │
    │ l2.ranked_models            │ list[dict] — all model scores            │
    │ error                       │ str | null — pipeline-level error        │
    └─────────────────────────────┴──────────────────────────────────────────┘
    """
    # ── Parse + validate request ──────────────────────────────────────────────
    if not request.is_json:
        return _error_response("Request must be JSON (Content-Type: application/json)")

    body = request.get_json(silent=True) or {}

    code = body.get("code", "")
    if not isinstance(code, str) or not code.strip():
        return _error_response("'code' field is required and must be a non-empty string")

    optimization_level = body.get("optimization_level", "none")
    if optimization_level not in VALID_LEVELS:
        return _error_response(
            f"'optimization_level' must be one of: {sorted(VALID_LEVELS)}"
        )

    # ── Run pipeline ──────────────────────────────────────────────────────────
    try:
        result = _run_async(run_pipeline(code, optimization_level))
        return jsonify(result), 200

    except Exception:
        # Catch-all: log the traceback server-side, return a safe message
        traceback.print_exc()
        return _error_response(
            "Internal server error — check server logs for details.", 500
        )


# ─────────────────────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # debug=True for development — disable in production
    app.run(host="0.0.0.0", port=5000, debug=True)