# @skillgraph/database

Shared PostgreSQL package for SkillGraph.

This package owns:

- Prisma schema: `prisma/schema.prisma`
- Prisma migrations: `prisma/migrations`
- Seed data: `prisma/seed.ts`
- Shared Prisma client helper: `src/prisma.ts`

Use root scripts from the repository:

```bash
npm run db:generate
npm run db:build
npm run db:migrate
npm run db:seed
```

Node services that need PostgreSQL should depend on `@skillgraph/database`. Neo4j remains separate and is seeded from `graph-service/seeds`.
