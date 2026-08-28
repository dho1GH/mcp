from __future__ import annotations

from config.settings import get_settings
from mcp_app import create_mcp_app

mcp = create_mcp_app()

if __name__ == "__main__":
    settings = get_settings()
    mcp.run(transport=settings.mcp_transport)
