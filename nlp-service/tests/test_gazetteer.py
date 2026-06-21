import pytest
from unittest.mock import patch
from app.pipeline.gazetteer import all_skill_aliases

def test_all_skill_aliases():
    mock_data = {
        "skills": [
            {"name": "Python", "category": "Language", "aliases": ["Py", "CPython"]},
            {"name": "React", "category": "Library", "aliases": ["ReactJS"]}
        ]
    }
    
    with patch("app.pipeline.gazetteer.load_terms", return_value=mock_data):
        aliases = all_skill_aliases()
        
        assert "Python" in aliases
        assert "python" in aliases["Python"]
        assert "py" in aliases["Python"]
        assert "cpython" in aliases["Python"]
        
        assert "React" in aliases
        assert "react" in aliases["React"]
        assert "reactjs" in aliases["React"]

def test_all_skill_aliases_no_aliases():
    mock_data = {
        "skills": [
            {"name": "Git", "category": "Tool"}
        ]
    }
    
    with patch("app.pipeline.gazetteer.load_terms", return_value=mock_data):
        aliases = all_skill_aliases()
        assert "Git" in aliases
        assert aliases["Git"] == {"git"}
