# Zep initialization

This folder contains helpers for initializing Zep and creating a user.

## Usage

```bash
source .venv/bin/activate
export ZEP_API_BASE="http://localhost:8000"
export ZEP_API_KEY="your_key_if_needed"
export ZEP_USER_ID="default"
python scripts/zep/init_user.py
```

The script tries:
- `GET /healthz` and `GET /health`
- `POST /v1/users`
- `POST /v1/user/{user_id}`
