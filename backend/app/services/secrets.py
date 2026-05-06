def encrypt_secret(value: str | None) -> str | None:
    return value


def decrypt_secret(value: str | None) -> str | None:
    return value


def mask_secret(value: str | None) -> str | None:
    if not value:
        return None
    return "********"
