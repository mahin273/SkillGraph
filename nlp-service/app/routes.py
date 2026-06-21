from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
import os
import json
import redis

from app.pipeline.extractor import extract_skills, _NLP_LOAD_ERROR
from app.pipeline.gazetteer import load_terms

router = APIRouter()


class ExtractRequest(BaseModel):
    student_id: str
    repositories: list[dict]


class BatchExtractRequest(BaseModel):
    requests: list[ExtractRequest]


@router.post("/nlp/extract")
def extract(payload: ExtractRequest) -> dict:
    """
    Extract skills from a single student's repositories.
    
     Publish extraction results to graph:update:queue Redis Stream.
    Return HTTP 503 if the spaCy model failed to load.
    """
    if _NLP_LOAD_ERROR:
        raise HTTPException(
            status_code=503,
            detail=f"NLP service unavailable: {_NLP_LOAD_ERROR}",
        )

    extracted = extract_skills(payload.student_id, payload.repositories)
    
    # Publish to Redis Stream
    try:
        client = redis.from_url(
            os.getenv("REDIS_URL", "redis://redis:6379"), decode_responses=True
        )
        client.xadd(
            "graph:update:queue",
            {
                "studentId": payload.student_id,
                "payload": json.dumps(extracted),
            },
        )
    except redis.RedisError:
        pass
    
    return {"success": True, "data": extracted}


@router.post("/nlp/extract/batch")
def extract_batch(payload: BatchExtractRequest) -> dict:
    """
    Extract skills from multiple students' repositories in a single request.
    
    Publish extraction results to graph:update:queue Redis Stream.
    Return HTTP 503 if the spaCy model failed to load.
    """
    if _NLP_LOAD_ERROR:
        raise HTTPException(
            status_code=503,
            detail=f"NLP service unavailable: {_NLP_LOAD_ERROR}",
        )

    results = []
    
    try:
        client = redis.from_url(
            os.getenv("REDIS_URL", "redis://redis:6379"), decode_responses=True
        )
    except redis.RedisError:
        client = None
    
    for request in payload.requests:
        extracted = extract_skills(request.student_id, request.repositories)
        results.append(extracted)
        
        # Publish to Redis Stream
        if client:
            try:
                client.xadd(
                    "graph:update:queue",
                    {
                        "studentId": request.student_id,
                        "payload": json.dumps(extracted),
                    },
                )
            except redis.RedisError:
                pass
    
    return {"success": True, "data": results}


@router.get("/nlp/gazetteer/stats")
def gazetteer_stats() -> dict:
    """
    Return statistics about the gazetteer: total term count and per-category breakdown.
    
    Expose GET /nlp/gazetteer/stats returning total term count 
    and per-category breakdown.
    """
    gazetteer_data = load_terms()
    skills = gazetteer_data.get("skills", [])
    
    total_count = len(skills)
    
    # Count skills per category
    category_breakdown = {}
    for skill in skills:
        category = skill.get("category", "Unknown")
        category_breakdown[category] = category_breakdown.get(category, 0) + 1
    
    return {
        "success": True,
        "data": {
            "total_terms": total_count,
            "categories": category_breakdown,
        }
    }


class TextExtractRequest(BaseModel):
    text: str


@router.post("/nlp/extract/text")
def extract_from_text(payload: TextExtractRequest) -> dict:
    """
    Extract skills from raw text (such as syllabus descriptions) without pushing to Redis streams.
    """
    if _NLP_LOAD_ERROR:
        raise HTTPException(
            status_code=503,
            detail=f"NLP service unavailable: {_NLP_LOAD_ERROR}",
        )
        
    extracted = extract_skills(
        "syllabus-extraction", 
        [{"name": "Syllabus", "readme": payload.text, "description": "", "commits": []}]
    )
    return {"success": True, "data": extracted.get("extracted_skills", [])}