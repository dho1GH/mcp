import os
import sqlite3
from pathlib import Path
from typing import Optional

DB_PATH = Path(os.getenv("ASSISTANT_DB_PATH", "assistant.db"))

def _conn() -> sqlite3.Connection:
    return sqlite3.connect(DB_PATH)

def init_db() -> None:
    with _conn() as c:
        c.execute("""
        CREATE TABLE IF NOT EXISTS user_conversations (
            user_id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            created_at INTEGER DEFAULT (strftime('%s','now'))
        );
        """)
        c.execute("""
        CREATE TABLE IF NOT EXISTS vector_stores (
            name TEXT PRIMARY KEY,
            vector_store_id TEXT NOT NULL,
            created_at INTEGER DEFAULT (strftime('%s','now'))
        );
        """)
        c.commit()

def get_conversation_id(user_id: str) -> Optional[str]:
    with _conn() as c:
        row = c.execute(
            "SELECT conversation_id FROM user_conversations WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        return row[0] if row else None

def set_conversation_id(user_id: str, conversation_id: str) -> None:
    with _conn() as c:
        c.execute(
            "INSERT OR REPLACE INTO user_conversations(user_id, conversation_id) VALUES(?, ?)",
            (user_id, conversation_id),
        )
        c.commit()


def get_vector_store_id(name: str = "default") -> Optional[str]:
    with _conn() as c:
        row = c.execute(
            "SELECT vector_store_id FROM vector_stores WHERE name = ?",
            (name,),
        ).fetchone()
        return row[0] if row else None


def set_vector_store_id(name: str, vector_store_id: str) -> None:
    with _conn() as c:
        c.execute(
            "INSERT OR REPLACE INTO vector_stores(name, vector_store_id) VALUES(?, ?)",
            (name, vector_store_id),
        )
        c.commit()
