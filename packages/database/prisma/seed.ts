import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
import neo4j from "neo4j-driver";

const prisma = new PrismaClient();

const categories = [
  { name: "Language", colorHex: "#2563eb", iconName: "code" },
  { name: "Framework", colorHex: "#16a34a", iconName: "blocks" },
  { name: "Database", colorHex: "#dc2626", iconName: "database" },
  { name: "DevOps", colorHex: "#9333ea", iconName: "container" },
  { name: "ML Library", colorHex: "#0891b2", iconName: "brain" },
  { name: "Cloud", colorHex: "#0c66e4", iconName: "cloud" },
  { name: "Testing", colorHex: "#1f845a", iconName: "check-circle" },
  { name: "Security", colorHex: "#c9372c", iconName: "shield" },
  { name: "Analytics", colorHex: "#7f5f01", iconName: "bar-chart" },
  { name: "Product", colorHex: "#6e5dc6", iconName: "map" },
  { name: "Design", colorHex: "#ae4787", iconName: "palette" }
];

const skills = [
  { name: "HTML", category: "Language", aliases: ["html5"] },
  { name: "CSS", category: "Language", aliases: ["css3"] },
  { name: "JavaScript", category: "Language", aliases: ["js", "ecmascript"] },
  { name: "TypeScript", category: "Language", aliases: ["ts"] },
  { name: "React", category: "Framework", aliases: ["reactjs", "react.js"] },
  { name: "Node.js", category: "Framework", aliases: ["node", "nodejs"] },
  { name: "Express", category: "Framework", aliases: ["express.js", "expressjs"] },
  { name: "FastAPI", category: "Framework", aliases: ["fast api"] },
  { name: "PostgreSQL", category: "Database", aliases: ["postgres", "psql"] },
  { name: "Neo4j", category: "Database", aliases: ["cypher"] },
  { name: "Redis", category: "Database", aliases: ["redis streams"] },
  { name: "Docker", category: "DevOps", aliases: ["dockerfile"] },
  { name: "Kubernetes", category: "DevOps", aliases: ["k8s"] },
  { name: "Python", category: "Language", aliases: ["py"] },
  { name: "Pandas", category: "ML Library", aliases: [] },
  { name: "NumPy", category: "ML Library", aliases: ["numpy"] },
  { name: "scikit-learn", category: "ML Library", aliases: ["sklearn"] },
  { name: "TensorFlow", category: "ML Library", aliases: ["tensorflow"] },
  { name: "PyTorch", category: "ML Library", aliases: ["torch"] },
  { name: "SQL", category: "Database", aliases: ["relational databases"] },
  { name: "MongoDB", category: "Database", aliases: ["mongo"] },
  { name: "GraphQL", category: "Framework", aliases: ["graphql api"] },
  { name: "Next.js", category: "Framework", aliases: ["nextjs", "next"] },
  { name: "Tailwind CSS", category: "Framework", aliases: ["tailwind"] },
  { name: "AWS", category: "Cloud", aliases: ["amazon web services"] },
  { name: "Azure", category: "Cloud", aliases: ["microsoft azure"] },
  { name: "CI/CD", category: "DevOps", aliases: ["github actions", "continuous integration"] },
  { name: "Terraform", category: "DevOps", aliases: ["iac", "infrastructure as code"] },
  { name: "Linux", category: "DevOps", aliases: ["bash", "shell"] },
  { name: "Playwright", category: "Testing", aliases: ["e2e testing"] },
  { name: "Jest", category: "Testing", aliases: ["unit testing"] },
  { name: "API Testing", category: "Testing", aliases: ["postman", "contract testing"] },
  { name: "OWASP Top 10", category: "Security", aliases: ["web security"] },
  { name: "Network Security", category: "Security", aliases: ["networking security"] },
  { name: "Identity and Access Management", category: "Security", aliases: ["iam", "authz", "authentication"] },
  { name: "Power BI", category: "Analytics", aliases: ["business intelligence"] },
  { name: "Tableau", category: "Analytics", aliases: ["data visualization"] },
  { name: "Data Modeling", category: "Analytics", aliases: ["dimensional modeling"] },
  { name: "Statistics", category: "Analytics", aliases: ["statistical analysis"] },
  { name: "Product Analytics", category: "Product", aliases: ["funnels", "retention"] },
  { name: "Agile Delivery", category: "Product", aliases: ["scrum", "kanban"] },
  { name: "User Research", category: "Design", aliases: ["ux research"] },
  { name: "Figma", category: "Design", aliases: ["interface design"] },
  { name: "Accessibility", category: "Design", aliases: ["a11y", "wcag"] },
  { name: "React Native", category: "Framework", aliases: ["mobile react"] },
  { name: "Swift", category: "Language", aliases: ["ios"] },
  { name: "Kotlin", category: "Language", aliases: ["android"] }
];

const roles = [
  {
    title: "Frontend Developer",
    description: "Builds accessible client applications.",
    requiredSkills: [
      { name: "HTML", criticality: 0.75 },
      { name: "CSS", criticality: 0.75 },
      { name: "JavaScript", criticality: 0.95 },
      { name: "TypeScript", criticality: 0.85 },
      { name: "React", criticality: 0.95 },
      { name: "Accessibility", criticality: 0.75 },
      { name: "Playwright", criticality: 0.6 }
    ]
  },
  {
    title: "Backend Developer",
    description: "Builds APIs, data models, and backend systems.",
    requiredSkills: [
      { name: "JavaScript", criticality: 0.8 },
      { name: "Node.js", criticality: 0.95 },
      { name: "Express", criticality: 0.85 },
      { name: "PostgreSQL", criticality: 0.9 },
      { name: "Docker", criticality: 0.7 },
      { name: "API Testing", criticality: 0.7 },
      { name: "Redis", criticality: 0.55 }
    ]
  },
  {
    title: "Data Engineer",
    description: "Builds data pipelines, models, and storage systems.",
    requiredSkills: [
      { name: "Python", criticality: 0.95 },
      { name: "SQL", criticality: 0.95 },
      { name: "PostgreSQL", criticality: 0.8 },
      { name: "Docker", criticality: 0.65 },
      { name: "Data Modeling", criticality: 0.85 },
      { name: "AWS", criticality: 0.65 }
    ]
  },
  {
    title: "Full-stack Engineer",
    description: "Owns product features from frontend interactions to APIs and persistence.",
    requiredSkills: [
      { name: "TypeScript", criticality: 0.9 },
      { name: "React", criticality: 0.9 },
      { name: "Node.js", criticality: 0.9 },
      { name: "Express", criticality: 0.75 },
      { name: "PostgreSQL", criticality: 0.85 },
      { name: "Docker", criticality: 0.7 },
      { name: "CI/CD", criticality: 0.65 },
      { name: "Playwright", criticality: 0.6 }
    ]
  },
  {
    title: "Machine Learning Engineer",
    description: "Turns data and models into reliable ML-powered product capabilities.",
    requiredSkills: [
      { name: "Python", criticality: 0.95 },
      { name: "NumPy", criticality: 0.75 },
      { name: "Pandas", criticality: 0.8 },
      { name: "scikit-learn", criticality: 0.85 },
      { name: "PyTorch", criticality: 0.75 },
      { name: "Statistics", criticality: 0.9 },
      { name: "Docker", criticality: 0.65 },
      { name: "API Testing", criticality: 0.55 }
    ]
  },
  {
    title: "DevOps Engineer",
    description: "Automates delivery pipelines, cloud infrastructure, and production operations.",
    requiredSkills: [
      { name: "Linux", criticality: 0.9 },
      { name: "Docker", criticality: 0.95 },
      { name: "Kubernetes", criticality: 0.9 },
      { name: "CI/CD", criticality: 0.9 },
      { name: "Terraform", criticality: 0.85 },
      { name: "AWS", criticality: 0.8 },
      { name: "Redis", criticality: 0.55 }
    ]
  },
  {
    title: "Cloud Engineer",
    description: "Designs cloud-native systems with secure networking, deployment, and observability.",
    requiredSkills: [
      { name: "AWS", criticality: 0.95 },
      { name: "Azure", criticality: 0.65 },
      { name: "Docker", criticality: 0.8 },
      { name: "Kubernetes", criticality: 0.8 },
      { name: "Terraform", criticality: 0.9 },
      { name: "Linux", criticality: 0.8 },
      { name: "Identity and Access Management", criticality: 0.75 }
    ]
  },
  {
    title: "Cybersecurity Analyst",
    description: "Finds, prioritizes, and mitigates security risks across applications and networks.",
    requiredSkills: [
      { name: "OWASP Top 10", criticality: 0.95 },
      { name: "Network Security", criticality: 0.9 },
      { name: "Linux", criticality: 0.8 },
      { name: "Identity and Access Management", criticality: 0.85 },
      { name: "Python", criticality: 0.65 },
      { name: "API Testing", criticality: 0.6 }
    ]
  },
  {
    title: "QA Automation Engineer",
    description: "Builds test strategy, automation suites, and quality gates for product teams.",
    requiredSkills: [
      { name: "Playwright", criticality: 0.95 },
      { name: "Jest", criticality: 0.85 },
      { name: "API Testing", criticality: 0.9 },
      { name: "JavaScript", criticality: 0.85 },
      { name: "TypeScript", criticality: 0.75 },
      { name: "CI/CD", criticality: 0.75 }
    ]
  },
  {
    title: "Product Data Analyst",
    description: "Uses product data to explain user behavior and guide roadmap decisions.",
    requiredSkills: [
      { name: "SQL", criticality: 0.95 },
      { name: "Statistics", criticality: 0.9 },
      { name: "Product Analytics", criticality: 0.9 },
      { name: "Power BI", criticality: 0.7 },
      { name: "Tableau", criticality: 0.65 },
      { name: "Python", criticality: 0.65 },
      { name: "Data Modeling", criticality: 0.7 }
    ]
  },
  {
    title: "UI/UX Engineer",
    description: "Bridges interaction design and frontend implementation for polished experiences.",
    requiredSkills: [
      { name: "Figma", criticality: 0.85 },
      { name: "User Research", criticality: 0.7 },
      { name: "Accessibility", criticality: 0.9 },
      { name: "HTML", criticality: 0.85 },
      { name: "CSS", criticality: 0.9 },
      { name: "React", criticality: 0.75 },
      { name: "Tailwind CSS", criticality: 0.7 }
    ]
  },
  {
    title: "Mobile App Developer",
    description: "Builds native and cross-platform mobile applications.",
    requiredSkills: [
      { name: "React Native", criticality: 0.9 },
      { name: "TypeScript", criticality: 0.8 },
      { name: "Swift", criticality: 0.65 },
      { name: "Kotlin", criticality: 0.65 },
      { name: "API Testing", criticality: 0.6 },
      { name: "Accessibility", criticality: 0.65 }
    ]
  }
];

