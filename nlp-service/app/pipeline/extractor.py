"""
NLP extraction pipeline orchestrator.

Steps:
  1. Text normalization  (normalizer.py)
  2. spaCy tokenization + POS tagging  (en_core_web_sm)
  3. Dependency parsing filter  (NOUN/PROPN + dobj/pobj/nsubj/compound)
  4. EntityRuler gazetteer matching  (gazetteer.py)
  5. Confidence scoring + deduplication
"""

import logging
import os
import json
import httpx
from collections import defaultdict
from typing import Optional

logger = logging.getLogger("nlp-service")
try:
    import spacy
    from spacy.language import Language as SpacyLanguage
    from spacy.pipeline import EntityRuler
    _SPACY_AVAILABLE = True
except ImportError:
    spacy = None  # type: ignore[assignment]
    SpacyLanguage = None  # type: ignore[assignment]
    EntityRuler = None  # type: ignore[assignment]
    _SPACY_AVAILABLE = False

from app.pipeline.gazetteer import all_skill_aliases, load_terms
from app.pipeline.normalizer import normalize_repository_text

# ---------------------------------------------------------------------------
# Step 2: Load spaCy model at module import time (not per-request).
# Step 4: Inject EntityRuler with gazetteer patterns before NER.
# ---------------------------------------------------------------------------

_NLP_MODEL: Optional[object] = None  # will be SpacyLanguage when loaded
_NLP_LOAD_ERROR: Optional[str] = None

if _SPACY_AVAILABLE:
    try:
        _NLP_MODEL = spacy.load("en_core_web_sm")

        # Step 4: Inject EntityRuler with gazetteer patterns
        # Create patterns for exact and case-insensitive matching
        gazetteer_data = load_terms()
        patterns = []

        for skill in gazetteer_data["skills"]:
            skill_name = skill["name"]
            # Exact match pattern (case-sensitive)
            patterns.append({"label": "TECH_SKILL", "pattern": skill_name})
            # Case-insensitive pattern
            patterns.append({"label": "TECH_SKILL", "pattern": skill_name.lower()})

            # Add alias patterns
            for alias in skill.get("aliases", []):
                patterns.append({"label": "TECH_SKILL", "pattern": alias})
                patterns.append({"label": "TECH_SKILL", "pattern": alias.lower()})

        # Add EntityRuler before NER in the pipeline
        if "entity_ruler" not in _NLP_MODEL.pipe_names:
            ruler = _NLP_MODEL.add_pipe("entity_ruler", before="ner")
            ruler.add_patterns(patterns)

    except OSError as exc:
        _NLP_LOAD_ERROR = (
            f"spaCy model 'en_core_web_sm' is not installed. "
            f"Run: python -m spacy download en_core_web_sm  ({exc})"
        )
else:
    _NLP_LOAD_ERROR = (
        "spaCy is not installed. Install it with: pip install spacy"
    )


def get_nlp_model() -> object:
    """
    Return the loaded spaCy model.

    Raises:
        RuntimeError: if the model could not be loaded, with a descriptive message
                      suitable for returning as HTTP 503.
    """
    if _NLP_MODEL is None:
        raise RuntimeError(_NLP_LOAD_ERROR or "spaCy model unavailable.")
    return _NLP_MODEL


# ---------------------------------------------------------------------------
# Step 3: Dependency parsing filter
# ---------------------------------------------------------------------------

# POS tags that qualify a token as a skill candidate
_CANDIDATE_POS = {"NOUN", "PROPN"}

# Dependency relations that qualify a token as a skill candidate
_CANDIDATE_DEPS = {"dobj", "pobj", "nsubj", "compound"}


def filter_candidates(doc) -> list[str]:
    """
    Step 3: Keep only tokens whose POS tag is NOUN or PROPN AND whose
    dependency relation is one of {dobj, pobj, nsubj, compound}.

    Args:
        doc: A spaCy Doc object produced by the loaded model.

    Returns:
        A list of candidate token strings (lowercased).
    """
    return [
        token.text.lower()
        for token in doc
        if token.pos_ in _CANDIDATE_POS and token.dep_ in _CANDIDATE_DEPS
    ]

