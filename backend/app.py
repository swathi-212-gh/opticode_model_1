from flask import Flask, request, jsonify
from flask_cors import CORS
from core.pipeline import process_code

app = Flask(__name__)
CORS(app)  # allows React (Vite) to call backend later

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json(silent=True)

    if not data or "code" not in data:
        return jsonify({
            "status": "error",
            "errors": ["No code provided"]
        }), 400

    code = data["code"]

    result = process_code(code)
    return jsonify(result), 200


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    app.run(debug=True)
