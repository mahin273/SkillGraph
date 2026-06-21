CREATE CONSTRAINT skill_name IF NOT EXISTS FOR (skill:Skill) REQUIRE skill.name IS UNIQUE;
CREATE CONSTRAINT student_id IF NOT EXISTS FOR (student:Student) REQUIRE student.id IS UNIQUE;
CREATE CONSTRAINT project_id IF NOT EXISTS FOR (project:Project) REQUIRE project.id IS UNIQUE;
CREATE CONSTRAINT role_title IF NOT EXISTS FOR (role:Role) REQUIRE role.title IS UNIQUE;

UNWIND [
  {name: "HTML", category: "Language", difficulty: 1.0},
  {name: "CSS", category: "Language", difficulty: 1.3},
  {name: "JavaScript", category: "Language", difficulty: 2.0},
  {name: "TypeScript", category: "Language", difficulty: 2.4},
  {name: "Python", category: "Language", difficulty: 2.0},
  {name: "SQL", category: "Language", difficulty: 2.2},
  {name: "React", category: "Frontend", difficulty: 3.0},
  {name: "Next.js", category: "Frontend", difficulty: 3.4},
  {name: "Tailwind CSS", category: "Frontend", difficulty: 2.0},
  {name: "Web Accessibility", category: "Frontend", difficulty: 2.8},
  {name: "Responsive Design", category: "Frontend", difficulty: 2.2},
  {name: "WebSockets", category: "Frontend", difficulty: 3.2},
  {name: "Node.js", category: "Backend", difficulty: 2.6},
  {name: "Express", category: "Backend", difficulty: 2.6},
  {name: "FastAPI", category: "Backend", difficulty: 2.8},
  {name: "REST APIs", category: "Backend", difficulty: 2.2},
  {name: "Authentication", category: "Backend", difficulty: 3.6},
  {name: "JWT", category: "Backend", difficulty: 2.4},
  {name: "PostgreSQL", category: "Database", difficulty: 2.8},
  {name: "Redis", category: "Database", difficulty: 2.7},
  {name: "Neo4j", category: "Database", difficulty: 3.4},
  {name: "Prisma", category: "Database", difficulty: 2.4},
  {name: "Database Indexing", category: "Database", difficulty: 3.2},
  {name: "Docker", category: "DevOps", difficulty: 3.0},
  {name: "Kubernetes", category: "DevOps", difficulty: 5.0},
  {name: "CI/CD", category: "DevOps", difficulty: 3.2},
  {name: "Linux", category: "Tooling", difficulty: 2.4},
  {name: "AWS", category: "Cloud", difficulty: 4.0},
  {name: "Playwright", category: "Testing", difficulty: 2.8},
  {name: "Vitest", category: "Testing", difficulty: 2.0},
  {name: "Pytest", category: "Testing", difficulty: 2.0},
  {name: "OWASP Top 10", category: "Security", difficulty: 3.0},
  {name: "Input Validation", category: "Security", difficulty: 2.5},
  {name: "Pandas", category: "Data", difficulty: 2.4},
  {name: "NumPy", category: "Data", difficulty: 2.2},
  {name: "ETL", category: "Data", difficulty: 3.0},
  {name: "Airflow", category: "Data", difficulty: 3.8},
  {name: "dbt", category: "Data", difficulty: 3.0},
  {name: "Spark", category: "Data", difficulty: 4.2},
  {name: "Data Warehousing", category: "Data", difficulty: 3.6},
  {name: "scikit-learn", category: "ML Library", difficulty: 3.0},
  {name: "PyTorch", category: "ML Library", difficulty: 4.0},
  {name: "Computer Vision", category: "ML Library", difficulty: 4.0},
  {name: "Model Evaluation", category: "ML Library", difficulty: 3.0},
  {name: "MLOps", category: "ML Library", difficulty: 4.5},
  {name: "Figma", category: "Design", difficulty: 1.8},
  {name: "Product Analytics", category: "Product", difficulty: 2.8},
  {name: "A/B Testing", category: "Product", difficulty: 3.0}
] AS skill
MERGE (s:Skill {name: skill.name})
SET s.category = skill.category,
    s.difficulty = skill.difficulty,
    s.updatedAt = datetime();

