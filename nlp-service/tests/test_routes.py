import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app

@pytest.fixture(autouse=True)
def mock_nlp_error():
    with patch("app.routes._NLP_LOAD_ERROR", None):
        yield

@pytest.fixture
def client():
    return TestClient(app)

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"success": True, "data": {"service": "nlp-service", "status": "ok"}}

def test_root_redirect(client):
    response = client.get("/", follow_redirects=False)
    assert response.status_code == 307
    assert response.headers["location"] == "/docs"

def test_gazetteer_stats(client):
    mock_data = {
        "skills": [
            {"name": "Python", "category": "Language"},
            {"name": "Java", "category": "Language"},
            {"name": "React", "category": "Library"}
        ]
    }
    
    with patch("app.routes.load_terms", return_value=mock_data):
        response = client.get("/api/v1/nlp/gazetteer/stats")
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["total_terms"] == 3
        assert data["categories"]["Language"] == 2
        assert data["categories"]["Library"] == 1

@patch("app.routes.extract_skills")
@patch("redis.from_url")
def test_extract_endpoint(mock_redis, mock_extract, client):
    mock_extract.return_value = {"Python": 0.9}
    mock_client = MagicMock()
    mock_redis.return_value = mock_client
    
    payload = {
        "student_id": "student-1",
        "repositories": [{"name": "repo1", "description": "python project"}]
    }
    
    response = client.post("/api/v1/nlp/extract", json=payload)
    
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"] == {"Python": 0.9}
    
    # Verify redis call
    mock_client.xadd.assert_called_once()

@patch("app.routes.extract_skills")
@patch("redis.from_url")
def test_extract_batch_endpoint(mock_redis, mock_extract, client):
    mock_extract.side_effect = [{"Python": 0.9}, {"React": 0.8}]
    mock_client = MagicMock()
    mock_redis.return_value = mock_client
    
    payload = {
        "requests": [
            {"student_id": "s1", "repositories": []},
            {"student_id": "s2", "repositories": []}
        ]
    }
    
    response = client.post("/api/v1/nlp/extract/batch", json=payload)
    
    assert response.status_code == 200
    assert len(response.json()["data"]) == 2
    assert response.json()["data"][0] == {"Python": 0.9}
    assert response.json()["data"][1] == {"React": 0.8}
    
    assert mock_client.xadd.call_count == 2
