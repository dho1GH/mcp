# Third-party origin

This directory was not written from scratch in this repository. Its contents —
the server implementation, `docker/`, `config/`, and the `tests/` suite —
match the MCP server distributed with the upstream **Graphiti** project:

- Upstream: https://github.com/getzep/graphiti
- Upstream license: Apache License 2.0

## Why this matters for the org move

Apache-2.0 permits redistribution, but it requires that you:

1. Retain the upstream copyright and license text,
2. State any significant changes you made to the files,
3. Include a copy of the Apache-2.0 license with the distribution.

None of that is currently present in this repository.

## Action required (not yet done)

- [ ] Confirm the exact upstream version/commit this was copied from.
- [ ] Add the upstream `LICENSE` (Apache-2.0) file into this directory.
- [ ] Record local modifications made to the upstream code, if any.
- [ ] Decide whether to keep this vendored copy at all, or instead depend on
      the upstream package and delete this directory. Depending on upstream is
      the lower-maintenance option and removes the attribution burden entirely.

Until the above is resolved, treat this directory as third-party code and keep
the repository private.
