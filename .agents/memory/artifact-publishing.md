---
name: Artifact publishing
description: Environment-specific constraints for publishing managed API artifacts
---

Managed artifact production builders may not expose the workspace `pnpm` executable, even though development workflows use pnpm successfully.

**Why:** A publish attempt failed before the build started with `ENOENT: spawn pnpm ENOENT`, while the same API built and ran correctly in the workspace.

**How to apply:** For Node API artifacts, configure the production build to invoke the artifact's build entrypoint directly with `node` when possible, then verify the production bundle and health endpoint locally before asking the user to publish.