import type { ResumeData, JobListingRecommendation } from '../types/resume';

export interface EarlyJobPortalLink {
  platform: string;
  url: string;
  badge: string;
  description: string;
  iconName: string;
}

export function generateEarlyJobSearchLinks(resume: ResumeData): EarlyJobPortalLink[] {
  const title = encodeURIComponent(resume.personalInfo.jobTitle || 'Software Engineer');
  const location = encodeURIComponent(resume.personalInfo.location?.split(',')[0]?.trim() || 'Remote');
  const topSkills = resume.skills
    .flatMap((s) => s.skills)
    .slice(0, 3)
    .join(' ');
  const skillQuery = encodeURIComponent(topSkills);

  return [
    {
      platform: 'LinkedIn Jobs (Past 24h)',
      // f_TPR=r86400 filters for jobs posted in the last 24 hours!
      url: `https://www.linkedin.com/jobs/search/?keywords=${title}&location=${location}&f_TPR=r86400&sortBy=DD`,
      badge: 'Earliest 24h Postings',
      description: 'Filter for roles posted within the last 24 hours to be among the first 10 applicants.',
      iconName: 'Linkedin',
    },
    {
      platform: 'Indeed (Last 3 Days)',
      // fromage=3 filters for last 3 days, sort by date
      url: `https://www.indeed.com/jobs?q=${title}+${skillQuery}&l=${location}&fromage=3&sort=date`,
      badge: 'Fresh Openings',
      description: 'Directly sorted by earliest posting date across enterprise and mid-market employers.',
      iconName: 'Briefcase',
    },
    {
      platform: 'Google Jobs Radar',
      url: `https://www.google.com/search?ibp=htl;jobs&q=${title}+jobs+in+${location}+posted+today`,
      badge: 'Live Aggregator',
      description: 'Aggregates newly indexed openings from company career sites and ATS boards.',
      iconName: 'Search',
    },
    {
      platform: 'Wellfound (AngelList)',
      url: `https://wellfound.com/jobs?role=${title}&remote=true`,
      badge: 'Startup & AI Roles',
      description: 'Direct access to founding engineer and high-growth venture-backed tech startups.',
      iconName: 'Rocket',
    },
  ];
}

