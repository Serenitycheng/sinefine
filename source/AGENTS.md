<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Sinefine workflow

Apply the repository's `../AGENTS.md` and start with `../docs/development-handoff.md`. Keep the generated Next.js rules above intact. Render/test locally, reuse assets, and use `scripts/art-workflow.mjs` for compact local review copies; never poll by taking screenshots or dump historical image context. Detailed workflow: `../docs/low-traffic-development.md`.
