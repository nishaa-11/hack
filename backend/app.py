import os
import sqlite3
from datetime import datetime

from flask import Flask, jsonify, request
from flask_cors import CORS

DB_PATH = os.path.join(os.path.dirname(__file__), "complaints.db")

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})


def get_db_connection():
    """Create a SQLite connection for the complaints database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create the complaints table if it does not already exist."""
    with get_db_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS complaints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                description TEXT NOT NULL,
                location TEXT NOT NULL,
                priority TEXT NOT NULL CHECK(priority IN ('High','Medium','Low')),
                status TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open','Resolved')),
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def seed_demo_data():
    """Populate the database with a few sample complaints on first run."""
    with get_db_connection() as conn:
        count = conn.execute("SELECT COUNT(*) FROM complaints").fetchone()[0]
        if count > 0:
            return

        sample_rows = [
            ("Pothole on 12th Main Road", "Jayanagar", "High", "Open", datetime.now().isoformat()),
            ("Streetlight not working near park", "Koramangala", "Medium", "Open", datetime.now().isoformat()),
            ("Garbage overflow by market gate", "Indiranagar", "High", "Resolved", datetime.now().isoformat()),
            ("Water leak from broken pipe", "Whitefield", "Low", "Open", datetime.now().isoformat()),
        ]
        conn.executemany(
            """
            INSERT INTO complaints (description, location, priority, status, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            sample_rows,
        )
        conn.commit()


init_db()
seed_demo_data()


@app.get("/api/complaints")
def get_complaints():
    """Return complaints + dashboard aggregates for the admin UI."""
    with get_db_connection() as conn:
        complaints = conn.execute(
            """
            SELECT id, description, location, priority, status, created_at
            FROM complaints
            ORDER BY created_at DESC
            """
        ).fetchall()

        total_reports = len(complaints)
        open_issues = sum(1 for row in complaints if row["status"] == "Open")
        resolved_today = sum(1 for row in complaints if row["status"] == "Resolved")

        payload = {
            "metrics": {
                "openIssues": open_issues,
                "resolvedToday": resolved_today,
                "totalReports": total_reports,
            },
            "queue": [dict(row) for row in complaints],
        }

    return jsonify(payload)


@app.post("/api/complaints")
def create_complaint():
    """Create a new complaint from the admin form modal."""
    data = request.get_json(silent=True) or {}
    description = (data.get("description") or "").strip()
    location = (data.get("location") or "").strip()
    priority = (data.get("priority") or "Medium").strip().capitalize()

    if not description or not location:
        return jsonify({"error": "description and location are required"}), 400

    if priority not in {"High", "Medium", "Low"}:
        priority = "Medium"

    with get_db_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO complaints (description, location, priority, status, created_at)
            VALUES (?, ?, ?, 'Open', ?)
            """,
            (description, location, priority, datetime.now().isoformat()),
        )
        conn.commit()
        complaint_id = cursor.lastrowid
        row = conn.execute(
            "SELECT id, description, location, priority, status, created_at FROM complaints WHERE id = ?",
            (complaint_id,),
        ).fetchone()

    return jsonify(dict(row)), 201


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