const resources = [
  {
    title: "MDN JavaScript Guide",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
    type: "DOCUMENTATION",
    provider: "MDN",
    durationHours: 8,
    isUniversityApproved: true,
    rating: 4.9,
    skills: ["JavaScript", "HTML"]
  },
  {
    title: "React Documentation",
    url: "https://react.dev/learn",
    type: "DOCUMENTATION",
    provider: "React",
    durationHours: 10,
    isUniversityApproved: true,
    rating: 4.9,
    skills: ["React"]
  },
  {
    title: "PostgreSQL Tutorial",
    url: "https://www.postgresql.org/docs/current/tutorial.html",
    type: "DOCUMENTATION",
    provider: "PostgreSQL",
    durationHours: 6,
    isUniversityApproved: true,
    rating: 4.8,
    skills: ["PostgreSQL", "SQL"]
  },
  {
    title: "Docker Get Started",
    url: "https://docs.docker.com/get-started/",
    type: "DOCUMENTATION",
    provider: "Docker",
    durationHours: 5,
    isUniversityApproved: true,
    rating: 4.8,
    skills: ["Docker"]
  },
  {
    title: "AWS Skill Builder",
    url: "https://skillbuilder.aws/",
    type: "COURSE",
    provider: "AWS",
    durationHours: 12,
    isUniversityApproved: true,
    rating: 4.7,
    skills: ["AWS"]
  },
  {
    title: "OWASP Top 10",
    url: "https://owasp.org/www-project-top-ten/",
    type: "DOCUMENTATION",
    provider: "OWASP",
    durationHours: 6,
    isUniversityApproved: true,
    rating: 4.8,
    skills: ["OWASP Top 10", "Network Security"]
  },
  {
    title: "Playwright Testing",
    url: "https://playwright.dev/docs/intro",
    type: "DOCUMENTATION",
    provider: "Playwright",
    durationHours: 5,
    isUniversityApproved: true,
    rating: 4.8,
    skills: ["Playwright"]
  },
  {
    title: "Kubernetes Basics",
    url: "https://kubernetes.io/docs/tutorials/kubernetes-basics/",
    type: "TUTORIAL",
    provider: "Kubernetes",
    durationHours: 8,
    isUniversityApproved: true,
    rating: 4.7,
    skills: ["Kubernetes"]
  },
  {
    title: "Figma Learn",
    url: "https://www.figma.com/resource-library/",
    type: "COURSE",
    provider: "Figma",
    durationHours: 6,
    isUniversityApproved: true,
    rating: 4.6,
    skills: ["Figma"]
  },
  {
    title: "TypeScript Handbook",
    url: "https://www.typescriptlang.org/docs/handbook/intro.html",
    type: "DOCUMENTATION",
    provider: "TypeScript",
    durationHours: 8,
    isUniversityApproved: true,
    rating: 4.9,
    skills: ["TypeScript"]
  },
  {
    title: "Node.js Crash Course",
    url: "https://youtube.com/nodejs-crash-course",
    type: "VIDEO_COURSE",
    provider: "YouTube",
    durationHours: 4,
    isUniversityApproved: true,
    rating: 4.7,
    skills: ["Node.js", "Express"]
  },
  {
    title: "Express.js Starter Guide",
    url: "https://expressjs.com/en/starter/installing.html",
    type: "DOCUMENTATION",
    provider: "Express",
    durationHours: 2,
    isUniversityApproved: true,
    rating: 4.6,
    skills: ["Express", "JavaScript"]
  },
  {
    title: "FastAPI Tutorial",
    url: "https://fastapi.tiangolo.com/tutorial/",
    type: "DOCUMENTATION",
    provider: "FastAPI",
    durationHours: 5,
    isUniversityApproved: true,
    rating: 4.8,
    skills: ["FastAPI", "Python"]
  },
  {
    title: "Python for Beginners",
    url: "https://docs.python.org/3/tutorial/index.html",
    type: "TUTORIAL",
    provider: "Python",
    durationHours: 12,
    isUniversityApproved: true,
    rating: 4.8,
    skills: ["Python"]
  },
  {
    title: "Redis Crash Course",
    url: "https://redis.io/docs/latest/develop/data-types/streams/",
    type: "DOCUMENTATION",
    provider: "Redis",
    durationHours: 3,
    isUniversityApproved: true,
    rating: 4.7,
    skills: ["Redis"]
  },
  {
    title: "Neo4j Cypher Refcard",
    url: "https://neo4j.com/docs/cypher-cheat-sheet/current/",
    type: "DOCUMENTATION",
    provider: "Neo4j",
    durationHours: 1.5,
    isUniversityApproved: true,
    rating: 4.7,
    skills: ["Neo4j"]
  },
  {
    title: "Pandas Fundamentals",
    url: "https://pandas.pydata.org/docs/user_guide/index.html",
    type: "DOCUMENTATION",
    provider: "Pandas",
    durationHours: 8,
    isUniversityApproved: true,
    rating: 4.7,
    skills: ["Pandas", "Python"]
  },
  {
    title: "NumPy Guide",
    url: "https://numpy.org/doc/stable/user/index.html",
    type: "DOCUMENTATION",
    provider: "NumPy",
    durationHours: 6,
    isUniversityApproved: true,
    rating: 4.6,
    skills: ["NumPy"]
  },
  {
    title: "scikit-learn Machine Learning",
    url: "https://scikit-learn.org/stable/user_guide.html",
    type: "DOCUMENTATION",
    provider: "scikit-learn",
    durationHours: 10,
    isUniversityApproved: true,
    rating: 4.8,
    skills: ["scikit-learn", "Python"]
  },
  {
    title: "TensorFlow Core",
    url: "https://www.tensorflow.org/guide",
    type: "DOCUMENTATION",
    provider: "TensorFlow",
    durationHours: 14,
    isUniversityApproved: true,
    rating: 4.6,
    skills: ["TensorFlow", "PyTorch"]
  },
  {
    title: "PyTorch Basics",
    url: "https://pytorch.org/tutorials/beginner/basics/intro.html",
    type: "TUTORIAL",
    provider: "PyTorch",
    durationHours: 8,
    isUniversityApproved: true,
    rating: 4.8,
    skills: ["PyTorch", "Python"]
  },
  {
    title: "SQLBolt Interactive",
    url: "https://sqlbolt.com/",
    type: "TUTORIAL",
    provider: "SQLBolt",
    durationHours: 4,
    isUniversityApproved: true,
    rating: 4.9,
    skills: ["SQL", "PostgreSQL"]
  },
  {
    title: "MongoDB University",
    url: "https://learn.mongodb.com/",
    type: "COURSE",
    provider: "MongoDB",
    durationHours: 10,
    isUniversityApproved: true,
    rating: 4.7,
    skills: ["MongoDB"]
  },
  {
    title: "GraphQL Official Intro",
    url: "https://graphql.org/learn/",
    type: "DOCUMENTATION",
    provider: "GraphQL",
    durationHours: 4,
    isUniversityApproved: true,
    rating: 4.8,
    skills: ["GraphQL"]
  },
  {
    title: "Next.js Foundations",
    url: "https://nextjs.org/learn",
    type: "COURSE",
    provider: "Next.js",
    durationHours: 8,
    isUniversityApproved: true,
    rating: 4.8,
    skills: ["Next.js", "React"]
  },
  {
    title: "Tailwind CSS Docs",
    url: "https://tailwindcss.com/docs",
    type: "DOCUMENTATION",
    provider: "Tailwind CSS",
    durationHours: 4,
    isUniversityApproved: true,
    rating: 4.9,
    skills: ["Tailwind CSS", "CSS"]
  },
  {
    title: "Azure Fundamentals",
    url: "https://learn.microsoft.com/en-us/training/paths/azure-fundamentals/",
    type: "COURSE",
    provider: "Microsoft",
    durationHours: 12,
    isUniversityApproved: true,
    rating: 4.7,
    skills: ["Azure"]
  },
  {
    title: "CI/CD with GitHub Actions",
    url: "https://docs.github.com/en/actions",
    type: "DOCUMENTATION",
    provider: "GitHub",
    durationHours: 6,
    isUniversityApproved: true,
    rating: 4.8,
    skills: ["CI/CD", "Docker"]
  },
  {
    title: "Terraform Up and Running",
    url: "https://www.terraform.io/intro",
    type: "DOCUMENTATION",
    provider: "HashiCorp",
    durationHours: 8,
    isUniversityApproved: true,
    rating: 4.7,
    skills: ["Terraform", "AWS"]
  },
  {
    title: "Linux Command Line",
    url: "https://linuxjourney.com/",
    type: "TUTORIAL",
    provider: "Linux Journey",
    durationHours: 10,
    isUniversityApproved: true,
    rating: 4.8,
    skills: ["Linux"]
  },
  {
    title: "Jest Testing Framework",
    url: "https://jestjs.io/docs/getting-started",
    type: "DOCUMENTATION",
    provider: "Jest",
    durationHours: 5,
    isUniversityApproved: true,
    rating: 4.7,
    skills: ["Jest", "JavaScript"]
  },
  {
    title: "Postman API Testing",
    url: "https://learning.postman.com/docs/writing-scripts/intro-to-scripts/",
    type: "TUTORIAL",
    provider: "Postman",
    durationHours: 4,
    isUniversityApproved: true,
    rating: 4.8,
    skills: ["API Testing"]
  },
  {
    title: "Web Accessibility Guide",
    url: "https://www.w3.org/WAI/tutorials/",
    type: "DOCUMENTATION",
    provider: "W3C",
    durationHours: 6,
    isUniversityApproved: true,
    rating: 4.8,
    skills: ["Accessibility", "HTML", "CSS"]
  },
  {
    title: "React Native Guide",
    url: "https://reactnative.dev/docs/getting-started",
    type: "DOCUMENTATION",
    provider: "React Native",
    durationHours: 8,
    isUniversityApproved: true,
    rating: 4.7,
    skills: ["React Native", "TypeScript"]
  },
  {
    title: "Swift Playgrounds",
    url: "https://www.apple.com/swift/playgrounds/",
    type: "TUTORIAL",
    provider: "Apple",
    durationHours: 12,
    isUniversityApproved: true,
    rating: 4.8,
    skills: ["Swift"]
  },
  {
    title: "Kotlin Programming",
    url: "https://kotlinlang.org/docs/home.html",
    type: "DOCUMENTATION",
    provider: "Kotlin",
    durationHours: 10,
    isUniversityApproved: true,
    rating: 4.8,
    skills: ["Kotlin"]
  },
  {
    title: "Power BI Dashboard Guide",
    url: "https://learn.microsoft.com/en-us/power-bi/",
    type: "TUTORIAL",
    provider: "Microsoft",
    durationHours: 7,
    isUniversityApproved: true,
    rating: 4.6,
    skills: ["Power BI", "Data Modeling"]
  },
  {
    title: "Tableau Visualization",
    url: "https://help.tableau.com/current/pro/desktop/en-us/default.htm",
    type: "DOCUMENTATION",
    provider: "Tableau",
    durationHours: 8,
    isUniversityApproved: true,
    rating: 4.7,
    skills: ["Tableau", "Data Modeling"]
  },
  {
    title: "Product Analytics Playbook",
    url: "https://amplitude.com/user-cohort-playbook",
    type: "BOOK",
    provider: "Amplitude",
    durationHours: 5,
    isUniversityApproved: true,
    rating: 4.8,
    skills: ["Product Analytics", "Statistics"]
  },
  {
    title: "Agile Scrum Guide",
    url: "https://www.scrumguides.org/scrum-guide.html",
    type: "DOCUMENTATION",
    provider: "Scrum.org",
    durationHours: 3,
    isUniversityApproved: true,
    rating: 4.8,
    skills: ["Agile Delivery"]
  },
  {
    title: "UX Research Methods",
    url: "https://www.nngroup.com/articles/which-ux-research-methods/",
    type: "DOCUMENTATION",
    provider: "NN/g",
    durationHours: 5,
    isUniversityApproved: true,
    rating: 4.9,
    skills: ["User Research", "Figma"]
  },
  {
    title: "Network Security Essentials",
    url: "https://youtube.com/network-security-basics",
    type: "VIDEO_COURSE",
    provider: "YouTube",
    durationHours: 6,
    isUniversityApproved: true,
    rating: 4.7,
    skills: ["Network Security", "OWASP Top 10"]
  },
  {
    title: "IAM Best Practices",
    url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html",
    type: "DOCUMENTATION",
    provider: "AWS",
    durationHours: 4,
    isUniversityApproved: true,
    rating: 4.8,
    skills: ["Identity and Access Management", "AWS"]
  },
  {
    title: "CSS Tricks Complete Guide",
    url: "https://css-tricks.com/guides/",
    type: "DOCUMENTATION",
    provider: "CSS-Tricks",
    durationHours: 5,
    isUniversityApproved: true,
    rating: 4.8,
    skills: ["CSS"]
  },
  {
    title: "HTML5 Boilerplate Guide",
    url: "https://html5boilerplate.com/",
    type: "DOCUMENTATION",
    provider: "HTML5 Boilerplate",
    durationHours: 3,
    isUniversityApproved: true,
    rating: 4.7,
    skills: ["HTML"]
  },
  {
    title: "Intermediate Data Modeling",
    url: "https://youtube.com/data-modeling-intermediate",
    type: "VIDEO_COURSE",
    provider: "YouTube",
    durationHours: 5,
    isUniversityApproved: true,
    rating: 4.7,
    skills: ["Data Modeling", "SQL"]
  },
  {
    title: "Statistics 101",
    url: "https://www.khanacademy.org/math/statistics-probability",
    type: "COURSE",
    provider: "Khan Academy",
    durationHours: 15,
    isUniversityApproved: true,
    rating: 4.8,
    skills: ["Statistics"]
  },
  {
    title: "UIU CSE 4802 Machine Learning",
    url: "https://uiu.ac.bd/cse-4802-ml",
    type: "UNIVERSITY_ELECTIVE",
    provider: "UIU",
    durationHours: 36,
    isUniversityApproved: true,
    courseCode: "CSE 4802",
    rating: 4.9,
    skills: ["scikit-learn", "Statistics"]
  },
  {
    title: "UIU CSE 3811 Artificial Intelligence",
    url: "https://uiu.ac.bd/cse-3811-ai",
    type: "UNIVERSITY_ELECTIVE",
    provider: "UIU",
    durationHours: 36,
    isUniversityApproved: true,
    courseCode: "CSE 3811",
    rating: 4.8,
    skills: ["Python", "Statistics"]
  },
  {
    title: "UIU CSE 4325 Software Engineering",
    url: "https://uiu.ac.bd/cse-4325-se",
    type: "UNIVERSITY_ELECTIVE",
    provider: "UIU",
    durationHours: 36,
    isUniversityApproved: true,
    courseCode: "CSE 4325",
    rating: 4.7,
    skills: ["Agile Delivery"]
  },
  {
    title: "UIU CSE 3522 Database Management Systems",
    url: "https://uiu.ac.bd/cse-3522-dbms",
    type: "UNIVERSITY_ELECTIVE",
    provider: "UIU",
    durationHours: 36,
    isUniversityApproved: true,
    courseCode: "CSE 3522",
    rating: 4.8,
    skills: ["SQL", "PostgreSQL"]
  },
  {
    title: "UIU CSE 4889 Capstone Project",
    url: "https://uiu.ac.bd/cse-4889-capstone",
    type: "UNIVERSITY_ELECTIVE",
    provider: "UIU",
    durationHours: 72,
    isUniversityApproved: true,
    courseCode: "CSE 4889",
    rating: 4.9,
    skills: ["Agile Delivery"]
  },
  {
    title: "UIU CSE 4181 Computer Networks",
    url: "https://uiu.ac.bd/cse-4181-networks",
    type: "UNIVERSITY_ELECTIVE",
    provider: "UIU",
    durationHours: 36,
    isUniversityApproved: true,
    courseCode: "CSE 4181",
    rating: 4.8,
    skills: ["Network Security"]
  }
];

