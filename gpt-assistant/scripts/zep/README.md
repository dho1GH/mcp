# Zep initialization

This folder contains helpers for creating or reusing the configured Zep Cloud
thread.

## Usage

```bash
source .venv/bin/activate
export ZEP_API_KEY="your_key"
export ZEP_USER_ID="default"
export ZEP_THREAD_ID="gpt-assistant-main"
python scripts/zep/init_user.py
```

Runtime chat adds both user and assistant messages to this thread so Zep can
build the user-level memory graph.
