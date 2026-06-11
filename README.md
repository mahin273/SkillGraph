# SkillGraph

SkillGraph is an academic-to-industry career GPS platform. The repository is structured as a microservice monorepo.

## Services

- `gateway`: Express API gateway, auth, RBAC, rate limiting, REST routing.
- `nlp-service`: FastAPI service for GitHub text normalization and skill extraction.
- `graph-service`: Express service for Neo4j skill graph, Career GPS, galaxy, and matchmaker queries.
- `notification-service`: Socket.IO service backed by Redis Pub/Sub.
- `decay-worker`: Scheduled skill decay worker for Phase 3.
- `frontend`: React 18 + Vite + Tailwind + D3 application.
- `database`: PostgreSQL migrations and seed data.
