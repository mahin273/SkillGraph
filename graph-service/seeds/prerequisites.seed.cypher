MATCH (html:Skill {name: "HTML"}), (css:Skill {name: "CSS"}) MERGE (html)-[:PREREQUISITE_OF {difficulty: 1.5}]->(css);
MATCH (css:Skill {name: "CSS"}), (js:Skill {name: "JavaScript"}) MERGE (css)-[:PREREQUISITE_OF {difficulty: 2.0}]->(js);
MATCH (js:Skill {name: "JavaScript"}), (ts:Skill {name: "TypeScript"}) MERGE (js)-[:PREREQUISITE_OF {difficulty: 2.5}]->(ts);
MATCH (ts:Skill {name: "TypeScript"}), (react:Skill {name: "React"}) MERGE (ts)-[:PREREQUISITE_OF {difficulty: 3.0}]->(react);
MATCH (js:Skill {name: "JavaScript"}), (node:Skill {name: "Node.js"}) MERGE (js)-[:PREREQUISITE_OF {difficulty: 2.5}]->(node);
MATCH (node:Skill {name: "Node.js"}), (express:Skill {name: "Express"}) MERGE (node)-[:PREREQUISITE_OF {difficulty: 2.8}]->(express);
MATCH (docker:Skill {name: "Docker"}), (k8s:Skill {name: "Kubernetes"}) MERGE (docker)-[:PREREQUISITE_OF {difficulty: 6.5}]->(k8s);
