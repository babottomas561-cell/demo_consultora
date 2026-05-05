from typing import Any

from .seed_data import load_data, strip_internal_article_fields


DATA: dict[str, list[dict[str, Any]]] = {}


def get_data() -> dict[str, list[dict[str, Any]]]:
    global DATA
    if not DATA:
        DATA = load_data()
        DATA["articulos"] = strip_internal_article_fields(DATA["articulos"])
    return DATA