UNWIND [
  {id: "20000000-0000-4000-8000-000000000001", handle: "arif-hasan-buet", name: "Arif Hasan", university: "Bangladesh University of Engineering and Technology", department: "Computer Science and Engineering", graduationYear: 2026},
  {id: "20000000-0000-4000-8000-000000000002", handle: "nusrat-jahan-buet", name: "Nusrat Jahan", university: "Bangladesh University of Engineering and Technology", department: "Computer Science and Engineering", graduationYear: 2026},
  {id: "20000000-0000-4000-8000-000000000003", handle: "tanvir-ahmed-du", name: "Tanvir Ahmed", university: "University of Dhaka", department: "Computer Science and Engineering", graduationYear: 2025},
  {id: "20000000-0000-4000-8000-000000000004", handle: "mehzabin-nsu", name: "Mehzabin Chowdhury", university: "North South University", department: "Electrical and Computer Engineering", graduationYear: 2027},
  {id: "20000000-0000-4000-8000-000000000005", handle: "rahim-uddin-bracu", name: "Rahim Uddin", university: "BRAC University", department: "Computer Science and Engineering", graduationYear: 2025},
  {id: "20000000-0000-4000-8000-000000000006", handle: "farhana-sultana-du", name: "Farhana Sultana", university: "University of Dhaka", department: "Statistics", graduationYear: 2026}
] AS row
MERGE (s:Student {id: row.id})
SET s.handle = row.handle,
    s.name = row.name,
    s.university = row.university,
    s.department = row.department,
    s.graduationYear = row.graduationYear,
    s.updatedAt = datetime();

UNWIND [
  {id: "30000000-0000-4000-8000-000000000001", owner: "20000000-0000-4000-8000-000000000001", name: "skillbridge-bd", fullName: "arif-buet/skillbridge-bd", language: "TypeScript"},
  {id: "30000000-0000-4000-8000-000000000002", owner: "20000000-0000-4000-8000-000000000001", name: "dhaka-bus-pulse", fullName: "arif-buet/dhaka-bus-pulse", language: "TypeScript"},
  {id: "30000000-0000-4000-8000-000000000003", owner: "20000000-0000-4000-8000-000000000002", name: "clinic-queue-bd", fullName: "nusrat-buet/clinic-queue-bd", language: "TypeScript"},
  {id: "30000000-0000-4000-8000-000000000004", owner: "20000000-0000-4000-8000-000000000003", name: "floodwatch-bd", fullName: "tanvir-du/floodwatch-bd", language: "Python"},
  {id: "30000000-0000-4000-8000-000000000005", owner: "20000000-0000-4000-8000-000000000004", name: "internship-pathways-bd", fullName: "mehzabin-nsu/internship-pathways-bd", language: "TypeScript"},
  {id: "30000000-0000-4000-8000-000000000006", owner: "20000000-0000-4000-8000-000000000005", name: "mfs-ledger-lab", fullName: "rahim-bracu/mfs-ledger-lab", language: "TypeScript"},
  {id: "30000000-0000-4000-8000-000000000007", owner: "20000000-0000-4000-8000-000000000006", name: "rickshaw-vision", fullName: "farhana-du/rickshaw-vision", language: "Python"}
] AS row
MATCH (student:Student {id: row.owner})
MERGE (project:Project {id: row.id})
SET project.name = row.name,
    project.fullName = row.fullName,
    project.language = row.language,
    project.updatedAt = datetime()
MERGE (student)-[:WORKED_ON]->(project);

