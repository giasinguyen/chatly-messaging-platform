.PHONY: lint format test test-cov run

lint:
	uv run ruff check app tests
	uv run ruff format --check app tests
	uv run mypy app

format:
	uv run ruff format app tests
	uv run ruff check --fix app tests

test:
	uv run pytest tests -v

test-cov:
	uv run pytest --cov=app --cov-report=term-missing --cov-report=html

run:
	uv run uvicorn app.main:app --reload --port 8000
