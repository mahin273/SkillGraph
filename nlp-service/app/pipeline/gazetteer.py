import json
from functools import lru_cache
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "tech_gazetteer.json"


@lru_cache(maxsize=1)
def load_terms() -> dict[str, list[str]]:
    with DATA_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def all_skill_aliases() -> dict[str, set[str]]:
    terms = load_terms()
    aliases: dict[str, set[str]] = {}

    for skill in terms["skills"]:
        aliases[skill["name"]] = {skill["name"].lower(), *[alias.lower() for alias in skill.get("aliases", [])]}

    return aliases