UNWIND [
  {student: "20000000-0000-4000-8000-000000000001", skill: "React", confidence: 0.86, proficiency: 0.82, endorsements: 2, repos: ["skillbridge-bd"]},
  {student: "20000000-0000-4000-8000-000000000001", skill: "TypeScript", confidence: 0.9, proficiency: 0.88, endorsements: 1, repos: ["skillbridge-bd", "dhaka-bus-pulse"]},
  {student: "20000000-0000-4000-8000-000000000001", skill: "Node.js", confidence: 0.78, proficiency: 0.76, endorsements: 1, repos: ["skillbridge-bd"]},
  {student: "20000000-0000-4000-8000-000000000001", skill: "PostgreSQL", confidence: 0.72, proficiency: 0.7, endorsements: 1, repos: ["skillbridge-bd"]},
  {student: "20000000-0000-4000-8000-000000000001", skill: "Neo4j", confidence: 0.68, proficiency: 0.65, endorsements: 0, repos: ["skillbridge-bd"]},
  {student: "20000000-0000-4000-8000-000000000001", skill: "Docker", confidence: 0.48, proficiency: 0.44, endorsements: 0, repos: ["skillbridge-bd"]},
  {student: "20000000-0000-4000-8000-000000000002", skill: "React", confidence: 0.92, proficiency: 0.9, endorsements: 2, repos: ["clinic-queue-bd"]},
  {student: "20000000-0000-4000-8000-000000000002", skill: "TypeScript", confidence: 0.88, proficiency: 0.86, endorsements: 1, repos: ["clinic-queue-bd"]},
  {student: "20000000-0000-4000-8000-000000000002", skill: "Tailwind CSS", confidence: 0.84, proficiency: 0.8, endorsements: 1, repos: ["clinic-queue-bd"]},
  {student: "20000000-0000-4000-8000-000000000002", skill: "Web Accessibility", confidence: 0.86, proficiency: 0.84, endorsements: 2, repos: ["clinic-queue-bd"]},
  {student: "20000000-0000-4000-8000-000000000002", skill: "Playwright", confidence: 0.64, proficiency: 0.6, endorsements: 0, repos: ["clinic-queue-bd"]},
  {student: "20000000-0000-4000-8000-000000000003", skill: "Python", confidence: 0.9, proficiency: 0.88, endorsements: 2, repos: ["floodwatch-bd"]},
  {student: "20000000-0000-4000-8000-000000000003", skill: "FastAPI", confidence: 0.82, proficiency: 0.8, endorsements: 1, repos: ["floodwatch-bd"]},
  {student: "20000000-0000-4000-8000-000000000003", skill: "PostgreSQL", confidence: 0.76, proficiency: 0.74, endorsements: 1, repos: ["floodwatch-bd"]},
  {student: "20000000-0000-4000-8000-000000000003", skill: "Pandas", confidence: 0.86, proficiency: 0.83, endorsements: 1, repos: ["floodwatch-bd"]},
  {student: "20000000-0000-4000-8000-000000000003", skill: "ETL", confidence: 0.78, proficiency: 0.74, endorsements: 1, repos: ["floodwatch-bd"]},
  {student: "20000000-0000-4000-8000-000000000003", skill: "Docker", confidence: 0.6, proficiency: 0.56, endorsements: 0, repos: ["floodwatch-bd"]},
  {student: "20000000-0000-4000-8000-000000000004", skill: "Next.js", confidence: 0.76, proficiency: 0.72, endorsements: 1, repos: ["internship-pathways-bd"]},
  {student: "20000000-0000-4000-8000-000000000004", skill: "React", confidence: 0.8, proficiency: 0.78, endorsements: 1, repos: ["internship-pathways-bd"]},
  {student: "20000000-0000-4000-8000-000000000004", skill: "Product Analytics", confidence: 0.82, proficiency: 0.78, endorsements: 1, repos: ["internship-pathways-bd"]},
  {student: "20000000-0000-4000-8000-000000000004", skill: "A/B Testing", confidence: 0.58, proficiency: 0.52, endorsements: 0, repos: ["internship-pathways-bd"]},
  {student: "20000000-0000-4000-8000-000000000004", skill: "Figma", confidence: 0.7, proficiency: 0.68, endorsements: 0, repos: ["internship-pathways-bd"]},
  {student: "20000000-0000-4000-8000-000000000005", skill: "Node.js", confidence: 0.86, proficiency: 0.83, endorsements: 1, repos: ["mfs-ledger-lab"]},
  {student: "20000000-0000-4000-8000-000000000005", skill: "Express", confidence: 0.82, proficiency: 0.8, endorsements: 1, repos: ["mfs-ledger-lab"]},
  {student: "20000000-0000-4000-8000-000000000005", skill: "PostgreSQL", confidence: 0.8, proficiency: 0.78, endorsements: 1, repos: ["mfs-ledger-lab"]},
  {student: "20000000-0000-4000-8000-000000000005", skill: "Authentication", confidence: 0.82, proficiency: 0.8, endorsements: 2, repos: ["mfs-ledger-lab"]},
  {student: "20000000-0000-4000-8000-000000000005", skill: "JWT", confidence: 0.78, proficiency: 0.74, endorsements: 1, repos: ["mfs-ledger-lab"]},
  {student: "20000000-0000-4000-8000-000000000005", skill: "OWASP Top 10", confidence: 0.66, proficiency: 0.62, endorsements: 0, repos: ["mfs-ledger-lab"]},
  {student: "20000000-0000-4000-8000-000000000005", skill: "Docker", confidence: 0.64, proficiency: 0.6, endorsements: 0, repos: ["mfs-ledger-lab"]},
  {student: "20000000-0000-4000-8000-000000000006", skill: "Python", confidence: 0.84, proficiency: 0.82, endorsements: 1, repos: ["rickshaw-vision"]},
  {student: "20000000-0000-4000-8000-000000000006", skill: "Pandas", confidence: 0.82, proficiency: 0.8, endorsements: 1, repos: ["rickshaw-vision"]},
  {student: "20000000-0000-4000-8000-000000000006", skill: "NumPy", confidence: 0.78, proficiency: 0.74, endorsements: 0, repos: ["rickshaw-vision"]},
  {student: "20000000-0000-4000-8000-000000000006", skill: "PyTorch", confidence: 0.72, proficiency: 0.7, endorsements: 1, repos: ["rickshaw-vision"]},
  {student: "20000000-0000-4000-8000-000000000006", skill: "Computer Vision", confidence: 0.76, proficiency: 0.72, endorsements: 1, repos: ["rickshaw-vision"]},
  {student: "20000000-0000-4000-8000-000000000006", skill: "Model Evaluation", confidence: 0.68, proficiency: 0.65, endorsements: 0, repos: ["rickshaw-vision"]},
  {student: "20000000-0000-4000-8000-000000000006", skill: "MLOps", confidence: 0.38, proficiency: 0.34, endorsements: 0, repos: []}
] AS row
MATCH (student:Student {id: row.student})
MATCH (skill:Skill {name: row.skill})
MERGE (student)-[knows:KNOWS]->(skill)
SET knows.confidence = row.confidence,
    knows.proficiency = row.proficiency,
    knows.endorsementCount = row.endorsements,
    knows.endorsed = row.endorsements >= 2,
    knows.sourceRepos = row.repos,
    knows.dormant = false,
    knows.updatedAt = datetime();

