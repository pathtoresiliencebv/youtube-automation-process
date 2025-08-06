# CRUSH.md

Build, Lint, Typecheck, Dev
- Dev server: npm run dev
- Build: npm run build
- Start (prod): npm run start
- Lint: npm run lint
- Typecheck: npm run type-check

Seeding & Backends
- Seed Postgres: npm run seed:postgres
- Seed Convex: npm run seed:convex
- Seed all: npm run seed:all
- Convex dev server: npx convex dev
- Convex deploy: npx convex deploy

Testing
- No test framework configured in package.json. If you add one (e.g. vitest/jest), add single-test commands here, e.g.: npx vitest run path/to.test.ts or npx jest path/to.test.ts -t "test name"

Code Style Guidelines (TypeScript + Next.js)
- Modules/imports: absolute from src/ when configured by tsconfig, otherwise relative; group: std libs, third-party, internal; keep side-effect imports separate
- Formatting: Prettier-style 2-space, single quotes where allowed, trailing commas where valid; keep files free of comments unless needed
- Types: prefer explicit types on public functions; use interfaces for object shapes and types for unions; narrow with guards; avoid any; use unknown over any for external inputs
- Naming: camelCase for vars/functions, PascalCase for components/types, UPPER_SNAKE_CASE for const env keys; file names kebab-case, React components .tsx
- React/Next: use client only where needed; keep server routes in app/api/**/route.ts; avoid blocking ops in serverless handlers; validate req bodies
- Error handling: never leak secrets; wrap external I/O (DB, APIs) in try/catch with safe messages; log via convex/system logs where applicable; return standardized JSON { success, data?, error? }
- Env: access via process.env; never log keys; mirror required keys in .env.example; use NEXT_PUBLIC_ prefix only for safe client vars
- API patterns: return Response.json(..., { status }); validate inputs; throttle/guard bulk endpoints; follow statuses from CLAUDE.md video lifecycle
- Security: sanitize user input; avoid storing secrets client-side; use POST for mutations; check auth where required; do not commit .env or keys

Cursor/Copilot rules
- If .cursor/rules/, .cursorrules, or .github/copilot-instructions.md exist, follow them; mirror key constraints here; keep AI agents from creating secrets, modifying git config, or pushing

Conventions
- Tailwind: prefer class-variance-authority and tailwind-merge utilities already used; keep UI components in src/components/ui
- Analytics/Convex: use convex functions in convex/*.ts and keep schema changes in convex/schema.ts

Single-test placeholder
- After adding a test framework, record the exact single-test command here for quick use