export function generateTargetedJobListings(resume: ResumeData): JobListingRecommendation[] {
  const title = resume.personalInfo.jobTitle || 'Software Engineer';
  const location = resume.personalInfo.location || 'Remote / Hybrid';
  const allSkills = resume.skills.flatMap((s) => s.skills);

  const isAI = /ai|machine learning|ml|data|vision|nlp/i.test(title) || allSkills.some((s) => /pytorch|llm|gemini|rag/i.test(s));
  const isFullStack = /full stack|frontend|react|node|web/i.test(title) || allSkills.some((s) => /react|typescript|node/i.test(s));

  if (isAI) {
    return [
      {
        id: 'job-ai-1',
        title: 'Senior Applied AI / LLM Systems Engineer',
        company: 'ScaleOps AI Labs',
        location: 'San Francisco, CA (or Remote)',
        matchScore: 96,
        tags: ['Gemini / LLMs', 'PyTorch', 'vLLM', 'RAG Pipelines'],
        directSearchUrl: `https://www.linkedin.com/jobs/search/?keywords=Applied+AI+Engineer&f_TPR=r86400`,
        platform: 'LinkedIn',
        postedTiming: 'Posted 2 hours ago • Early Applicant Badge',
        salaryEstimate: '$175,000 - $225,000 + Equity',
      },
      {
        id: 'job-ai-2',
        title: 'Machine Learning Infrastructure Engineer',
        company: 'TensorScale Cloud',
        location: location.includes('Remote') ? 'Remote' : 'Austin, TX / Hybrid',
        matchScore: 92,
        tags: ['Kubernetes', 'Triton', 'MLOps', 'CUDA'],
        directSearchUrl: `https://www.indeed.com/jobs?q=MLOps+Engineer&sort=date`,
        platform: 'Indeed',
        postedTiming: 'Posted 5 hours ago',
        salaryEstimate: '$160,000 - $210,000',
      },
      {
        id: 'job-ai-3',
        title: 'Founding GenAI Engineer (Agentic Workflows)',
        company: 'Synthetix Studio (YC W25)',
        location: 'Remote (Global)',
        matchScore: 89,
        tags: ['Agentic AI', 'FastAPI', 'Vector Search', 'TypeScript'],
        directSearchUrl: `https://wellfound.com/jobs?role=Machine+Learning+Engineer`,
        platform: 'Wellfound',
        postedTiming: 'Posted 8 hours ago • Fast Response Time',
        salaryEstimate: '$150,000 - $200,000 • 1.0% - 2.5% Equity',
      },
      {
        id: 'job-ai-4',
        title: 'AI Solutions Architect',
        company: 'Apex Enterprise AI',
        location: 'New York, NY / Remote',
        matchScore: 86,
        tags: ['Enterprise Architecture', 'Cloud ML', 'Client Strategy'],
        directSearchUrl: `https://www.google.com/search?ibp=htl;jobs&q=AI+Solutions+Architect`,
        platform: 'Google Jobs',
        postedTiming: 'Posted 14 hours ago',
        salaryEstimate: '$180,000 - $230,000',
      },
    ];
  }

  if (isFullStack) {
    return [
      {
        id: 'job-fs-1',
        title: 'Staff / Senior Full Stack Engineer (React + Node)',
        company: 'PrismFlow Cloud',
        location: 'Remote (US/Canada)',
        matchScore: 95,
        tags: ['React 19', 'TypeScript', 'PostgreSQL', 'High Scale'],
        directSearchUrl: `https://www.linkedin.com/jobs/search/?keywords=Senior+Full+Stack+Engineer&f_TPR=r86400`,
        platform: 'LinkedIn',
        postedTiming: 'Posted 1 hour ago • Under 10 applicants',
        salaryEstimate: '$165,000 - $215,000 + Equity',
      },
      {
        id: 'job-fs-2',
        title: 'Full Stack Product Engineer',
        company: 'HyperSync Software',
        location: location.includes('Remote') ? 'Remote' : 'New York, NY',
        matchScore: 91,
        tags: ['React', 'Next.js', 'Tailwind', 'GraphQL'],
        directSearchUrl: `https://www.indeed.com/jobs?q=Full+Stack+Developer&sort=date`,
        platform: 'Indeed',
        postedTiming: 'Posted 4 hours ago',
        salaryEstimate: '$140,000 - $185,000',
      },
      {
        id: 'job-fs-3',
        title: 'Lead Frontend / UI Platform Architect',
        company: 'NextGen Financial',
        location: 'San Francisco, CA / Remote',
        matchScore: 88,
        tags: ['Design Systems', 'Microfrontends', 'Web Performance'],
        directSearchUrl: `https://wellfound.com/jobs?role=Frontend+Engineer`,
        platform: 'Wellfound',
        postedTiming: 'Posted 6 hours ago',
        salaryEstimate: '$170,000 - $210,000',
      },
    ];
  }

  // General Software Engineering
  return [
    {
      id: 'job-gen-1',
      title: 'Software Development Engineer II (Backend / Distributed)',
      company: 'OmniCloud Platforms',
      location: 'Seattle, WA / Hybrid or Remote',
      matchScore: 93,
      tags: ['System Design', 'Python/Go', 'Cloud Microservices'],
      directSearchUrl: `https://www.linkedin.com/jobs/search/?keywords=Software+Engineer&f_TPR=r86400`,
      platform: 'LinkedIn',
      postedTiming: 'Posted 3 hours ago • Be an early applicant',
      salaryEstimate: '$150,000 - $195,000',
    },
    {
      id: 'job-gen-2',
      title: 'Full Stack Software Engineer (Product Delivery)',
      company: 'Zenith Labs',
      location: 'Remote',
      matchScore: 89,
      tags: ['TypeScript', 'Modern Web', 'REST APIs', 'SQL'],
      directSearchUrl: `https://www.indeed.com/jobs?q=Software+Engineer&sort=date`,
      platform: 'Indeed',
      postedTiming: 'Posted 5 hours ago',
      salaryEstimate: '$130,000 - $170,000',
    },
  ];
}
