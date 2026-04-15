import logging

logger = logging.getLogger("farm.audit")


def log_negative_coin_clamp(user_id: int, attempted_delta: int, before: int):
    logger.warning(
        "coin_clamp user=%s attempted_delta=%s before=%s after=0",
        user_id, attempted_delta, before,
    )
