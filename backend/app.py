"""
Flask backend for the Python Code Analyser & Optimiser.

- MongoDB Atlas integrated for user signup/login
- Session save/load endpoints for profile history
- CORS enabled for React/Vite dev server (http://localhost:5173)
"""

import asyncio
import sys
import traceback
from datetime import datetime
from bson import ObjectId
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from pymongo import MongoClient
import os
import threading

load_dotenv()

# FIX: Windows requires ProactorEventLoop for asyncio subprocess support
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

app = Flask(__name__)
CORS(app)
bcrypt = Bcrypt(app)

from core.pipeline import run_pipeline

# ─────────── MongoDB Atlas setup ───────
mongo_client = MongoClient(os.getenv("MONGO_URI"))
db           = mongo_client["opticode"]
users        = db["users"]
sessions_col = db["sessions"]

# ─────────── Helpers ───────────────────
VALID_LEVELS = {"level1", "level2"}


def _run_async(coro):
    try:
        return asyncio.run(coro)
    except RuntimeError:
        result = None
        exc    = None

        def _runner():
            nonlocal result, exc
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                result = loop.run_until_complete(coro)
            except Exception as e:
                exc = e
            finally:
                try:
                    loop.close()
                except Exception:
                    pass

        t = threading.Thread(target=_runner)
        t.start()
        t.join()
        if exc:
            raise exc
        return result


def _error_response(message: str, status: int = 400):
    return jsonify({"error": message}), status


def _serialize_session(doc: dict) -> dict:
    """Convert MongoDB doc to JSON-safe dict."""
    doc["id"] = str(doc.pop("_id"))
    return doc


# ─────────── Auth Endpoints ────────────

@app.route("/api/signup", methods=["POST"])
def signup():
    data     = request.get_json()
    name     = data.get("name")
    email    = data.get("email")
    password = data.get("password")

    if not (name and email and password):
        return jsonify({"error": "All fields are required"}), 400

    if users.find_one({"email": email}):
        return jsonify({"error": "User already exists"}), 400

    hashed_pw = bcrypt.generate_password_hash(password).decode("utf-8")
    users.insert_one({"name": name, "email": email, "password": hashed_pw})

    return jsonify({
        "message": "User created successfully",
        "name":    name,
        "email":   email,
        "bio":     "",
    }), 201


@app.route("/api/login", methods=["POST"])
def login():
    data     = request.get_json()
    email    = data.get("email")
    password = data.get("password")

    user = users.find_one({"email": email})
    if not user or not bcrypt.check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    return jsonify({
        "message": "Login successful",
        "name":    user["name"],
        "email":   user["email"],
        "bio":     user.get("bio", ""),
    })


@app.route("/api/update-profile", methods=["POST"])
def update_profile():
    data  = request.get_json()
    email = data.get("email")
    name  = data.get("name")
    bio   = data.get("bio", "")

    if not (email and name):
        return _error_response("'email' and 'name' are required")

    users.update_one({"email": email}, {"$set": {"name": name, "bio": bio}})
    return jsonify({"message": "Profile updated", "name": name, "bio": bio})


# ─────────── Session Endpoints ─────────

@app.route("/api/sessions", methods=["POST"])
def save_session():
    """
    Save a new analysis session.
    Body: { email, name, optimization_level, original_code, optimized_code,
            original_analysis, optimized_analysis, l1_changes, l2, error_report }
    Returns: { id: <mongo_id> }
    """
    data  = request.get_json()
    email = data.get("email")

    if not email:
        return _error_response("'email' is required to save a session")

    doc = {
        "email":              email,
        "name":               data.get("name", "Untitled Session"),
        "optimization_level": data.get("optimization_level", "level1"),
        "original_code":      data.get("original_code", ""),
        "optimized_code":     data.get("optimized_code", ""),
        "original_analysis":  data.get("original_analysis", {}),
        "optimized_analysis": data.get("optimized_analysis", {}),
        "l1_changes":         data.get("l1_changes", []),
        "l2":                 data.get("l2", {}),
        "error_report":       data.get("error_report", {}),
        "saved_at":           datetime.utcnow().isoformat(),
    }

    result = sessions_col.insert_one(doc)
    return jsonify({"id": str(result.inserted_id), "message": "Session saved"}), 201


@app.route("/api/sessions/<email>", methods=["GET"])
def get_sessions(email: str):
    """Return all saved sessions for a user, newest first."""
    docs = list(
        sessions_col
        .find({"email": email})
        .sort("saved_at", -1)
        .limit(100)
    )
    return jsonify([_serialize_session(d) for d in docs])


@app.route("/api/sessions/delete/<session_id>", methods=["DELETE"])
def delete_session(session_id: str):
    """Delete a single session by its Mongo ObjectId."""
    try:
        res = sessions_col.delete_one({"_id": ObjectId(session_id)})
        if res.deleted_count == 0:
            return _error_response("Session not found", 404)
        return jsonify({"message": "Deleted"})
    except Exception as e:
        return _error_response(str(e))

@app.route("/api/sessions/item/<session_id>", methods=["PATCH"])
def rename_session(session_id: str):
    """Rename a session."""
    data = request.get_json()
    name = (data.get("name") or "").strip()
    if not name:
        return _error_response("'name' is required")
    try:
        sessions_col.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"name": name}},
        )
        return jsonify({"message": "Renamed"})
    except Exception as e:
        return _error_response(str(e))


# ─────────── Analysis Endpoint ─────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


@app.route("/api/analyse", methods=["POST"])
def analyse():
    if not request.is_json:
        return _error_response("Request must be JSON")

    body = request.get_json(silent=True) or {}
    code = body.get("code", "")
    if not isinstance(code, str) or not code.strip():
        return _error_response("'code' field is required")

    optimization_level = body.get("optimization_level")
    if optimization_level not in VALID_LEVELS:
        return _error_response(
            f"'optimization_level' must be one of {sorted(VALID_LEVELS)}"
        )

    try:
        result = _run_async(run_pipeline(code, optimization_level))
        return jsonify(result), 200
    except Exception:
        traceback.print_exc()
        return _error_response("Internal server error", 500)


# ─────────── Entry Point ───────────────
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)