UNWIND [
  {project: "30000000-0000-4000-8000-000000000001", skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "Prisma", "Neo4j", "Docker"]},
  {project: "30000000-0000-4000-8000-000000000002", skills: ["React", "TypeScript", "WebSockets", "Redis", "Product Analytics"]},
  {project: "30000000-0000-4000-8000-000000000003", skills: ["React", "TypeScript", "Tailwind CSS", "Web Accessibility", "Playwright", "Figma"]},
  {project: "30000000-0000-4000-8000-000000000004", skills: ["Python", "FastAPI", "PostgreSQL", "Pandas", "ETL", "Airflow", "Docker"]},
  {project: "30000000-0000-4000-8000-000000000005", skills: ["Next.js", "React", "Product Analytics", "A/B Testing", "Figma", "REST APIs"]},
  {project: "30000000-0000-4000-8000-000000000006", skills: ["Node.js", "Express", "PostgreSQL", "Authentication", "JWT", "OWASP Top 10", "Docker"]},
  {project: "30000000-0000-4000-8000-000000000007", skills: ["Python", "Pandas", "NumPy", "PyTorch", "Computer Vision", "Model Evaluation", "MLOps"]}
] AS row
MATCH (project:Project {id: row.project})
UNWIND row.skills AS skillName
MATCH (skill:Skill {name: skillName})
MERGE (project)-[built:BUILT_WITH]->(skill)
SET built.confidence = 0.82;

