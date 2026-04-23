BANNED_FRAGMENTS = ["씨발", "ㅅㅂ", "fuck", "shit", "병신"]


def contains_banned(text: str) -> bool:
    lowered = text.lower()
    return any(b in lowered for b in BANNED_FRAGMENTS)
