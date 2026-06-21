export const getCareerGapQuery = `
MATCH (role:Role {title: $roleTitle})-[requires:REQUIRES]->(required:Skill)
OPTIONAL MATCH (student:Student {id: $studentId})-[knows:KNOWS]->(known:Skill {name: required.name})
RETURN required.name AS skill, requires.criticality AS criticality, known IS NULL AS missing
ORDER BY criticality DESC
`;