const shortNameOverrides: Record<string, string> = {
  "University of Dhaka": "DU",
  "Bangladesh University of Engineering & Technology (BUET)": "BUET",
  "North South University": "NSU",
  "BRAC University": "BRACU",
  "Independent University, Bangladesh": "IUB",
  "United International University (UIU)": "UIU",
  "Bangladesh University of Textiles (BUTEX)": "BUTEX",
  "Bangladesh University of Professionals (BUP)": "BUP",
  "Rajshahi University of Engineering & Technology (RUET)": "RUET",
  "Chittagong University of Engineering & Technology (CUET)": "CUET",
  "Khulna University of Engineering & Technology (KUET)": "KUET",
  "Dhaka University of Engineering & Technology (DUET)": "DUET",
  "University of Liberal Arts (ULAB)": "ULAB",
  "University of Liberal Arts Bangladesh": "ULAB"
};

function getShortName(name: string): string {
  const cleanName = name.trim();
  if (shortNameOverrides[cleanName]) {
    return shortNameOverrides[cleanName];
  }
  const parenMatch = cleanName.match(/\(([^)]+)\)/);
  if (parenMatch) return parenMatch[1].trim();

  const noParenName = cleanName.replace(/[(),]/g, "");
  const words = noParenName.split(/\s+/).filter(w => {
    const lw = w.toLowerCase();
    return !["of", "and", "the", "a", "an", "for", "&", "science", "technology", "university"].includes(lw);
  });

  let abbr = words.map(w => w[0]?.toUpperCase()).join("");
  if (abbr.length < 2) {
    const allWords = noParenName.split(/\s+/);
    abbr = allWords.map(w => w[0]?.toUpperCase()).join("");
  }
  return abbr;
}

const shortNamesUsed = new Set<string>();
function generateUniqueShortName(name: string): string {
  let base = getShortName(name);
  let result = base;
  let counter = 1;
  while (shortNamesUsed.has(result)) {
    result = `${base}${counter}`;
    counter++;
  }
  shortNamesUsed.add(result);
  return result;
}

const rawUniversityNames = [
  "University of Dhaka",
  "University of Rajshahi",
  "University of Chittagong",
  "Jahangirnagar University",
  "Islamic University",
  "Shahjalal University of Science & Technology",
  "Khulna University",
  "Hajee Mohammad Danesh Science & Technology University",
  "Mawlana Bhashani Science & Technology University",
  "Comilla University",
  "Jatiya Kabi Kazi Nazrul Islam University",
  "Begum Rokeya University",
  "Pabna University of Science & Technology",
  "Noakhali Science & Technology University",
  "Jessore University of Science & Technology",
  "Bangabandhu Sheikh Mujibur Rahman Science & Technology University",
  "University of Barishal",
  "Rabindra University Bangladesh",
  "Bangamata Sheikh Fojilatunnesa Mujib Science & Technology University",
  "Sunamganj Science and Technology University",
  "Chandpur Science and Technology University",
  "Thakurgaon University",
  "Meherpur University",
  "Pirojpur Science and Technology University",
  "Bangladesh University of Engineering & Technology (BUET)",
  "Rajshahi University of Engineering & Technology (RUET)",
  "Chittagong University of Engineering & Technology (CUET)",
  "Khulna University of Engineering & Technology (KUET)",
  "Dhaka University of Engineering & Technology (DUET)",
  "Bogura Science and Technology University",
  "Bangladesh Agricultural University",
  "Sher-e-Bangla Agricultural University",
  "Bangabandhu Sheikh Mujibur Rahman Agricultural University",
  "Sylhet Agricultural University",
  "Patuakhali Science & Technology University",
  "Chittagong Veterinary and Animal Sciences University",
  "Bangladesh University of Textiles (BUTEX)",
  "Bangladesh Maritime University",
  "Bangladesh University of Professionals (BUP)",
  "Bangladesh Open University",
  "National University",
  "Islamic Arabic University",
  "Aviation and Aerospace University, Bangladesh",
  "North South University",
  "University of Science & Technology Chittagong",
  "Independent University, Bangladesh",
  "Central Women's University",
  "International University of Business Agriculture & Technology",
  "International Islamic University Chittagong",
  "Ahsanullah University of Science & Technology",
  "American International University-Bangladesh",
  "East West University",
  "University of Asia Pacific",
  "Gono Bishwabidyalay",
  "The People's University of Bangladesh",
  "Asian University of Bangladesh",
  "Dhaka International University",
  "Manarat International University",
  "BRAC University",
  "Bangladesh University",
  "Leading University",
  "BGC Trust University Bangladesh",
  "Sylhet International University",
  "University of Development Alternative",
  "Premier University",
  "Southeast University",
  "Daffodil International University",
  "Stamford University Bangladesh",
  "State University of Bangladesh",
  "City University",
  "Prime University",
  "Northern University Bangladesh",
  "Southern University Bangladesh",
  "Green University of Bangladesh",
  "Pundra University of Science & Technology",
  "World University of Bangladesh",
  "Shanto-Mariam University of Creative Technology",
  "The Millennium University",
  "Uttara University",
  "Bangladesh Islami University",
  "Atish Dipankar University of Science & Technology",
  "Port City International University",
  "Metropolitan University",
  "Eastern University",
  "University of Information Technology & Sciences",
  "Presidency University",
  "North Bengal International University",
  "University of Liberal Arts Bangladesh",
  "Varendra University",
  "Queens University",
  "Royal University of Dhaka",
  "University of South Asia",
  "Primeasia University",
  "Bangladesh University of Business & Technology",
  "Fareast International University",
  "Khwaja Yunus Ali University",
  "Feni University",
  "Victoria University of Bangladesh",
  "German University Bangladesh",
  "Exim Bank Agricultural University Bangladesh",
  "IBAIS University",
  "International University of Scholars",
  "Zaman University",
  "North East University Bangladesh",
  "Sonargaon University",
  "Hamdard University Bangladesh",
  "Cox's Bazar International University",
  "Britannia University",
  "Canadian University of Bangladesh",
  "CCN University of Science & Technology",
  "Ishaka International University",
  "Ranada Prasad Shaha University",
  "Global University Bangladesh",
  "Central University of Science & Technology",
  "ASA University Bangladesh",
  "Anwer Khan Modern University",
  "Sheikh Fazilatunnessa Mujib University",
  "Bangladesh Army University of Engineering & Technology",
  "Bangladesh Army University of Science & Technology",
  "Bangladesh Army International University of Science & Technology",
  "Cumilla University of Science & Technology",
  "Jagorani Chakra University",
  "International Standard University",
  "Northern University of Business & Technology Khulna",
  "Notre Dame University Bangladesh",
  "Chattogram Women's University",
  "Wazed Miah Science and Technology University",
  "First Capital University of Bangladesh",
  "Eminence University of Science and Technology",
  "Inspire University Bangladesh",
  "Barisal International University",
  "United International University (UIU)",
  "Kurigram Agricultural University",
  "Dhaka Shikkha University",
  "Rajshahi Science and Technology University",
  "Sylhet Engineering University",
  "Innovision University",
  "Mujib University",
  "University of Liberal Arts (ULAB)"
];