def extract_skills_via_gemini(repositories: list[dict], api_key: str) -> list[dict]:
    """
    Extract skills from repositories using the Gemini 1.5 Flash API with JSON schema enforcement.
    """
    repos_desc = []
    for repo in repositories:
        name = repo.get("name", "unknown")
        desc = repo.get("description", "")
        readme = repo.get("readme", "")
        # Truncate readme to avoid excessive token count
        readme_trunc = readme[:30_000] if readme else ""
        commits = ", ".join(repo.get("commits", []))
        repos_desc.append(
            f"Repository Name: {name}\n"
            f"Description: {desc}\n"
            f"README: {readme_trunc}\n"
            f"Recent Commits: {commits}\n"
            f"---"
        )
    
    prompt = (
        "You are an expert NLP system for extracting technical skills from developer profiles.\n"
        "Analyze the following list of GitHub repositories (each with a name, description, README content, and recent commits) for a student.\n"
        "Extract all technical skills (languages, frameworks, libraries, tools, databases, runtimes, cloud platforms, DevOps tools, etc.) that the student has used in these repositories.\n\n"
        "For each extracted skill, provide:\n"
        "1. skill_name: The standard, official name of the technology (e.g. 'React', 'TypeScript', 'PostgreSQL', 'Docker', 'SvelteKit', 'Go').\n"
        "2. confidence: A confidence score between 0.0 and 1.0. A skill mentioned once or in a tutorial has low confidence (~0.5-0.6). A skill mentioned frequently across commits and multiple repositories has high confidence (~0.8-1.0).\n"
        "3. source_repos: A list of repository names where this skill was identified.\n\n"
        "Guidelines:\n"
        "- Return ONLY technologies actually used. Avoid extracting terms mentioned in comparison or negation (e.g., 'not using Angular' or 'migrating from Java').\n"
        "- Expose only real technical skills. Avoid generic nouns like 'development', 'code', 'repository', 'software', 'project', etc.\n"
        "- Standardize aliases (e.g. translate 'react.js' or 'reactjs' to 'React').\n"
        "- Deduplicate the output by skill_name.\n\n"
        f"Input Repositories:\n"
        + "\n".join(repos_desc)
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "properties": {
                    "extracted_skills": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "skill_name": {"type": "STRING"},
                                "confidence": {"type": "NUMBER"},
                                "source_repos": {
                                    "type": "ARRAY",
                                    "items": {"type": "STRING"}
                                }
                            },
                            "required": ["skill_name", "confidence", "source_repos"]
                        }
                    }
                },
                "required": ["extracted_skills"]
            }
        }
    }

    # Call the Gemini API synchronously using httpx
    with httpx.Client(timeout=30.0) as client:
        response = client.post(url, json=payload)
        response.raise_for_status()
        result = response.json()
        
        # Extract response text
        candidates_text = result["candidates"][0]["content"]["parts"][0]["text"]
        data = json.loads(candidates_text)
        
        # Validate output is a list of dicts with appropriate structure
        extracted_skills = data.get("extracted_skills", [])
        
        # Clean and round confidence scores
        cleaned = []
        for skill in extracted_skills:
            name = skill.get("skill_name")
            conf = skill.get("confidence", 0.5)
            repos = skill.get("source_repos", [])
            if name:
                cleaned.append({
                    "skill_name": str(name).strip(),
                    "confidence": round(float(conf), 2),
                    "source_repos": [str(r) for r in repos]
                })
        return cleaned


# ---------------------------------------------------------------------------
# Full pipeline: extract_skills
# ---------------------------------------------------------------------------

