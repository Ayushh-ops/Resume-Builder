import type { ResumeData } from '../types/resume';

export const sampleProfiles: Record<string, ResumeData> = {
  aiEngineer: {
    personalInfo: {
      fullName: 'Aarav Sharma',
      jobTitle: 'Senior Machine Learning & Applied AI Engineer',
      email: 'aarav.sharma@example.com',
      phone: '+1 (555) 234-5678',
      location: 'San Francisco, CA (Open to Remote)',
      website: 'https://aaravsharma.dev',
      linkedin: 'https://linkedin.com/in/aarav-sharma-ai',
      github: 'https://github.com/aarav-sharma',
    },
    summary:
      'High-impact Applied AI Engineer with 5+ years of experience designing and deploying scalable LLM architectures, RAG pipelines, and high-throughput computer vision models into production. Proven track record reducing inference latency by 45% while decreasing cloud serving costs by $120K annually.',
    experience: [
      {
        id: 'exp-1',
        company: 'NeuralFlow AI',
        position: 'Lead Applied AI Engineer',
        location: 'San Francisco, CA',
        startDate: '2023-01',
        endDate: 'Present',
        current: true,
        highlights: [
          'Architected an enterprise multimodal RAG system indexing 10M+ documents using Gemini 3.8 and Qdrant, achieving sub-200ms latency and 94% retrieval accuracy.',
          'Spearheaded model quantization (FP8 & AWQ) and speculative decoding pipelines, reducing inference serving costs by 42% on Kubernetes GPU clusters.',
          'Led a team of 6 engineers implementing automated prompt evaluation benchmarks (evals) that decreased hallucination rates by 38% across client-facing agents.',
          'Designed agentic workflows with tool-calling capabilities handling 2.5M daily queries with 99.95% uptime.'
        ],
      },
      {
        id: 'exp-2',
        company: 'CognitiveScale Systems',
        position: 'Machine Learning Engineer',
        location: 'Austin, TX',
        startDate: '2021-04',
        endDate: '2022-12',
        current: false,
        highlights: [
          'Built end-to-end continuous learning pipelines using PyTorch, MLflow, and Apache Spark processing 4TB of daily telemetry data.',
          'Fine-tuned transformer architectures for domain-specific NLP tasks, improving F1 score from 0.81 to 0.93 over existing commercial baselines.',
          'Collaborated with product teams to embed real-time recommendations, boosting active user session duration by 28%.'
        ],
      },
    ],
    education: [
      {
        id: 'edu-1',
        institution: 'University of California, Berkeley',
        degree: 'Master of Science',
        fieldOfStudy: 'Computer Science (AI & Robotics)',
        location: 'Berkeley, CA',
        startDate: '2019-08',
        endDate: '2021-05',
        grade: '3.92 GPA',
        highlights: [
          'Published research on self-supervised representation learning at NeurIPS workshop.',
          'Graduate Teaching Assistant for CS189: Introduction to Machine Learning.'
        ],
      },
      {
        id: 'edu-2',
        institution: 'National Institute of Technology',
        degree: 'Bachelor of Technology',
        fieldOfStudy: 'Computer Science & Engineering',
        location: 'Calicut, India',
        startDate: '2015-08',
        endDate: '2019-05',
        grade: 'First Class with Distinction',
        highlights: ['Gold Medalist in Computer Science Capstone Project.'],
      },
    ],
    projects: [
      {
        id: 'proj-1',
        name: 'OmniAgent Studio',
        description: 'Open-source autonomous multi-agent framework powered by Gemini 3.8 & LangGraph with integrated code execution and browser tool sandbox.',
        technologies: ['Python', 'Gemini SDK', 'FastAPI', 'Docker', 'React', 'TailwindCSS'],
        link: 'https://omniagent.demo.ai',
        githubLink: 'https://github.com/aarav-sharma/omniagent',
        highlights: [
          'Gained 2,400+ GitHub stars within 3 months and adopted by 15+ startups.',
          'Implemented streaming SSE responses with token-level reasoning telemetry.'
        ],
      },
      {
        id: 'proj-2',
        name: 'DeepVision Edge Guard',
        description: 'Edge computer vision pipeline running real-time object detection and safety anomaly alerts on TensorRT embedded hardware.',
        technologies: ['C++', 'TensorRT', 'YOLOv10', 'ONNX', 'CUDA'],
        link: 'https://github.com/aarav-sharma/deepvision-edge',
        githubLink: 'https://github.com/aarav-sharma/deepvision-edge',
        highlights: [
          'Optimized INT8 calibration to achieve 60 FPS on Jetson Orin Nano with under 15W power consumption.'
        ],
      },
    ],
    skills: [
      {
        id: 'sk-1',
        name: 'AI & Machine Learning',
        skills: ['PyTorch', 'TensorFlow', 'Gemini API', 'LangChain', 'vLLM', 'Transformers', 'Hugging Face', 'Vector DBs (Qdrant/Pinecone)', 'RLHF/DPO', 'Fine-Tuning'],
      },
      {
        id: 'sk-2',
        name: 'Programming & Cloud',
        skills: ['Python', 'TypeScript', 'C++', 'SQL', 'Docker', 'Kubernetes', 'AWS (SageMaker/EC2)', 'GCP Vertex AI', 'FastAPI', 'Git'],
      },
      {
        id: 'sk-3',
        name: 'MLOps & Systems',
        skills: ['MLflow', 'Triton Inference Server', 'Ray', 'CUDA', 'CI/CD for ML', 'Model Evaluation & Evals'],
      },
    ],
    certifications: [
      {
        id: 'cert-1',
        name: 'Google Cloud Professional Machine Learning Engineer',
        issuer: 'Google Cloud',
        date: '2023-11',
        credentialId: 'GCP-ML-849201',
      },
      {
        id: 'cert-2',
        name: 'Deep Learning Specialization',
        issuer: 'DeepLearning.AI / Coursera',
        date: '2021-08',
      },
    ],
    customSections: [],
  },

  fullStack: {
    personalInfo: {
      fullName: 'Maya Patel',
      jobTitle: 'Senior Full Stack Software Engineer',
      email: 'maya.patel@techmail.io',
      phone: '+1 (555) 456-7890',
      location: 'New York, NY',
      website: 'https://mayapatel.dev',
      linkedin: 'https://linkedin.com/in/mayapatel-dev',
      github: 'https://github.com/mayapatel',
    },
    summary:
      'Product-minded Senior Full Stack Engineer with 6+ years building fault-tolerant cloud platforms, real-time collaboration engines, and performant web apps in React, Node.js, and TypeScript. Passionate about system design, web performance optimization, and developer productivity.',
    experience: [
      {
        id: 'exp-1',
        company: 'StackCloud Technologies',
        position: 'Senior Full Stack Engineer',
        location: 'New York, NY',
        startDate: '2022-03',
        endDate: 'Present',
        current: true,
        highlights: [
          'Engineered a micro-frontend architecture using React 19, Vite, and GraphQL serving 1.8M monthly active users with 99.99% availability.',
          'Reduced 95th-percentile page load times from 2.8s to 0.75s by implementing edge caching, dynamic asset chunking, and modern CSS container queries.',
          'Built collaborative real-time document editing using WebSockets and CRDTs (Yjs), supporting up to 50 concurrent editors with zero conflict latency.',
          'Mentored 8 junior and mid-level developers, establishing automated linting, test coverage thresholds, and trunk-based deployment practices.'
        ],
      },
      {
        id: 'exp-2',
        company: 'Vanguard Media Labs',
        position: 'Full Stack Developer',
        location: 'Boston, MA',
        startDate: '2019-06',
        endDate: '2022-02',
        current: false,
        highlights: [
          'Developed payment workflows integrating Stripe Connect and webhooks, processing $14M in annual transaction volume with zero compliance issues.',
          'Migrated legacy monolithic backend to containerized Node.js/PostgreSQL microservices on AWS ECS, reducing infrastructure spend by 30%.',
          'Authored high-coverage Jest and Cypress test suites increasing code coverage from 45% to 88%.'
        ],
      },
    ],
    education: [
      {
        id: 'edu-1',
        institution: 'Cornell University',
        degree: 'Bachelor of Science',
        fieldOfStudy: 'Computer Science',
        location: 'Ithaca, NY',
        startDate: '2015-08',
        endDate: '2019-05',
        grade: '3.85 GPA',
        highlights: ['Dean’s List all semesters', 'President of Women in Computing (WIC).'],
      },
    ],
    projects: [
      {
        id: 'proj-1',
        name: 'TaskFlow Pro',
        description: 'Modern real-time team workflow management platform with offline-first PWA sync, drag-and-drop boards, and analytics dashboards.',
        technologies: ['React', 'TypeScript', 'TailwindCSS', 'Node.js', 'PostgreSQL', 'Redis'],
        link: 'https://taskflow.io',
        githubLink: 'https://github.com/mayapatel/taskflow',
        highlights: [
          'Over 10,000 registered users with 4.8/5 user satisfaction score.',
          'Zero-downtime database migration strategy implemented using Prisma and Docker.'
        ],
      },
    ],
    skills: [
      {
        id: 'sk-1',
        name: 'Frontend',
        skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Redux Toolkit', 'HTML5/Modern CSS', 'WebSockets', 'Vite'],
      },
      {
        id: 'sk-2',
        name: 'Backend & Database',
        skills: ['Node.js', 'Express', 'Python', 'PostgreSQL', 'Redis', 'GraphQL', 'Prisma ORM', 'RESTful APIs'],
      },
      {
        id: 'sk-3',
        name: 'DevOps & Tooling',
        skills: ['AWS (S3, ECS, Lambda)', 'Docker', 'CI/CD (GitHub Actions)', 'Jest', 'Cypress', 'Git'],
      },
    ],
    certifications: [
      {
        id: 'cert-1',
        name: 'AWS Certified Solutions Architect – Associate',
        issuer: 'Amazon Web Services',
        date: '2023-04',
      },
    ],
    customSections: [],
  },

  fresherStudent: {
    personalInfo: {
      fullName: 'Rohan Gupta',
      jobTitle: 'Aspiring Software Engineer & Computer Science Graduate',
      email: 'rohan.gupta.cs@gmail.com',
      phone: '+1 (555) 345-6789',
      location: 'Seattle, WA',
      website: 'https://rohangcs.dev',
      linkedin: 'https://linkedin.com/in/rohan-gupta-dev',
      github: 'https://github.com/rohan-gupta-cs',
    },
    summary:
      'Proactive and solution-driven Computer Science graduate with strong foundational expertise in data structures, algorithms, cloud computing, and modern full-stack web development. Experienced in building full-stack applications with React, TypeScript, Python, and SQL through hands-on hackathons and internships.',
    experience: [
      {
        id: 'exp-1',
        company: 'Apex CodeWorks',
        position: 'Software Engineering Intern',
        location: 'Seattle, WA',
        startDate: '2024-05',
        endDate: '2024-08',
        current: false,
        highlights: [
          'Developed and shipped 4 reusable UI components in React and Tailwind CSS, adopted across 3 customer-facing web portals.',
          'Optimized SQL queries in PostgreSQL reducing API endpoint response times by 32%.',
          'Wrote automated unit tests in Jest achieving 90%+ branch coverage for core authentication services.'
        ],
      },
    ],
    education: [
      {
        id: 'edu-1',
        institution: 'University of Washington',
        degree: 'Bachelor of Science',
        fieldOfStudy: 'Computer Science',
        location: 'Seattle, WA',
        startDate: '2021-09',
        endDate: '2025-06',
        grade: '3.82 GPA',
        highlights: [
          'Relevant Coursework: Data Structures & Algorithms, Distributed Systems, Database Management, Web Development, Machine Learning.',
          '1st Place Winner at HackUW 2024 (Team of 4, 120 participating teams).'
        ],
      },
    ],
    projects: [
      {
        id: 'proj-1',
        name: 'CampusConnect Portal',
        description: 'Full-stack campus marketplace and peer tutoring match platform connecting over 1,500 active students.',
        technologies: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'TailwindCSS'],
        link: 'https://campusconnect.uw.edu',
        githubLink: 'https://github.com/rohan-gupta-cs/campusconnect',
        highlights: [
          'Integrated secure OAuth2 university authentication and Stripe for peer tutoring payments.',
          'Built responsive mobile-first UI with accessible keyboard navigation adhering to WCAG 2.1 AA standards.'
        ],
      },
      {
        id: 'proj-2',
        name: 'SmartExpense AI Tracker',
        description: 'Automated receipt scanner and personal budget forecaster using Python, OpenCV, and Gemini AI API.',
        technologies: ['Python', 'FastAPI', 'Gemini API', 'SQLite', 'React'],
        link: 'https://smartexpense.ai',
        githubLink: 'https://github.com/rohan-gupta-cs/smartexpense',
        highlights: [
          'Achieved 97% extraction accuracy on unstructured paper receipts.',
          'Categorizes expenses into monthly visual budget breakdowns with exportable CSV summaries.'
        ],
      },
    ],
    skills: [
      {
        id: 'sk-1',
        name: 'Languages',
        skills: ['Python', 'TypeScript', 'JavaScript', 'Java', 'C++', 'SQL', 'HTML5/CSS3'],
      },
      {
        id: 'sk-2',
        name: 'Frameworks & Tools',
        skills: ['React', 'Node.js', 'Express', 'Tailwind CSS', 'Git/GitHub', 'Docker', 'PostgreSQL', 'REST APIs'],
      },
      {
        id: 'sk-3',
        name: 'Core Concepts',
        skills: ['Object-Oriented Programming (OOP)', 'Data Structures & Algorithms', 'Agile/Scrum', 'System Design Basics'],
      },
    ],
    certifications: [
      {
        id: 'cert-1',
        name: 'Meta Front-End Developer Professional Certificate',
        issuer: 'Meta / Coursera',
        date: '2024-03',
      },
    ],
    customSections: [],
  },
};
