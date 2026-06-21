import pytest
from app.pipeline.normalizer import normalize_text, normalize_repository_text

def test_normalize_plain_text():
    text = "Hello World"
    normalized, code_blocks = normalize_text(text)
    assert normalized == "hello world"
    assert code_blocks == []

def test_normalize_markdown_headings():
    text = "# Title\n## Subtitle\nSome text"
    normalized, code_blocks = normalize_text(text)
    # Check that # and ## are stripped and text is lowercased
    assert "title" in normalized
    assert "subtitle" in normalized
    assert "#" not in normalized

def test_normalize_bold_and_italic():
    text = "This is **bold** and *italic*."
    normalized, code_blocks = normalize_text(text)
    assert normalized == "this is bold and italic ."
    assert "**" not in normalized
    assert "*" not in normalized

def test_normalize_fenced_code_blocks():
    text = "Check this code:\n```python\nprint('Hello World')\n```"
    normalized, code_blocks = normalize_text(text)
    # The code block content should preserve capitalization
    assert "print('Hello World')" in normalized
    assert code_blocks == ["print('Hello World')\n"]

def test_normalize_inline_code():
    text = "Use the `FunctionCall()` here."
    normalized, code_blocks = normalize_text(text)
    assert "FunctionCall()" in normalized
    assert code_blocks == ["FunctionCall()"]

def test_normalize_repository_text():
    repo = {
        "name": "MyProject",
        "description": "A **cool** project.",
        "readme": "```javascript\nconsole.log('hi')\n```",
        "commits": ["Initial commit", "Fix Bug"]
    }
    normalized, code_blocks = normalize_repository_text(repo)
    assert "myproject" in normalized
    assert "cool" in normalized
    assert "console.log('hi')" in normalized
    assert "initial commit" in normalized
    assert "fix bug" in normalized
    assert code_blocks == ["console.log('hi')\n"]

def test_empty_text():
    normalized, code_blocks = normalize_text("")
    assert normalized == ""
    assert code_blocks == []
