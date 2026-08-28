import uvicorn

from config.settings import get_settings
from mcp_app import create_mcp_app


if __name__ == "__main__":
    settings = get_settings()
    mcp = create_mcp_app()
    uvicorn.run(
        mcp.streamable_http_app(),
        host=settings.mcp_host,
        port=settings.mcp_port,
        reload=settings.mcp_reload,
    )
