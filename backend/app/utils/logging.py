"""Logging configuration."""

import logging
import sys

from app.config import settings


def setup_logging() -> logging.Logger:
    """Configure application logging."""
    logger = logging.getLogger(settings.APP_NAME)
    logger.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)

    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    handler.setFormatter(formatter)

    logger.addHandler(handler)
    return logger


logger = setup_logging()



