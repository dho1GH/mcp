# Federated MCP Platform

This workspace implements the control-plane foundation for an authenticated,
human-in-the-loop MCP federation on Cloudflare.

The selected production shape is one Cloudflare MCP Portal in front of
independently deployed domain MCP Workers. Side-effecting tools create durable
approval requests instead of executing during the original MCP request.

Current status: architecture and local control-plane implementation in
progress. Nothing in this workspace has been deployed.

See:

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/research-notes.md`](docs/research-notes.md)