UNWIND [
  {title: "Frontend Developer", description: "Builds accessible, responsive client applications.", skills: [["HTML", 0.95], ["CSS", 0.95], ["JavaScript", 0.95], ["TypeScript", 0.85], ["React", 0.9], ["Responsive Design", 0.8], ["Web Accessibility", 0.75], ["Vitest", 0.55]]},
  {title: "Full Stack Developer", description: "Owns frontend, backend, database, and deployment work.", skills: [["TypeScript", 0.9], ["React", 0.85], ["Node.js", 0.9], ["REST APIs", 0.85], ["PostgreSQL", 0.8], ["Prisma", 0.65], ["Docker", 0.65], ["Authentication", 0.7]]},
  {title: "Backend Developer", description: "Builds APIs, data models, integrations, and reliable services.", skills: [["Node.js", 0.9], ["Express", 0.8], ["REST APIs", 0.9], ["PostgreSQL", 0.85], ["Database Indexing", 0.7], ["Authentication", 0.75], ["Docker", 0.65], ["Vitest", 0.55]]},
  {title: "Data Engineer", description: "Builds data pipelines, models, orchestration, and analytical storage.", skills: [["Python", 0.9], ["SQL", 0.95], ["PostgreSQL", 0.75], ["ETL", 0.9], ["Airflow", 0.75], ["dbt", 0.7], ["Spark", 0.65], ["Data Warehousing", 0.8]]},
  {title: "Machine Learning Engineer", description: "Builds, evaluates, and deploys machine learning systems.", skills: [["Python", 0.95], ["NumPy", 0.8], ["Pandas", 0.8], ["scikit-learn", 0.85], ["PyTorch", 0.7], ["Model Evaluation", 0.85], ["MLOps", 0.65], ["Docker", 0.55]]}
] AS roleRow
MERGE (role:Role {title: roleRow.title})
SET role.description = roleRow.description
WITH role, roleRow
UNWIND roleRow.skills AS requirement
MATCH (skill:Skill {name: requirement[0]})
MERGE (role)-[requires:REQUIRES]->(skill)
SET requires.criticality = requirement[1];

UNWIND [
  ["HTML", "CSS", 1.3],
  ["CSS", "JavaScript", 2.0],
  ["JavaScript", "TypeScript", 2.4],
  ["TypeScript", "React", 3.0],
  ["JavaScript", "Node.js", 2.6],
  ["Node.js", "Express", 2.6],
  ["SQL", "PostgreSQL", 2.8],
  ["Python", "Pandas", 2.4],
  ["Pandas", "ETL", 3.0],
  ["ETL", "Airflow", 3.8],
  ["Python", "PyTorch", 4.0],
  ["PyTorch", "Computer Vision", 4.0],
  ["Docker", "Kubernetes", 5.0],
  ["OWASP Top 10", "Input Validation", 2.5]
] AS edge
MATCH (from:Skill {name: edge[0]})
MATCH (to:Skill {name: edge[1]})
MERGE (from)-[rel:PREREQUISITE_OF]->(to)
SET rel.difficulty = edge[2];
