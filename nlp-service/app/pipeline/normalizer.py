"""
Step 1 of the NLP extraction pipeline: text normalization.

Strips markdown syntax, lowercases non-code spans, and preserves
capitalization inside fenced code blocks.

Returns a tuple: (normalized_text, code_blocks)
  - normalized_text: plain text with markdown stripped and non-code spans lowercased
  - code_blocks: list of original code block strings (capitalization preserved)
"""

import re
from typing import Optional

try:
    import mistune
    _MISTUNE_AVAILABLE = True
except ImportError:
    mistune = None  # type: ignore[assignment]
    _MISTUNE_AVAILABLE = False

# Regex patterns for fenced code blocks (``` or ~~~) and inline code (`...`)
_FENCED_CODE_RE = re.compile(
    r"```(?:[^\n]*)?\n(.*?)```|~~~(?:[^\n]*)?\n(.*?)~~~",
    re.DOTALL,
)
_INLINE_CODE_RE = re.compile(r"`([^`\n]+)`")

# Markdown syntax characters to strip when mistune is unavailable
_MARKDOWN_SYNTAX_RE = re.compile(
    r"(?:"
    r"#{1,6}\s+"          # ATX headings
    r"|[*_]{1,3}"         # bold / italic markers
    r"|!\[.*?\]\(.*?\)"   # images
    r"|\[.*?\]\(.*?\)"    # links
    r"|>\s?"              # blockquotes
    r"|\-{3,}|={3,}"      # horizontal rules
    r"|\|"                # table pipes
    r")"
)

# Residual HTML tags (produced by mistune)
_HTML_TAG_RE = re.compile(r"<[^>]+>")

# Collapse multiple whitespace characters into a single space
_WHITESPACE_RE = re.compile(r"\s+")


def _extract_code_blocks(text: str) -> tuple[str, list[str]]:
    """
    Replace fenced and inline code blocks with placeholders.

    Returns:
        (text_with_placeholders, list_of_original_code_strings)
    """
    code_blocks: list[str] = []

    def _replace_fenced(match: re.Match) -> str:
        # Group 1 = ``` block content, group 2 = ~~~ block content
        content = match.group(1) or match.group(2) or ""
        placeholder = f"\x00CODE{len(code_blocks)}\x00"
        code_blocks.append(content)
        return f" {placeholder} "

    def _replace_inline(match: re.Match) -> str:
        content = match.group(1)
        placeholder = f"\x00CODE{len(code_blocks)}\x00"
        code_blocks.append(content)
        return f" {placeholder} "

    text = _FENCED_CODE_RE.sub(_replace_fenced, text)
    text = _INLINE_CODE_RE.sub(_replace_inline, text)
    return text, code_blocks


def _strip_markdown(text: str) -> str:
    """Strip markdown syntax from text, returning plain text."""
    if _MISTUNE_AVAILABLE:
        # mistune renders to HTML; strip the HTML tags afterwards
        try:
            html: str = mistune.html(text)  # type: ignore[attr-defined]
            text = _HTML_TAG_RE.sub(" ", html)
        except Exception:
            # Fall back to regex stripping if mistune fails
            text = _MARKDOWN_SYNTAX_RE.sub(" ", text)
    else:
        text = _MARKDOWN_SYNTAX_RE.sub(" ", text)
    return text


def normalize_text(text: str) -> tuple[str, list[str]]:
    """
    Normalize a text string for NLP processing.

    Steps:
      1. Extract fenced and inline code blocks, replacing them with placeholders
         so their capitalization is preserved.
      2. Strip markdown syntax from the remaining text.
      3. Lowercase all non-code spans.
      4. Restore code block placeholders (kept as-is, capitalization preserved).
      5. Collapse whitespace.

    Args:
        text: Raw text (may contain markdown).

    Returns:
        A tuple (normalized_text, code_blocks) where:
          - normalized_text is the cleaned, lowercased plain text with code
            block placeholders replaced by their original content.
          - code_blocks is the list of original code block strings.
    """
    if not text:
        return "", []

    # Step 1: Extract code blocks → placeholders
    text_with_placeholders, code_blocks = _extract_code_blocks(text)

    # Step 2: Strip markdown from non-code spans
    stripped = _strip_markdown(text_with_placeholders)

    # Step 3: Lowercase non-code spans
    lowercased = stripped.lower()

    # Step 4: Restore code blocks (preserve original capitalization)
    for idx, block in enumerate(code_blocks):
        placeholder = f"\x00code{idx}\x00"  # lowercased version of placeholder
        lowercased = lowercased.replace(placeholder, block)

    # Step 5: Collapse whitespace
    normalized = _WHITESPACE_RE.sub(" ", lowercased).strip()

    return normalized, code_blocks


def normalize_repository_text(repository: dict) -> tuple[str, list[str]]:
    """
    Normalize all text fields from a repository dict.

    Concatenates name, description, readme, and commit messages, then
    applies normalize_text().

    Args:
        repository: Dict with optional keys: name, description, readme, commits.

    Returns:
        A tuple (normalized_text, code_blocks).
    """
    parts = [
        repository.get("name", ""),
        repository.get("description", ""),
        repository.get("readme", ""),
        " ".join(repository.get("commits", [])),
    ]
    raw_text = "\n".join(part for part in parts if part)
    return normalize_text(raw_text)
