export const getStudentGalaxyQuery = `
MATCH (student:Student {id: $studentId})-[knows:KNOWS]->(skill:Skill)
OPTIONAL MATCH (project:Project)-[built:BUILT_WITH]->(skill)
RETURN student, collect(DISTINCT skill) AS skills, collect(DISTINCT project) AS projects
`;
