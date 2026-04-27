.PHONY: check test test-e2e typecheck lint format fix all dev build clean setup

# Full validation: check + test
all: check test

# Static analysis: typecheck + lint/format
check: typecheck lint

# TypeScript type checking
typecheck:
	@echo "→ TypeCheck..." && npx tsc --noEmit && echo "  ✓ TypeCheck passed"

# Lint and format check (Biome)
lint:
	@echo "→ Lint & Format..." && npx biome check . && echo "  ✓ Lint & Format passed"

# Auto-fix lint and format issues
fix:
	npx biome check --write .

format:
	npx biome format --write .

# Unit tests (Vitest)
test:
	@echo "→ Unit Tests..." && npx vitest run && echo "  ✓ Unit Tests passed"

# E2E tests (Playwright — requires dev server running)
test-e2e:
	@echo "→ E2E Tests..." && npx playwright test && echo "  ✓ E2E Tests passed"

# Dev server
dev:
	npm run dev

# Production build
build:
	npm run build

# Database migrations
db-generate:
	npx drizzle-kit generate --config drizzle.config.ts

db-migrate:
	npx drizzle-kit migrate --config drizzle.config.ts

db-push:
	npx drizzle-kit push --config drizzle.config.ts

# One-command local setup (requires Docker)
setup:
	@test -f .env || (cp .env.example .env && echo "  ✓ Created .env from .env.example")
	@node -e "const fs=require('fs'); const crypto=require('crypto'); const path='.env'; let env=fs.readFileSync(path,'utf8'); if(/^DASHBOARD_KEY=$$/m.test(env)){ env=env.replace(/^DASHBOARD_KEY=$$/m, 'DASHBOARD_KEY='+crypto.randomUUID()); fs.writeFileSync(path, env); console.log('  ✓ Generated DASHBOARD_KEY in .env'); }"
	@echo "→ Starting Postgres..." && docker compose up postgres -d
	@echo "→ Waiting for Postgres..." && until docker compose exec -T postgres pg_isready -U namuh >/dev/null 2>&1; do sleep 1; done && echo "  ✓ Postgres is ready"
	@echo "→ Installing dependencies..." && npm install
	@echo "→ Pushing schema..." && npx drizzle-kit push --config drizzle.config.ts
	@echo "→ Seeding database..." && npx tsx scripts/seed.ts
	@echo "\n✓ Setup complete! Run 'make dev' to start the server."

# Clean build artifacts
clean:
	rm -rf .next dist node_modules/.cache
