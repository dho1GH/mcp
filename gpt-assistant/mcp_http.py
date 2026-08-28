import os

import uvicorn

from mcp_server import mcp


if __name__ == "__main__":
    host = os.getenv("MCP_HOST", "127.0.0.1")
    port = int(os.getenv("MCP_PORT", "8765"))
    reload = os.getenv("MCP_RELOAD", "false").lower() in ("1", "true", "yes")
    uvicorn.run(
        mcp.streamable_http_app(),
        host=host,
        port=port,
        reload=reload,
    )
