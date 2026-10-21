SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := dev

.PHONY: dev frontend backend

# Job control gives each server its own process group so cleanup includes children.
dev:
	@set -m; \
	cleanup() { \
		trap - EXIT INT TERM; \
		for pid in $$(jobs -pr); do kill -- -$$pid 2>/dev/null || true; done; \
		wait || true; \
	}; \
	trap cleanup EXIT; \
	trap 'exit 130' INT; \
	trap 'exit 143' TERM; \
	(cd client && exec npm run dev) & \
	(cd server && exec uv run --locked python -m app local) & \
	wait -n

frontend:
	cd client && npm run dev

backend:
	cd server && uv run --locked python -m app local
