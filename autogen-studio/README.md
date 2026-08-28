# Zep + AutoGen + MCP Workspace

## Setup

1. Create virtual environment:
   python3 -m venv .venv
   source .venv/bin/activate

2. Install requirements:
   pip install -r requirements.txt

3. Edit .env and add your API keys.

4. Run:
   python mcp_server.py

## Quick Local Test (without MCP client)
python - <<EOF
from app_agents.controller import handle_chat
print(handle_chat({"user_id":"test","input":"Hello system."}))
EOF
