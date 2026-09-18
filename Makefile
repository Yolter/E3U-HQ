# E3U HQ — one-command helpers (works on Linux/macOS with Python 3.11+ and Node 20+).
.PHONY: dev install backend frontend admin seed test

install:
	cd backend && pip install -r requirements.txt
	cd frontend && yarn install

dev: install
	./scripts/dev.sh

backend:
	cd backend && uvicorn server:app --reload --port 8001

frontend:
	cd frontend && yarn dev

admin:
	cd backend && python create_admin.py

seed:
	cd backend && python seed.py

test:
	cd frontend && yarn typecheck
	cd backend && python -m pytest -q