def extract_skills(student_id: str, repositories: list[dict]) -> dict:
    """
    Run the full 5-step NLP extraction pipeline over a list of repositories.

 Attempts to use Gemini 1.5 Flash if GEMINI_API_KEY is defined in the environment.
    Falls back to the local spaCy-based extraction pipeline on error or if the key is missing.

    Args:
        student_id: The student's UUID string.
        repositories: List of repository dicts with keys:
                      name, description, readme, commits.

    Returns:
        Dict with keys:
          - student_id: str
          - extracted_skills: list of {skill_name, confidence, source_repos}
    """
    # ------------------------------------------------------------------
    # Step 0: Try Gemini 1.5 Flash API if configured
    # ------------------------------------------------------------------
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if api_key and api_key != "replace-me":
        try:
            logger.info(f"Attempting Gemini skill extraction for student: {student_id}")
            extracted_skills = extract_skills_via_gemini(repositories, api_key)
            return {"student_id": student_id, "extracted_skills": extracted_skills}
        except Exception as exc:
            logger.error(
                f"Gemini API extraction failed for student {student_id}: {exc}. "
                "Falling back to local spaCy pipeline."
            )

    # ------------------------------------------------------------------
    # Fallback: spaCy Rule-based/Gazetteer Pipeline
    # ------------------------------------------------------------------
    nlp = get_nlp_model()

    aliases = all_skill_aliases()
    mentions: dict[str, int] = defaultdict(int)
    source_repos: dict[str, set[str]] = defaultdict(set)
    entity_hits: dict[str, int] = defaultdict(int)

    for repository in repositories:
        repo_name = repository.get("name", "unknown")

        # ------------------------------------------------------------------
        # Step 1: Text normalization
        # ------------------------------------------------------------------
        normalized_text, _code_blocks = normalize_repository_text(repository)

        # Truncate to 100 000 chars to avoid excessive memory usage
        truncated = normalized_text[:100_000]

        # ------------------------------------------------------------------
        # Step 2: Tokenization + POS tagging
        # ------------------------------------------------------------------
        doc = nlp(truncated)  # type: ignore[operator]

        # ------------------------------------------------------------------
        # Step 3: Dependency parsing filter
        # ------------------------------------------------------------------
        candidate_tokens = set(filter_candidates(doc))

        # Full lowercased text for substring matching (Steps 4–5)
        full_text = truncated.lower()

        # Named entities from spaCy (used as additional signal)
        entities = {ent.text.lower() for ent in doc.ents}

        # ------------------------------------------------------------------
        # Steps 4–5: Gazetteer matching + confidence scoring
        # ------------------------------------------------------------------
        for skill_name, skill_aliases in aliases.items():
            # Primary match: alias appears in the dependency-filtered candidates
            # or anywhere in the full text (for broad coverage)
            alias_in_text = any(alias in full_text for alias in skill_aliases)
            alias_in_candidates = bool(candidate_tokens.intersection(skill_aliases))

            if alias_in_text or alias_in_candidates:
                count = sum(full_text.count(alias) for alias in skill_aliases)
                mentions[skill_name] += count
                source_repos[skill_name].add(repo_name)

            # Entity hit: spaCy NER recognised the skill name
            if entities.intersection(skill_aliases):
                entity_hits[skill_name] += 1
                source_repos[skill_name].add(repo_name)

    # Build output — deduplicated by skill_name (one entry per skill)
    extracted_skills = []
    seen_skills = set()  # Track seen skill names for deduplication

    for skill_name, count in mentions.items():
        # Deduplication: skip if we've already added this skill
        if skill_name in seen_skills:
            continue
        seen_skills.add(skill_name)

        repo_spread = len(source_repos[skill_name])
        # Step 5: Confidence formula: min(1.0, 0.5 + 0.05×occurrences + 0.1×repoCount)
        confidence = min(1.0, 0.5 + (0.05 * count) + (0.1 * repo_spread))
        extracted_skills.append(
            {
                "skill_name": skill_name,
                "confidence": round(confidence, 2),
                "source_repos": sorted(source_repos[skill_name]),
            }
        )

    return {"student_id": student_id, "extracted_skills": extracted_skills}
