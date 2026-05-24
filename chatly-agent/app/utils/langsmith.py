"""Optional LangSmith bootstrap for runtime tracing."""

import logging
import os

from app.config import settings

logger = logging.getLogger(__name__)


def configure_langsmith() -> None:
    """Configure LangSmith tracing from settings when available.

    Behavior:
    - If tracing flag is off, explicitly disable LangSmith tracing.
    - If tracing flag is on but API key is missing, disable tracing and log why.
    - If tracing flag is on and API key is present, configure LangSmith env vars.
    """
    if not settings.langsmith_tracing:
        os.environ["LANGSMITH_TRACING"] = "false"
        logger.info("LangSmith tracing disabled (LANGSMITH_TRACING=false)")
        return

    if not settings.langsmith_api_key:
        os.environ["LANGSMITH_TRACING"] = "false"
        logger.warning(
            "LangSmith tracing requested but LANGSMITH_API_KEY is missing; tracing disabled"
        )
        return

    os.environ["LANGSMITH_TRACING"] = "true"
    os.environ["LANGSMITH_ENDPOINT"] = settings.langsmith_endpoint
    os.environ["LANGSMITH_API_KEY"] = settings.langsmith_api_key
    os.environ["LANGSMITH_PROJECT"] = settings.langsmith_project

    logger.info(
        "LangSmith tracing enabled endpoint=%s project=%s",
        settings.langsmith_endpoint,
        settings.langsmith_project,
    )
