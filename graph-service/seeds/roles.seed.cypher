MERGE (:Role {title: "Frontend Developer", description: "Builds accessible client applications"});
MERGE (:Role {title: "Backend Developer", description: "Builds APIs and backend systems"});
MERGE (:Role {title: "Data Engineer", description: "Builds data pipelines and storage systems"});

MATCH (role:Role {title: "Frontend Developer"}), (skill:Skill)
WHERE skill.name IN ["HTML", "CSS", "JavaScript", "TypeScript", "React"]
MERGE (role)-[:REQUIRES {criticality: 0.8}]->(skill);

MATCH (role:Role {title: "Backend Developer"}), (skill:Skill)
WHERE skill.name IN ["JavaScript", "Node.js", "Express", "PostgreSQL", "Docker"]
MERGE (role)-[:REQUIRES {criticality: 0.8}]->(skill);