const academicCatalog = rawUniversityNames.map(name => {
  const shortName = generateUniqueShortName(name);
  let allowedDomains = [`${shortName.toLowerCase()}.edu.bd`, `student.${shortName.toLowerCase()}.edu.bd`];
  if (shortName === "DU") {
    allowedDomains = ["du.ac.bd", "student.du.ac.bd"];
  }
  return {
    name,
    shortName,
    country: "Bangladesh",
    allowedDomains,
    departments: [
      { name: "Computer Science and Engineering", code: "CSE" },
      { name: "Software Engineering", code: "SWE" },
      { name: "Electrical and Electronic Engineering", code: "EEE" },
      { name: "Business Administration", code: "BBA" }
    ]
  };
});

const alumniData = [
  {
    fullName: "Jane Doe",
    email: "jane.doe@example.com",
    company: "Google",
    role: "Senior Software Engineer",
    skills: ["React", "TypeScript", "JavaScript"],
    experience: 6,
    gradYear: 2018,
    linkedin: "https://linkedin.com/in/janedoe"
  },
  {
    fullName: "John Smith",
    email: "john.smith@example.com",
    company: "Meta",
    role: "Tech Lead",
    skills: ["Node.js", "Express", "PostgreSQL"],
    experience: 8,
    gradYear: 2016,
    linkedin: "https://linkedin.com/in/johnsmith"
  },
  {
    fullName: "Alice Johnson",
    email: "alice.johnson@example.com",
    company: "Netflix",
    role: "Senior Data Engineer",
    skills: ["Python", "SQL", "Docker"],
    experience: 5,
    gradYear: 2019,
    linkedin: "https://linkedin.com/in/alicejohnson"
  }
];

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("base64url");
  const derived = crypto.scryptSync(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${derived.toString("base64url")}`;
}

async function main() {
  console.log("Cleaning database...");
  await prisma.academicInvitation.deleteMany();
  await prisma.simulatedPath.deleteMany();
  await prisma.skillDecayAudit.deleteMany();
  await prisma.resumeExport.deleteMany();
  await prisma.alumniMentorship.deleteMany();
  await prisma.careerFairBooth.deleteMany();
  await prisma.careerFair.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.systemNotification.deleteMany();
  await prisma.projectInvitation.deleteMany();
  await prisma.teamMatch.deleteMany();
  await prisma.teamRequest.deleteMany();
  await prisma.peerEndorsement.deleteMany();
  await prisma.studentLearningPath.deleteMany();
  await prisma.certification.deleteMany();
  await prisma.studentResourceCompletion.deleteMany();
  await prisma.resourceSkill.deleteMany();
  await prisma.learningResource.deleteMany();
  await prisma.roleRequirement.deleteMany();
  await prisma.industryRole.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.skillCategory.deleteMany();
  await prisma.portfolio.deleteMany();
  await prisma.githubCommit.deleteMany();
  await prisma.projectCollaborator.deleteMany();
  await prisma.academicProject.deleteMany();
  await prisma.githubRepository.deleteMany();
  await prisma.oauthConnection.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.alumniProfile.deleteMany();
  await prisma.department.deleteMany();
  await prisma.university.deleteMany();
  await prisma.user.deleteMany();
  console.log("Database cleaned.");

  // Password hash for '123456' as requested by user
  console.log("Generating password hash...");
  const passwordHash = hashPassword("123456");

  // 1. Seed Admin
  console.log("Seeding system admin...");
  await prisma.user.create({
    data: {
      fullName: "System Admin",
      email: "admin@skillgraph.com",
      role: "admin",
      passwordHash,
      emailVerifiedAt: new Date(),
      isActive: true
    }
  });

  // 3. Seed Universities & Departments
  console.log("Seeding universities and departments...");
  const universityMap: Record<string, any> = {};
  const departmentMap: Record<string, Record<string, any>> = {};

  for (const uniInput of academicCatalog) {
    const university = await prisma.university.create({
      data: {
        name: uniInput.name,
        shortName: uniInput.shortName,
        country: uniInput.country,
        allowedDomains: uniInput.allowedDomains || []
      }
    });
    universityMap[uniInput.shortName] = university;
    departmentMap[uniInput.shortName] = {};

    for (const deptInput of uniInput.departments) {
      const department = await prisma.department.create({
        data: {
          name: deptInput.name,
          code: deptInput.code,
          universityId: university.id
        }
      });
      departmentMap[uniInput.shortName][deptInput.code] = department;
    }
  }

  // 2b. Seed Professor (after universities so we can assign universityId)
  console.log("Seeding professor...");
  const duUniversity = universityMap["DU"];
  await prisma.user.create({
    data: {
      fullName: "Dr. Sarah Hasan",
      email: "sarah.hasan@du.ac.bd",
      role: "professor",
      passwordHash,
      emailVerifiedAt: new Date(),
      isActive: true,
      universityId: duUniversity?.id
    }
  });

  // 4. Seed Skill Categories
  console.log("Seeding skill categories...");
  const skillCategoryMap: Record<string, any> = {};
  for (const cat of categories) {
    const category = await prisma.skillCategory.create({
      data: cat
    });
    skillCategoryMap[cat.name] = category;
  }

  // 5. Seed Skills
  console.log("Seeding skills...");
  const skillMap: Record<string, any> = {};
  for (const sk of skills) {
    const category = skillCategoryMap[sk.category];
    const skill = await prisma.skill.create({
      data: {
        name: sk.name,
        aliases: sk.aliases,
        categoryId: category?.id
      }
    });
    skillMap[sk.name] = skill;
  }

  // 6. Seed Industry Roles & Requirements
  console.log("Seeding industry roles...");
  const roleMap: Record<string, any> = {};
  for (const r of roles) {
    const industryRole = await prisma.industryRole.create({
      data: {
        title: r.title,
        description: r.description,
        source: "LinkedIn + roadmap.sh curation"
      }
    });
    roleMap[r.title] = industryRole;

    for (const req of r.requiredSkills) {
      const skill = skillMap[req.name];
      if (skill) {
        await prisma.roleRequirement.create({
          data: {
            roleId: industryRole.id,
            skillId: skill.id,
            criticality: req.criticality
          }
        });
      }
    }
  }

  // 7. Seed Learning Resources & Resource Skills
  console.log("Seeding learning resources...");
  const resourceMap: Record<string, any> = {};
  for (const res of resources) {
    const { skills: resSkills, ...resData } = res;
    const learningResource = await prisma.learningResource.create({
      data: {
        ...resData,
        ...(resData.isUniversityApproved ? { universityId: universityMap["DU"]?.id } : {})
      }
    });
    resourceMap[res.title] = learningResource;

    if (resSkills) {
      for (const skName of resSkills) {
        const skill = skillMap[skName];
        if (skill) {
          await prisma.resourceSkill.create({
            data: {
              resourceId: learningResource.id,
              skillId: skill.id
            }
          });
        }
      }
    }
  }

  // 8. Seed Alumni Profiles
  console.log("Seeding alumni profiles...");
  const alumniMap: Record<string, any> = {};
  for (const item of alumniData) {
    const user = await prisma.user.create({
      data: {
        email: item.email,
        fullName: item.fullName,
        passwordHash,
        emailVerifiedAt: new Date(),
        role: "alumni",
        isActive: true,
        universityId: universityMap["DU"]?.id,
        alumniProfile: {
          create: {
            currentCompany: item.company,
            currentRole: item.role,
            yearsExperience: item.experience,
            graduationYear: item.gradYear,
            mentoringSkills: item.skills,
            willingToMentor: true,
            linkedinUrl: item.linkedin,
            verified: true,
            alumniCardUrl: `https://skillgraph.com/cards/${item.fullName.toLowerCase().replace(" ", "_")}.png`,
            universityId: universityMap["DU"]?.id
          }
        }
      },
      include: {
        alumniProfile: true
      }
    });
    alumniMap[item.fullName] = user;
  }

  // 9. Seed Student Profiles
  console.log("Seeding student profiles...");
  const studentsData = [
    {
      fullName: "Rahim Islam",
      email: "rahim@student.du.ac.bd",
      publicHandle: "rahimislam",
      studentIdNo: "DU-CSE-2023-01",
      bio: "Aspiring Full-stack Engineer, active open-source contributor.",
      gradYear: 2027,
      uniKey: "DU",
      deptKey: "CSE",
      linkedin: "https://linkedin.com/in/rahimislam",
      portfolio: "https://rahimislam.dev"
    },
    {
      fullName: "Karim Rahman",
      email: "karim@student.buet.ac.bd",
      publicHandle: "karimrahman",
      studentIdNo: "BUET-CSE-2022-05",
      bio: "ML enthusiast interested in big data pipelines & neural networks.",
      gradYear: 2026,
      uniKey: "BUET",
      deptKey: "CSE",
      linkedin: "https://linkedin.com/in/karimrahman",
      portfolio: "https://karimrahman.io"
    },
    {
      fullName: "Nabila Zaman",
      email: "nabila@student.nsu.edu",
      publicHandle: "nabilazaman",
      studentIdNo: "NSU-CSE-2023-42",
      bio: "Design-minded frontend developer who loves accessibility and UI/UX.",
      gradYear: 2027,
      uniKey: "NSU",
      deptKey: "CSE",
      linkedin: "https://linkedin.com/in/nabilazaman",
      portfolio: "https://nabila.design"
    },
    {
      fullName: "Fahim Ahmed",
      email: "fahim@student.bracu.ac.bd",
      publicHandle: "fahimahmed",
      studentIdNo: "BRACU-CSE-2024-11",
      bio: "First year Computer Science student exploring software engineering.",
      gradYear: 2028,
      uniKey: "BRACU",
      deptKey: "CSE",
      linkedin: "https://linkedin.com/in/fahimahmed",
      portfolio: "https://fahim.codes"
    }
  ];

  const studentMap: Record<string, any> = {};
  for (const st of studentsData) {
    const uni = universityMap[st.uniKey];
    const dept = departmentMap[st.uniKey]?.[st.deptKey];

    const user = await prisma.user.create({
      data: {
        email: st.email,
        fullName: st.fullName,
        passwordHash,
        emailVerifiedAt: new Date(),
        role: "student",
        isActive: true,
        universityId: uni?.id,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${st.publicHandle}`,
        studentProfile: {
          create: {
            studentIdNo: st.studentIdNo,
            graduationYear: st.gradYear,
            bio: st.bio,
            linkedinUrl: st.linkedin,
            portfolioUrl: st.portfolio,
            publicHandle: st.publicHandle,
            universityId: uni?.id,
            departmentId: dept?.id
          }
        }
      },
      include: {
        studentProfile: true
      }
    });
    studentMap[st.fullName] = user;
  }

  const rahimUser = studentMap["Rahim Islam"];
  const karimUser = studentMap["Karim Rahman"];
  const nabilaUser = studentMap["Nabila Zaman"];

  // 10. Seed OAuth Connection
  console.log("Seeding OAuth connections...");
  await prisma.oauthConnection.create({
    data: {
      userId: rahimUser.id,
      provider: "github",
      accessTokenEnc: "mock_enc_rahim_github_token",
      tokenScope: "read:user,repo",
      lastUsedAt: new Date()
    }
  });

  await prisma.oauthConnection.create({
    data: {
      userId: karimUser.id,
      provider: "github",
      accessTokenEnc: "mock_enc_karim_github_token",
      tokenScope: "read:user,repo",
      lastUsedAt: new Date()
    }
  });

  // 11. Seed GitHub Repository
  console.log("Seeding GitHub repositories...");
  const rahimRepo = await prisma.githubRepository.create({
    data: {
      userId: rahimUser.id,
      githubRepoId: 987654321n,
      repoName: "skill-navigator",
      fullName: "rahimislam/skill-navigator",
      description: "Interactive skill graph builder for students.",
      language: "TypeScript",
      starsCount: 15,
      isFork: false,
      rawReadmeText: "# Skill Navigator\nThis project tracks skills and links them to industries.",
      lastIngestedAt: new Date()
    }
  });

  const karimRepo = await prisma.githubRepository.create({
    data: {
      userId: karimUser.id,
      githubRepoId: 887654321n,
      repoName: "data-pipeline",
      fullName: "karimrahman/data-pipeline",
      description: "Fast data processing logic for postgres databases.",
      language: "Python",
      starsCount: 4,
      isFork: false,
      rawReadmeText: "# Data Pipeline\nETL jobs in Python.",
      lastIngestedAt: new Date()
    }
  });

  // 12. Seed GitHub Commit
  console.log("Seeding GitHub commits...");
  await prisma.githubCommit.create({
    data: {
      repoId: rahimRepo.id,
      sha: "a1b2c3d4e5f6g7h8i9j0a1b2c3d4e5f6g7h8i9j0",
      message: "feat: implement skill hierarchy rendering",
      committedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.githubCommit.create({
    data: {
      repoId: rahimRepo.id,
      sha: "b2c3d4e5f6g7h8i9j0a1b2c3d4e5f6g7h8i9j0a1",
      message: "fix: solve rendering glitches on Chrome",
      committedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.githubCommit.create({
    data: {
      repoId: karimRepo.id,
      sha: "c3d4e5f6g7h8i9j0a1b2c3d4e5f6g7h8i9j0a1b2",
      message: "feat: add postgres copy command performance tuning",
      committedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    }
  });

  // 13. Seed Academic Project
  console.log("Seeding academic projects...");
  const proj1 = await prisma.academicProject.create({
    data: {
      title: "SkillGraph Monorepo",
      description: "Unified portal for student skill tracking, simulation and decay calculations.",
      ownerId: rahimUser.id,
      repoId: rahimRepo.id,
      startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      endDate: null,
      isCapstone: true
    }
  });

  const proj2 = await prisma.academicProject.create({
    data: {
      title: "Distributed Pipeline",
      description: "Processing logs asynchronously.",
      ownerId: karimUser.id,
      repoId: karimRepo.id,
      startDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      isCapstone: false
    }
  });

  // 14. Seed Project Collaborator
  console.log("Seeding collaborators...");
  await prisma.projectCollaborator.create({
    data: {
      projectId: proj1.id,
      userId: rahimUser.id,
      role: "Lead Architect & Fullstack Dev",
      joinedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.projectCollaborator.create({
    data: {
      projectId: proj1.id,
      userId: nabilaUser.id,
      role: "Frontend Engineer / UI Lead",
      joinedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.projectCollaborator.create({
    data: {
      projectId: proj2.id,
      userId: karimUser.id,
      role: "Project Owner / Data Engineer",
      joinedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.projectCollaborator.create({
    data: {
      projectId: proj2.id,
      userId: rahimUser.id,
      role: "Infrastructure Consultant",
      joinedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
    }
  });

  // 15. Seed Portfolio
  console.log("Seeding portfolios...");
  await prisma.portfolio.create({
    data: {
      studentId: rahimUser.studentProfile.id,
      isPublic: true,
      viewCount: 120,
      lastViewed: new Date()
    }
  });

  await prisma.portfolio.create({
    data: {
      studentId: karimUser.studentProfile.id,
      isPublic: true,
      viewCount: 45,
      lastViewed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.portfolio.create({
    data: {
      studentId: nabilaUser.studentProfile.id,
      isPublic: true,
      viewCount: 310,
      lastViewed: new Date()
    }
  });

  // 16. Seed Student Resource Completion
  console.log("Seeding student resource completions...");
  const res1 = resourceMap["MDN JavaScript Guide"];
  const res2 = resourceMap["React Documentation"];
  const res3 = resourceMap["TypeScript Handbook"];
  const res4 = resourceMap["PostgreSQL Tutorial"];
  const res5 = resourceMap["Docker Get Started"];

  if (res1) {
    await prisma.studentResourceCompletion.create({
      data: {
        studentId: rahimUser.studentProfile.id,
        resourceId: res1.id,
        completedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    });
  }
  if (res2) {
    await prisma.studentResourceCompletion.create({
      data: {
        studentId: rahimUser.studentProfile.id,
        resourceId: res2.id,
        completedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
      }
    });
  }
  if (res3) {
    await prisma.studentResourceCompletion.create({
      data: {
        studentId: rahimUser.studentProfile.id,
        resourceId: res3.id,
        completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      }
    });
  }

  if (res4) {
    await prisma.studentResourceCompletion.create({
      data: {
        studentId: karimUser.studentProfile.id,
        resourceId: res4.id,
        completedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
      }
    });
  }
  if (res5) {
    await prisma.studentResourceCompletion.create({
      data: {
        studentId: karimUser.studentProfile.id,
        resourceId: res5.id,
        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      }
    });
  }

  // 17. Seed Certification
  console.log("Seeding certifications...");
  await prisma.certification.create({
    data: {
      studentId: rahimUser.studentProfile.id,
      name: "AWS Certified Cloud Practitioner",
      issuer: "Amazon Web Services",
      issuedDate: new Date("2025-06-01"),
      expiryDate: new Date("2028-06-01"),
      credentialUrl: "https://aws.amazon.com/verification/12345"
    }
  });

  await prisma.certification.create({
    data: {
      studentId: karimUser.studentProfile.id,
      name: "Google Data Analytics Professional Certificate",
      issuer: "Google",
      issuedDate: new Date("2025-01-10"),
      expiryDate: new Date("2028-01-10"),
      credentialUrl: "https://coursera.org/verify/abcde"
    }
  });

  // 18. Seed Student Learning Path
  console.log("Seeding student learning paths...");
  const fsRole = roleMap["Full-stack Engineer"];
  const deRole = roleMap["Data Engineer"];

  if (fsRole) {
    await prisma.studentLearningPath.create({
      data: {
        studentId: rahimUser.studentProfile.id,
        roleId: fsRole.id,
        completionPct: 75.0,
        missingSkillsJson: ["Docker", "CI/CD", "Playwright"],
        roadmapJson: {
          milestones: [
            { name: "Containerization with Docker", resource: "Docker Get Started" },
            { name: "CI/CD Pipelines", resource: "CI/CD with GitHub Actions" }
          ]
        },
        isActive: true,
        lastComputedAt: new Date()
      }
    });
  }

  if (deRole) {
    await prisma.studentLearningPath.create({
      data: {
        studentId: karimUser.studentProfile.id,
        roleId: deRole.id,
        completionPct: 60.0,
        missingSkillsJson: ["Data Modeling", "AWS"],
        roadmapJson: {
          milestones: [
            { name: "AWS Cloud Skills", resource: "AWS Skill Builder" }
          ]
        },
        isActive: true,
        lastComputedAt: new Date()
      }
    });
  }

  // 19. Seed Peer Endorsement
  console.log("Seeding peer endorsements...");
  const htmlSkill = skillMap["HTML"];
  const tsSkill = skillMap["TypeScript"];
  const pgSkill = skillMap["PostgreSQL"];

  if (htmlSkill) {
    await prisma.peerEndorsement.create({
      data: {
        endorserId: rahimUser.id,
        endorsedId: nabilaUser.id,
        skillId: htmlSkill.id
      }
    });
  }

  if (tsSkill) {
    await prisma.peerEndorsement.create({
      data: {
        endorserId: nabilaUser.id,
        endorsedId: rahimUser.id,
        skillId: tsSkill.id
      }
    });
  }

  if (pgSkill) {
    await prisma.peerEndorsement.create({
      data: {
        endorserId: karimUser.id,
        endorsedId: rahimUser.id,
        skillId: pgSkill.id
      }
    });
  }

  // 20. Seed Team Request
  console.log("Seeding team requests...");
  const tr1 = await prisma.teamRequest.create({
    data: {
      projectId: proj1.id,
      requesterId: rahimUser.id,
      requiredSkills: ["Docker", "CI/CD"]
    }
  });

  const tr2 = await prisma.teamRequest.create({
    data: {
      projectId: proj2.id,
      requesterId: karimUser.id,
      requiredSkills: ["Python", "Statistics"]
    }
  });

  // 21. Seed Team Match
  console.log("Seeding team matches...");
  await prisma.teamMatch.create({
    data: {
      requestId: tr1.id,
      matchedUser: karimUser.id,
      matchScore: 0.85
    }
  });

  await prisma.teamMatch.create({
    data: {
      requestId: tr2.id,
      matchedUser: rahimUser.id,
      matchScore: 0.75
    }
  });

  // 22. Seed Project Invitation
  console.log("Seeding project invitations...");
  await prisma.projectInvitation.create({
    data: {
      projectId: proj1.id,
      fromUserId: rahimUser.id,
      toUserId: nabilaUser.id,
      status: "accepted",
      respondedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.projectInvitation.create({
    data: {
      projectId: proj2.id,
      fromUserId: karimUser.id,
      toUserId: rahimUser.id,
      status: "pending"
    }
  });

  // 23. Seed System Notification
  console.log("Seeding system notifications...");
  await prisma.systemNotification.create({
    data: {
      userId: rahimUser.id,
      type: "INFO",
      payload: { message: "Welcome to SkillGraph! Your account has been setup." },
      isRead: true
    }
  });

  await prisma.systemNotification.create({
    data: {
      userId: rahimUser.id,
      type: "COLLABORATION_INVITE",
      payload: { message: "Karim has invited you to join project 'Distributed Pipeline'." },
      isRead: false
    }
  });

  await prisma.systemNotification.create({
    data: {
      userId: nabilaUser.id,
      type: "ENDORSEMENT",
      payload: { message: "Rahim endorsed you for HTML!" },
      isRead: false
    }
  });

  // 24. Seed Audit Log
  console.log("Seeding audit logs...");
  await prisma.auditLog.create({
    data: {
      userId: rahimUser.id,
      action: "USER_LOGIN",
      entity: "User",
      entityId: rahimUser.id,
      metadata: { browser: "Chrome", OS: "Windows" },
      ipAddress: "192.168.1.10"
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: rahimUser.id,
      action: "PORTFOLIO_VIEW",
      entity: "Portfolio",
      entityId: null,
      metadata: { referrer: "LinkedIn" },
      ipAddress: "182.50.40.21"
    }
  });

  // 25. Seed Career Fair & Booth
  console.log("Seeding career fairs...");
  const duUni = universityMap["DU"];
  if (duUni) {
    const fair = await prisma.careerFair.create({
      data: {
        universityId: duUni.id,
        name: "DU CSE Career Fair 2026",
        eventDate: new Date("2026-09-15"),
        location: "DU TSC Auditorium"
      }
    });

    await prisma.careerFairBooth.create({
      data: {
        fairId: fair.id,
        companyName: "Brain Station 23",
        requiredSkills: ["React", "Node.js", "TypeScript"],
        hiringRoles: ["Frontend Developer", "Full-stack Engineer"],
        boothNumber: "B1"
      }
    });

    await prisma.careerFairBooth.create({
      data: {
        fairId: fair.id,
        companyName: "Samsung R&D BD",
        requiredSkills: ["Python", "PyTorch", "C++"],
        hiringRoles: ["Machine Learning Engineer"],
        boothNumber: "B2"
      }
    });
  }

  // 26. Seed Alumni Mentorship
  console.log("Seeding alumni mentorships...");
  const janeDoeAlumni = alumniMap["Jane Doe"];
  const aliceJohnsonAlumni = alumniMap["Alice Johnson"];

  if (janeDoeAlumni && janeDoeAlumni.alumniProfile && tsSkill) {
    await prisma.alumniMentorship.create({
      data: {
        studentId: rahimUser.studentProfile.id,
        alumniId: janeDoeAlumni.alumniProfile.id,
        skillId: tsSkill.id,
        status: "active",
        startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    });
  }

  if (aliceJohnsonAlumni && aliceJohnsonAlumni.alumniProfile && pgSkill) {
    await prisma.alumniMentorship.create({
      data: {
        studentId: karimUser.studentProfile.id,
        alumniId: aliceJohnsonAlumni.alumniProfile.id,
        skillId: pgSkill.id,
        status: "requested"
      }
    });
  }

  // 27. Seed Resume Export
  console.log("Seeding resume exports...");
  if (fsRole) {
    await prisma.resumeExport.create({
      data: {
        studentId: rahimUser.studentProfile.id,
        roleId: fsRole.id,
        filePath: "/exports/rahim_fullstack_resume.pdf",
        atsScore: 84.5
      }
    });
  }

  if (deRole) {
    await prisma.resumeExport.create({
      data: {
        studentId: karimUser.studentProfile.id,
        roleId: deRole.id,
        filePath: "/exports/karim_data_resume.pdf",
        atsScore: 78.0
      }
    });
  }

  // 28. Seed Skill Decay Audit
  console.log("Seeding skill decay audits...");
  await prisma.skillDecayAudit.create({
    data: {
      studentId: rahimUser.studentProfile.id,
      skillName: "TypeScript",
      currentWeight: 0.95,
      lastActiveDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      lastDecayedAt: null,
      isDormant: false,
      decayCycles: 0
    }
  });

  await prisma.skillDecayAudit.create({
    data: {
      studentId: rahimUser.studentProfile.id,
      skillName: "HTML",
      currentWeight: 0.45,
      lastActiveDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      lastDecayedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      isDormant: true,
      decayCycles: 2
    }
  });

  // 29. Seed Simulated Path
  console.log("Seeding simulated paths...");
  if (fsRole) {
    await prisma.simulatedPath.create({
      data: {
        studentId: rahimUser.studentProfile.id,
        scenarioName: "Simulate containerization skill booster",
        targetRoleId: fsRole.id,
        hypotheticalSkills: ["Docker", "Kubernetes"],
        simulatedResult: {
          feasibility: "high",
          completionPctDelta: 15.0
        },
        completionDelta: 15.0,
        weeksSaved: 6
      }
    });
  }

  // ==========================================
  // PROGRAMMATIC EXPANDED SEED GENERATION
  // ==========================================
  console.log("Starting programmatic generation for 5 universities: 20 students, 10 professors, 15 alumni each...");

  const firstNames = ["Rahim", "Karim", "Nabila", "Fahim", "Ayesha", "Imran", "Sultana", "Tanvir", "Farhana", "Zahid", "Marium", "Arif", "Sadia", "Rashed", "Tasnim", "Kamal", "Rina", "Hasan", "Fatima", "Selim", "Anis", "Tariq", "Munir", "Habib", "Jamil"];
  const lastNames = ["Islam", "Rahman", "Ahmed", "Zaman", "Hasan", "Khan", "Chowdhury", "Uddin", "Ali", "Sarker", "Hossain", "Begum", "Talukder", "Miah", "Akter", "Yasmin", "Bhuiyan", "Patwary", "Jahan", "Alam", "Siddique", "Bari", "Kundu", "Dutta", "Paul"];
  const companies = ["Google", "Meta", "Microsoft", "Amazon", "Apple", "Netflix", "Uber", "Airbnb", "Stripe", "Intel", "IBM", "Oracle", "Samsung", "Sony", "Dell"];
  const rolesList = ["Software Engineer", "Senior Software Engineer", "Tech Lead", "Data Scientist", "DevOps Engineer", "Frontend Developer", "Backend Developer", "ML Engineer", "Product Manager"];

  const dbSkills = await prisma.skill.findMany();
  const dbResources = await prisma.learningResource.findMany();
  const dbRoles = await prisma.industryRole.findMany();

  // Initialize Neo4j driver
  const neo4jDriver = neo4j.driver(
    process.env.NEO4J_URI || "bolt://neo4j:7687",
    neo4j.auth.basic(process.env.NEO4J_USER || "neo4j", process.env.NEO4J_PASSWORD || "skillgraph-password")
  );

  const unis = await prisma.university.findMany();

  let globalRepoIdCounter = 10000000n;

  for (const uni of unis) {
    console.log(`Generating data for university: ${uni.name} (${uni.shortName})`);

    const depts = await prisma.department.findMany({
      where: { universityId: uni.id }
    });

    if (depts.length === 0) {
      console.warn(`No departments found for ${uni.name}, skipping user seeding.`);
      continue;
    }

    const isPrimary = ["DU", "BUET", "NSU", "BRACU", "IUB"].includes(uni.shortName);
    if (!isPrimary) {
      console.log(`- Performing light seeding for ${uni.shortName}...`);
      
      // 1. Seed 3 professors
      for (let p = 1; p <= 3; p++) {
        const first = firstNames[(p * 3) % firstNames.length];
        const last = lastNames[(p * 7) % lastNames.length];
        const fullName = `Prof. ${first} ${last}`;
        await prisma.user.create({
          data: {
            fullName,
            email: `prof.${uni.shortName.toLowerCase()}.${p}@skillgraph.edu`,
            role: "professor",
            passwordHash,
            emailVerifiedAt: new Date(),
            isActive: true,
            universityId: uni.id,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=prof_${uni.shortName.toLowerCase()}_${p}`
          }
        });
      }

      // 2. Seed 5 students
      for (let s = 1; s <= 5; s++) {
        const first = firstNames[(s * 4) % firstNames.length];
        const last = lastNames[(s * 9) % lastNames.length];
        const fullName = `${first} ${last}`;
        const publicHandle = `student_${uni.shortName.toLowerCase()}_${s}`;
        const studentIdNo = `${uni.shortName}-ST-2023-${s.toString().padStart(2, "0")}`;
        await prisma.user.create({
          data: {
            fullName,
            email: `student.${uni.shortName.toLowerCase()}.${s}@skillgraph.edu`,
            role: "student",
            passwordHash,
            emailVerifiedAt: new Date(),
            isActive: true,
            universityId: uni.id,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=student_${uni.shortName.toLowerCase()}_${s}`,
            studentProfile: {
              create: {
                studentIdNo,
                graduationYear: 2026 + (s % 3),
                bio: `CS Student at ${uni.name}.`,
                publicHandle,
                universityId: uni.id,
                departmentId: depts[s % depts.length].id,
                portfolioUrl: `https://${publicHandle}.github.io`,
                linkedinUrl: `https://linkedin.com/in/${publicHandle}`
              }
            }
          }
        });
      }

      // 3. Seed 5 alumni (verified/unverified)
      for (let a = 1; a <= 5; a++) {
        const first = firstNames[(a * 5) % firstNames.length];
        const last = lastNames[(a * 11) % lastNames.length];
        const fullName = `${first} ${last} (Alum)`;
        const email = `alumni.${uni.shortName.toLowerCase()}.${a}@skillgraph.edu`;
        const company = companies[(a * 3) % companies.length];
        const roleName = rolesList[(a * 2) % rolesList.length];
        const alumSkills = dbSkills.slice(a % 10, (a % 10) + 4).map(s => s.name);
        await prisma.user.create({
          data: {
            fullName,
            email,
            role: "alumni",
            passwordHash,
            emailVerifiedAt: new Date(),
            isActive: true,
            universityId: uni.id,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=alumni_${uni.shortName.toLowerCase()}_${a}`,
            alumniProfile: {
              create: {
                currentCompany: company,
                currentRole: roleName,
                yearsExperience: 2 + (a % 10),
                graduationYear: 2014 + (a % 10),
                mentoringSkills: alumSkills,
                willingToMentor: true,
                verified: a <= 3, // 3 verified, 2 unverified
                universityId: uni.id,
                alumniCardUrl: `https://skillgraph.com/cards/alumni_${uni.shortName.toLowerCase()}_${a}.png`
              }
            }
          }
        });
      }

      continue;
    }

    // 1. Seed 10 Professors for this University
    console.log(`- Seeding 10 professors for ${uni.shortName}...`);
    const createdProfessors = [];
    for (let p = 1; p <= 10; p++) {
      const first = firstNames[(p * 3) % firstNames.length];
      const last = lastNames[(p * 7) % lastNames.length];
      const fullName = `Prof. ${first} ${last}`;
      const email = `prof.${uni.shortName.toLowerCase()}.${p}@skillgraph.edu`;

      let profUser = await prisma.user.findUnique({ where: { email } });
      if (!profUser) {
        profUser = await prisma.user.create({
          data: {
            fullName,
            email,
            role: "professor",
            passwordHash,
            emailVerifiedAt: new Date(),
            isActive: true,
            universityId: uni.id,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=prof_${uni.shortName.toLowerCase()}_${p}`
          }
        });
      }
      createdProfessors.push(profUser);

      // System notification for professor
      await prisma.systemNotification.create({
        data: {
          userId: profUser.id,
          type: "INFO",
          payload: { message: `Welcome to SkillGraph, Professor ${fullName}!` },
          isRead: true
        }
      });

      // Audit log for professor
      await prisma.auditLog.create({
        data: {
          userId: profUser.id,
          action: "USER_LOGIN",
          entity: "User",
          entityId: profUser.id,
          metadata: { browser: "Chrome", OS: "Windows" },
          ipAddress: "192.168.1.10"
        }
      });
    }

    // 2. Seed 15 Alumni for this University
    console.log(`- Seeding 15 alumni for ${uni.shortName}...`);
    const createdAlumni = [];
    for (let a = 1; a <= 15; a++) {
      const first = firstNames[(a * 5) % firstNames.length];
      const last = lastNames[(a * 11) % lastNames.length];
      const fullName = `${first} ${last} (Alum)`;
      const email = `alumni.${uni.shortName.toLowerCase()}.${a}@skillgraph.edu`;

      let user = await prisma.user.findUnique({ where: { email }, include: { alumniProfile: true } });
      if (!user) {
        const company = companies[(a * 3) % companies.length];
        const roleName = rolesList[(a * 2) % rolesList.length];
        const alumSkills = dbSkills.slice(a % 10, (a % 10) + 4).map(s => s.name);

        user = await prisma.user.create({
          data: {
            fullName,
            email,
            role: "alumni",
            passwordHash,
            emailVerifiedAt: new Date(),
            isActive: true,
            universityId: uni.id,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=alumni_${uni.shortName.toLowerCase()}_${a}`,
            alumniProfile: {
              create: {
                currentCompany: company,
                currentRole: roleName,
                yearsExperience: 2 + (a % 10),
                graduationYear: 2014 + (a % 10),
                mentoringSkills: alumSkills,
                willingToMentor: true,
                verified: true,
                universityId: uni.id,
                alumniCardUrl: `https://skillgraph.com/cards/alumni_${uni.shortName.toLowerCase()}_${a}.png`
              }
            }
          },
          include: { alumniProfile: true }
        });
      }
      createdAlumni.push(user);

      // System notification for alumni
      await prisma.systemNotification.create({
        data: {
          userId: user.id,
          type: "INFO",
          payload: { message: `Welcome to SkillGraph, Alumni ${fullName}!` },
          isRead: true
        }
      });

      // Audit log for alumni
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "USER_LOGIN",
          entity: "User",
          entityId: user.id,
          metadata: { browser: "Chrome", OS: "Windows" },
          ipAddress: "192.168.1.11"
        }
      });
    }

    // 3. CareerFair & CareerFairBooth for this University
    console.log(`- Seeding Career Fair for ${uni.shortName}...`);
    const fair = await prisma.careerFair.create({
      data: {
        universityId: uni.id,
        name: `${uni.shortName} Career Fair 2026`,
        eventDate: new Date("2026-10-15"),
        location: `${uni.shortName} TSC Hall`
      }
    });

    await prisma.careerFairBooth.create({
      data: {
        fairId: fair.id,
        companyName: "Google",
        requiredSkills: ["React", "TypeScript", "Node.js"],
        hiringRoles: ["Software Engineer", "Frontend Developer"],
        boothNumber: "A1"
      }
    });

    await prisma.careerFairBooth.create({
      data: {
        fairId: fair.id,
        companyName: "Microsoft",
        requiredSkills: ["Python", "SQL"],
        hiringRoles: ["Software Engineer", "Backend Developer"],
        boothNumber: "A2"
      }
    });

    await prisma.careerFairBooth.create({
      data: {
        fairId: fair.id,
        companyName: "Brain Station 23",
        requiredSkills: ["JavaScript", "Docker"],
        hiringRoles: ["DevOps Engineer", "Full-stack Engineer"],
        boothNumber: "A3"
      }
    });

    // Associate approved university courses to this university
    const uniResources = dbResources.filter(r => r.isUniversityApproved && r.provider === uni.shortName);
    for (const res of uniResources) {
      await prisma.learningResource.update({
        where: { id: res.id },
        data: { universityId: uni.id }
      });
    }

    // 4. Seed 20 Students for this University
    console.log(`- Seeding 20 students for ${uni.shortName}...`);
    const createdStudents = [];

    for (let s = 1; s <= 20; s++) {
      const first = firstNames[(s * 4) % firstNames.length];
      const last = lastNames[(s * 9) % lastNames.length];
      const fullName = `${first} ${last}`;
      const email = `student.${uni.shortName.toLowerCase()}.${s}@skillgraph.edu`;
      const publicHandle = `student_${uni.shortName.toLowerCase()}_${s}`;
      const studentIdNo = `${uni.shortName}-ST-2023-${s.toString().padStart(2, "0")}`;

      let studentUser = await prisma.user.findUnique({ where: { email }, include: { studentProfile: true } });
      if (!studentUser) {
        studentUser = await prisma.user.create({
          data: {
            fullName,
            email,
            role: "student",
            passwordHash,
            emailVerifiedAt: new Date(),
            isActive: true,
            universityId: uni.id,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=student_${uni.shortName.toLowerCase()}_${s}`,
            studentProfile: {
              create: {
                studentIdNo,
                graduationYear: 2026 + (s % 3),
                bio: `CS Student at ${uni.name} specializing in software development.`,
                publicHandle,
                universityId: uni.id,
                departmentId: depts[s % depts.length].id,
                portfolioUrl: `https://${publicHandle}.github.io`,
                linkedinUrl: `https://linkedin.com/in/${publicHandle}`
              }
            }
          },
          include: { studentProfile: true }
        });
      }
      createdStudents.push(studentUser);

      if (studentUser && studentUser.studentProfile) {
        const studentProfileId = studentUser.studentProfile.id;

        // a. Create OAuth connection
        await prisma.oauthConnection.create({
          data: {
            userId: studentUser.id,
            provider: "github",
            accessTokenEnc: `mock_enc_token_${publicHandle}`,
            tokenScope: "read:user,repo",
            lastUsedAt: new Date()
          }
        });

        // b. Create GitHub Repository
        const githubRepoId = globalRepoIdCounter++;
        const repo = await prisma.githubRepository.create({
          data: {
            userId: studentUser.id,
            githubRepoId,
            repoName: `repo-${s}`,
            fullName: `${publicHandle}/repo-${s}`,
            description: "A project repository for tracking academic tasks.",
            language: s % 2 === 0 ? "TypeScript" : "Python",
            starsCount: s % 5,
            isFork: false,
            rawReadmeText: "# Academic Project\nThis is a sample project readme.",
            lastIngestedAt: new Date()
          }
        });

        // c. Create GithubCommits (2 commits per repo)
        const sha1 = crypto.createHash("sha1").update(`commit-1-${uni.shortName}-${s}`).digest("hex");
        await prisma.githubCommit.create({
          data: {
            repoId: repo.id,
            sha: sha1,
            message: "feat: setup repository infrastructure",
            committedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
          }
        });

        const sha2 = crypto.createHash("sha1").update(`commit-2-${uni.shortName}-${s}`).digest("hex");
        await prisma.githubCommit.create({
          data: {
            repoId: repo.id,
            sha: sha2,
            message: "docs: update project description",
            committedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
          }
        });

        // d. Create Academic Project
        const proj = await prisma.academicProject.create({
          data: {
            title: `Project-${uni.shortName}-${s}`,
            description: "Academic Project tracking software engineering skills.",
            ownerId: studentUser.id,
            repoId: repo.id,
            startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            endDate: null,
            isCapstone: s % 2 === 0
          }
        });

        // e. Create Project Collaborators
        await prisma.projectCollaborator.create({
          data: {
            projectId: proj.id,
            userId: studentUser.id,
            role: "Lead Developer",
            joinedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
          }
        });

        if (createdStudents.length > 1) {
          const colStudent = createdStudents[createdStudents.length - 2];
          await prisma.projectCollaborator.create({
            data: {
              projectId: proj.id,
              userId: colStudent.id,
              role: "Contributor",
              joinedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)
            }
          });

          // Establish Peer Endorsement
          const endSkill = dbSkills[s % dbSkills.length];
          await prisma.peerEndorsement.create({
            data: {
              endorserId: colStudent.id,
              endorsedId: studentUser.id,
              skillId: endSkill.id
            }
          });

          // Establish Team Match
          const tr = await prisma.teamRequest.create({
            data: {
              projectId: proj.id,
              requesterId: studentUser.id,
              requiredSkills: ["TypeScript", "React"]
            }
          });

          await prisma.teamMatch.create({
            data: {
              requestId: tr.id,
              matchedUser: colStudent.id,
              matchScore: 0.85
            }
          });

          // Create Project Invitation
          await prisma.projectInvitation.create({
            data: {
              projectId: proj.id,
              fromUserId: studentUser.id,
              toUserId: colStudent.id,
              status: "pending"
            }
          });
        }

        // f. Create Portfolio
        const portfolio = await prisma.portfolio.create({
          data: {
            studentId: studentProfileId,
            isPublic: true,
            viewCount: s * 15,
            lastViewed: new Date()
          }
        });

        // g. Create Student Resource Completions (3 resource completions)
        const completionsCount = Math.min(3, dbResources.length);
        for (let r = 0; r < completionsCount; r++) {
          const res = dbResources[(s + r) % dbResources.length];
          await prisma.studentResourceCompletion.create({
            data: {
              studentId: studentProfileId,
              resourceId: res.id,
              completedAt: new Date(Date.now() - (s + r) * 24 * 60 * 60 * 1000)
            }
          });
        }

        // h. Create Certification
        await prisma.certification.create({
          data: {
            studentId: studentProfileId,
            name: `Cert-${s}`,
            issuer: s % 2 === 0 ? "Google" : "Microsoft",
            issuedDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
            credentialUrl: `https://verify.org/cert/${s}`
          }
        });

        // i. Create Student Learning Path
        const pathRole = dbRoles[s % dbRoles.length];
        await prisma.studentLearningPath.create({
          data: {
            studentId: studentProfileId,
            roleId: pathRole.id,
            completionPct: 30.0 + (s * 3) % 60,
            missingSkillsJson: ["Docker", "CI/CD"],
            roadmapJson: { milestones: [{ name: "Learn Basic Docker" }, { name: "Implement CI/CD" }] },
            isActive: true,
            lastComputedAt: new Date()
          }
        });

        // j. Create Alumni Mentorship
        const mentor = createdAlumni[s % createdAlumni.length];
        if (mentor && mentor.alumniProfile) {
          const randomSkill = dbSkills[s % dbSkills.length];
          await prisma.alumniMentorship.create({
            data: {
              studentId: studentProfileId,
              alumniId: mentor.alumniProfile.id,
              skillId: randomSkill.id,
              status: s % 3 === 0 ? "active" : s % 3 === 1 ? "requested" : "completed",
              startedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              endedAt: s % 3 === 2 ? new Date() : null
            }
          });
        }

        // k. Create Resume Export
        const resumeRole = dbRoles[(s + 1) % dbRoles.length];
        await prisma.resumeExport.create({
          data: {
            studentId: studentProfileId,
            roleId: resumeRole.id,
            filePath: `/exports/student_${publicHandle}_resume.pdf`,
            atsScore: 65.0 + (s * 1.5) % 30
          }
        });

        // l. Create Skill Decay Audit
        const decaySkill = dbSkills[(s + 1) % dbSkills.length];
        await prisma.skillDecayAudit.create({
          data: {
            studentId: studentProfileId,
            skillName: decaySkill.name,
            currentWeight: 0.9,
            lastActiveDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            lastDecayedAt: null,
            isDormant: false,
            decayCycles: 0
          }
        });

        // m. Create Simulated Path
        const simRole = dbRoles[(s + 2) % dbRoles.length];
        await prisma.simulatedPath.create({
          data: {
            studentId: studentProfileId,
            scenarioName: `Scenario ${s}`,
            targetRoleId: simRole.id,
            hypotheticalSkills: ["Kubernetes"],
            simulatedResult: { successRate: 0.8 },
            completionDelta: 12.5,
            weeksSaved: 5
          }
        });

        // n. System notifications
        await prisma.systemNotification.create({
          data: {
            userId: studentUser.id,
            type: "COLLABORATION_INVITE",
            payload: { message: "You have a new project invitation." },
            isRead: false
          }
        });

        await prisma.systemNotification.create({
          data: {
            userId: studentUser.id,
            type: "ENDORSEMENT",
            payload: { message: "A peer endorsed you." },
            isRead: true
          }
        });

        // o. Audit logs
        await prisma.auditLog.create({
          data: {
            userId: studentUser.id,
            action: "USER_LOGIN",
            entity: "User",
            entityId: studentUser.id,
            metadata: { browser: "Chrome", OS: "Windows" },
            ipAddress: `192.168.1.${s}`
          }
        });

        await prisma.auditLog.create({
          data: {
            userId: studentUser.id,
            action: "PORTFOLIO_VIEW",
            entity: "Portfolio",
            entityId: portfolio.id,
            metadata: { source: "direct" },
            ipAddress: `192.168.1.${s + 1}`
          }
        });

        // p. Neo4j Sync
        const session = neo4jDriver.session();
        try {
          await session.executeWrite((tx) =>
            tx.run(
              `
              MERGE (st:Student {id: $studentId})
              SET st.name = $name,
                  st.university = $university,
                  st.universityId = $universityId,
                  st.updatedAt = timestamp()
              `,
              {
                studentId: studentUser.id,
                name: studentUser.fullName,
                university: uni.name,
                universityId: uni.id
              }
            )
          );

          const baseSkills = dbSkills.slice(s % 5, (s % 5) + 4);
          const dbOptions = dbSkills.filter((sk) =>
            ["PostgreSQL", "Neo4j", "Redis", "SQL", "MongoDB"].includes(sk.name)
          );
          const mlOptions = dbSkills.filter((sk) =>
            ["Python", "TensorFlow", "PyTorch", "Pandas", "NumPy", "scikit-learn"].includes(sk.name)
          );
          const devOpsOptions = dbSkills.filter((sk) =>
            ["Docker", "Kubernetes", "AWS", "Azure", "CI/CD", "Terraform", "Linux"].includes(sk.name)
          );
          const otherOptions = dbSkills.filter((sk) =>
            ["Swift", "Kotlin", "React Native", "Figma", "Playwright", "Jest", "Network Security", "Accessibility"].includes(sk.name)
          );

          const skillsKnown = [...baseSkills];
          if (dbOptions.length > 0) skillsKnown.push(dbOptions[s % dbOptions.length]);
          if (mlOptions.length > 0) skillsKnown.push(mlOptions[s % mlOptions.length]);
          if (devOpsOptions.length > 0) skillsKnown.push(devOpsOptions[s % devOpsOptions.length]);
          if (otherOptions.length > 0) skillsKnown.push(otherOptions[s % otherOptions.length]);

          for (const skill of skillsKnown) {
            await session.executeWrite((tx) =>
              tx.run(
                `
                MERGE (sk:Skill {name: $skillName})
                ON CREATE SET sk.category = 'Uncategorized'
                WITH sk
                MATCH (st:Student {id: $studentId})
                MERGE (st)-[r:KNOWS]->(sk)
                SET r.confidence = 0.7,
                    r.proficiency = 0.7,
                    r.endorsementCount = 1,
                    r.lastActive = timestamp(),
                    r.dormant = false,
                    r.sourceRepos = ["repo-main"]
                `,
                {
                  studentId: studentUser.id,
                  skillName: skill.name
                }
              )
            );
          }
        } catch (neoErr) {
          console.error(`- Failed to sync Neo4j for student ${studentUser.email}:`, neoErr);
        } finally {
          await session.close();
        }
      }
    }
  }
  // ==========================================
  // MASS SEED GENERATION FOR PERFORMANCE TESTING (2,500+ users)
  // ==========================================
  console.log("Seeding additional mass data for performance and scale testing...");

  // University Admins (1 per university)
  console.log("Seeding university admins...");
  const newUnivAdmins = [];
  for (const uni of unis) {
    newUnivAdmins.push({
      fullName: `${uni.shortName} Admin`,
      email: `admin.${uni.shortName.toLowerCase()}@skillgraph.com`,
      role: "admin" as const,
      passwordHash,
      emailVerifiedAt: new Date(),
      isActive: true,
      universityId: uni.id
    });
  }
  await prisma.user.createMany({ data: newUnivAdmins });

  // Super Admin / SRE / Engineer
  console.log("Seeding extra super admin...");
  await prisma.user.create({
    data: {
      fullName: "Super Admin (SRE)",
      email: "superadmin@skillgraph.com",
      role: "superadmin",
      passwordHash,
      emailVerifiedAt: new Date(),
      isActive: true
    }
  });

  for (const uni of unis) {
    const isPrimary = ["DU", "BUET", "NSU", "BRACU", "IUB"].includes(uni.shortName);
    if (!isPrimary) continue;

    const depts = await prisma.department.findMany({ where: { universityId: uni.id } });
    if (depts.length === 0) continue;

    console.log(`- Generating mass data for ${uni.shortName}...`);

    // A. Professors (100 per university)
    const newProfs = [];
    for (let i = 1; i <= 100; i++) {
      newProfs.push({
        fullName: `Prof. Extra_${uni.shortName}_${i}`,
        email: `prof.extra.${uni.shortName.toLowerCase()}.${i}@skillgraph.edu`,
        role: "professor" as const,
        passwordHash,
        emailVerifiedAt: new Date(),
        isActive: true,
        universityId: uni.id,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=prof_extra_${uni.shortName.toLowerCase()}_${i}`
      });
    }
    await prisma.user.createMany({ data: newProfs });

    // B. Students (250 per university)
    const newStudents = [];
    for (let i = 1; i <= 250; i++) {
      newStudents.push({
        fullName: `Student Extra_${uni.shortName}_${i}`,
        email: `student.extra.${uni.shortName.toLowerCase()}.${i}@skillgraph.edu`,
        role: "student" as const,
        passwordHash,
        emailVerifiedAt: new Date(),
        isActive: true,
        universityId: uni.id,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=student_extra_${uni.shortName.toLowerCase()}_${i}`,
        isVerified: true
      });
    }
    await prisma.user.createMany({ data: newStudents });
    const insertedStudents = await prisma.user.findMany({
      where: {
        email: { startsWith: `student.extra.${uni.shortName.toLowerCase()}.` }
      },
      select: { id: true, email: true }
    });

    const studentProfiles = insertedStudents.map((u, idx) => {
      const num = u.email ? (u.email.match(/\d+/)?.[0] || "1") : "1";
      return {
        userId: u.id,
        studentIdNo: `${uni.shortName}-ST-EXTRA-${num.padStart(3, "0")}`,
        graduationYear: 2026 + (idx % 3),
        bio: `CS Student at ${uni.name} specializing in software development.`,
        publicHandle: `student_extra_${uni.shortName.toLowerCase()}_${num}`,
        universityId: uni.id,
        departmentId: depts[idx % depts.length].id,
        portfolioUrl: `https://student-extra-${uni.shortName.toLowerCase()}-${num}.github.io`,
        linkedinUrl: `https://linkedin.com/in/student-extra-${uni.shortName.toLowerCase()}-${num}`
      };
    });
    await prisma.studentProfile.createMany({ data: studentProfiles });

    // C. Alumni (150 per university, unverified)
    const newAlumni = [];
    for (let i = 1; i <= 150; i++) {
      newAlumni.push({
        fullName: `Alumni Extra_${uni.shortName}_${i}`,
        email: `alumni.extra.${uni.shortName.toLowerCase()}.${i}@skillgraph.edu`,
        role: "alumni" as const,
        passwordHash,
        emailVerifiedAt: new Date(),
        isActive: true,
        universityId: uni.id,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=alumni_extra_${uni.shortName.toLowerCase()}_${i}`,
        isVerified: false
      });
    }
    await prisma.user.createMany({ data: newAlumni });
    const insertedAlumni = await prisma.user.findMany({
      where: {
        email: { startsWith: `alumni.extra.${uni.shortName.toLowerCase()}.` }
      },
      select: { id: true, email: true, fullName: true }
    });

    const alumniProfiles = insertedAlumni.map((u, idx) => {
      const num = u.email ? (u.email.match(/\d+/)?.[0] || "1") : "1";
      const company = companies[idx % companies.length];
      const roleName = rolesList[idx % rolesList.length];
      const alumSkills = dbSkills.slice(idx % 10, (idx % 10) + 4).map(s => s.name);
      return {
        userId: u.id,
        currentCompany: company,
        currentRole: roleName,
        yearsExperience: 2 + (idx % 10),
        graduationYear: 2014 + (idx % 10),
        mentoringSkills: alumSkills,
        willingToMentor: true,
        verified: false,
        universityId: uni.id,
        alumniCardUrl: `https://skillgraph.com/cards/alumni_extra_${uni.shortName.toLowerCase()}_${num}.png`
      };
    await prisma.alumniProfile.createMany({ data: alumniProfiles });
  }

  // Sync static students to Neo4j to prevent onboarding redirect
  console.log("Syncing static students to Neo4j...");
  const staticStudents = [
    {
      name: "Rahim Islam",
      uniKey: "DU",
      skills: ["React", "Node.js", "PostgreSQL", "TypeScript", "Docker", "Git"]
    },
    {
      name: "Karim Rahman",
      uniKey: "BUET",
      skills: ["Python", "TensorFlow", "Pandas", "scikit-learn", "Git"]
    },
    {
      name: "Nabila Zaman",
      uniKey: "NSU",
      skills: ["HTML", "CSS", "TypeScript", "React", "Figma", "Git"]
    },
    {
      name: "Fahim Ahmed",
      uniKey: "BRACU",
      skills: ["Python", "Git", "C++", "Java"]
    }
  ];

  for (const item of staticStudents) {
    const user = studentMap[item.name];
    if (user) {
      const uni = universityMap[item.uniKey];
      const session = neo4jDriver.session();
      try {
        await session.executeWrite((tx) =>
          tx.run(
            `
            MERGE (st:Student {id: $studentId})
            SET st.name = $name,
                st.university = $university,
                st.universityId = $universityId,
                st.updatedAt = timestamp()
            `,
            {
              studentId: user.id,
              name: user.fullName,
              university: uni?.name ?? "Unknown University",
              universityId: uni?.id ?? ""
            }
          )
        );

        for (const skillName of item.skills) {
          await session.executeWrite((tx) =>
            tx.run(
              `
              MERGE (sk:Skill {name: $skillName})
              ON CREATE SET sk.category = 'Uncategorized'
              WITH sk
              MATCH (st:Student {id: $studentId})
              MERGE (st)-[r:KNOWS]->(sk)
              SET r.confidence = 0.8,
                  r.proficiency = 0.8,
                  r.endorsementCount = 1,
                  r.lastActive = timestamp(),
                  r.dormant = false,
                  r.sourceRepos = ["repo-main"]
              `,
              {
                studentId: user.id,
                skillName
              }
            )
          );
        }
      } catch (err) {
        console.error(`Failed to sync static student ${item.name} to Neo4j:`, err);
      } finally {
        await session.close();
      }
    }
  }

  await neo4jDriver.close();
  console.log("Seeding completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
