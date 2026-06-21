export const findCandidatesQuery = `
MATCH (candidate:Student)-[knows:KNOWS]->(skill:Skill)
WHERE skill.name IN $requiredSkills AND coalesce(knows.dormant, false) = false
RETURN candidate.id AS studentId,
       candidate.name AS name,
       count(DISTINCT skill) AS matchCount,
       avg(knows.proficiency) AS avgProficiency
ORDER BY matchCount DESC, avgProficiency DESC
LIMIT 20
`;
