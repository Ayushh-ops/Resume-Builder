import type { ResumeData } from '../types/resume';

export interface GuidanceItem {
  id: string;
  status: 'ok' | 'fix';
  title: string;
  found: string; // What we detected in THIS resume, with concrete counts
  why: string; // 1 concise line
  fix: string; // 1 concrete actionable line
  before?: string; // User's real bullet
  after?: string; // Rewritten with rule template
  section: 'personal' | 'summary' | 'experience' | 'skills' | 'projects' | 'education' | 'certifications';
  bulletRef?: string; // e.g. exact element id to focus
  presentSkills?: string[];
  missingSkills?: string[];
}

export const ROLE_SKILLS_MAP: Record<string, string[]> = {
  'frontend': ['React', 'TypeScript', 'JavaScript', 'Tailwind CSS', 'HTML5', 'Next.js', 'State Management', 'Jest'],
  'backend': ['Node.js', 'Python', 'Go', 'PostgreSQL', 'RESTful APIs', 'Docker', 'Microservices', 'Redis'],
  'fullstack': ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'REST APIs', 'Git', 'CI/CD'],
  'ai': ['Python', 'PyTorch', 'LLMs', 'Prompt Engineering', 'RAG', 'LangChain', 'Hugging Face', 'Data Pipelines'],
  'machine learning': ['Python', 'Scikit-Learn', 'TensorFlow', 'PyTorch', 'Pandas', 'Model Evaluation', 'SQL', 'Feature Engineering'],
  'data scientist': ['Python', 'SQL', 'Pandas', 'Statistical Modeling', 'Machine Learning', 'Data Visualization', 'A/B Testing'],
  'data engineer': ['SQL', 'Python', 'Apache Spark', 'ETL Pipelines', 'PostgreSQL', 'Airflow', 'Kafka', 'Data Warehousing'],
  'devops': ['Docker', 'Kubernetes', 'CI/CD Pipelines', 'AWS', 'Terraform', 'Linux', 'Prometheus', 'Bash'],
  'cloud': ['AWS', 'GCP', 'Docker', 'Terraform', 'Kubernetes', 'Cloud Security', 'Serverless', 'Linux'],
  'product manager': ['Product Strategy', 'Roadmapping', 'Agile/Scrum', 'User Research', 'Data Analytics', 'A/B Testing', 'Stakeholder Management'],
  'mobile': ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Mobile UI/UX', 'REST APIs', 'App Store Deployment'],
  'software engineer': ['TypeScript', 'Python', 'Data Structures', 'System Design', 'Git', 'RESTful APIs', 'Docker', 'Unit Testing'],
};

export const SKILL_SYNONYMS: Record<string, string[]> = {
  'rest apis': ['rest', 'restful apis', 'restful api', 'rest api', 'rest apis'],
  'restful apis': ['rest', 'rest apis', 'restful api', 'rest api'],
  'rest': ['rest apis', 'restful apis', 'restful api', 'rest api'],
  'unit testing': ['jest', 'mocha', 'testing', 'unit tests', 'vitest', 'cypress'],
  'testing': ['unit testing', 'jest', 'mocha', 'testing', 'vitest'],
  'js': ['javascript', 'es6', 'es6+', 'ecmascript'],
  'javascript': ['js', 'es6', 'es6+', 'ecmascript'],
  'node': ['node.js', 'nodejs'],
  'node.js': ['node', 'nodejs'],
  'postgres': ['postgresql', 'psql'],
  'postgresql': ['postgres', 'psql'],
  'react': ['react.js', 'reactjs'],
  'react.js': ['react', 'reactjs'],
  'ts': ['typescript'],
  'typescript': ['ts'],
  'k8s': ['kubernetes'],
  'kubernetes': ['k8s'],
  'docker': ['containerization', 'containers'],
  'ci/cd': ['continuous integration', 'github actions', 'jenkins', 'gitlab ci'],
  'aws': ['amazon web services', 'cloud'],
  'gcp': ['google cloud platform', 'google cloud'],
  'mongo': ['mongodb'],
  'mongodb': ['mongo', 'mongoose'],
  'ml': ['machine learning'],
  'machine learning': ['ml'],
  'ai': ['artificial intelligence', 'gen ai', 'generative ai'],
};

export function matchesSkillOrSynonym(targetSkill: string, userSkill: string): boolean {
  const normTarget = targetSkill.toLowerCase().trim().replace(/[-_.]/g, ' ');
  const normUser = userSkill.toLowerCase().trim().replace(/[-_.]/g, ' ');

  if (normTarget === normUser || normTarget.includes(normUser) || normUser.includes(normTarget)) {
    return true;
  }

  // Check synonym groups
  for (const [canonical, syns] of Object.entries(SKILL_SYNONYMS)) {
    const group = [canonical, ...syns].map((s) => s.toLowerCase().replace(/[-_.]/g, ' '));
    const targetInGroup = group.some((s) => s === normTarget || normTarget.includes(s) || s.includes(normTarget));
    const userInGroup = group.some((s) => s === normUser || normUser.includes(s) || s.includes(normUser));
    if (targetInGroup && userInGroup) {
      return true;
    }
  }

  return false;
}

export const WEAK_OPENERS = [
  { pattern: /^responsible for\s+/i, verb: 'Engineered', name: 'responsible for' },
  { pattern: /^worked on\s+/i, verb: 'Architected', name: 'worked on' },
  { pattern: /^helped (?:with|to)?\s+/i, verb: 'Accelerated', name: 'helped' },
  { pattern: /^did\s+/i, verb: 'Executed', name: 'did' },
  { pattern: /^involved in\s+/i, verb: 'Led', name: 'involved in' },
  { pattern: /^assisted (?:in|with)?\s+/i, verb: 'Orchestrated', name: 'assisted' },
  { pattern: /^handled\s+/i, verb: 'Spearheaded', name: 'handled' },
  { pattern: /^tasked with\s+/i, verb: 'Delivered', name: 'tasked with' },
  { pattern: /^participated in\s+/i, verb: 'Collaborated to build', name: 'participated in' },
];

export function hasMetric(text: string): boolean {
  return /(?:\d|%|\$)/.test(text || '');
}

export function startsWeak(text: string): boolean {
  const clean = (text || '').replace(/^[•·⁃◦*-]\s*/, '').trim();
  if (!clean) return false;
  return WEAK_OPENERS.some((wo) => wo.pattern.test(clean));
}

export function wordCount(text: string): number {
  const clean = (text || '').trim();
  if (!clean) return 0;
  return clean.split(/\s+/).filter(Boolean).length;
}

export function buildSuggestedShape(text: string): string {
  const clean = (text || '').replace(/^[•·⁃◦*-]\s*/, '').replace(/[.]+$/, '').trim();
  if (!clean) return '';

  let verb = '';
  let body = clean;

  const matchedWo = WEAK_OPENERS.find((wo) => wo.pattern.test(clean));
  if (matchedWo) {
    verb = matchedWo.verb;
    body = clean.replace(matchedWo.pattern, '').trim();
  } else {
    const firstWordMatch = clean.match(/^([A-Za-z]+)\b/);
    if (firstWordMatch) {
      verb = firstWordMatch[1];
      body = clean.slice(verb.length).trim();
    } else {
      verb = '[Strong verb]';
    }
  }

  if (verb && !verb.startsWith('[')) {
    verb = verb.charAt(0).toUpperCase() + verb.slice(1);
  }

  if (hasMetric(clean)) {
    return `${verb} ${body}`.trim();
  }
  return `${verb} ${body}, improving [metric] by [X%]`.trim();
}

export function getCoreSkillsForRole(title: string): string[] {
  const lower = (title || '').toLowerCase().trim();
  if (!lower) {
    return ['TypeScript', 'Python', 'Git', 'RESTful APIs', 'System Design', 'Testing'];
  }
  for (const [key, skills] of Object.entries(ROLE_SKILLS_MAP)) {
    if (lower.includes(key)) {
      return skills;
    }
  }
  if (lower.includes('engineer') || lower.includes('developer') || lower.includes('architect')) {
    return ROLE_SKILLS_MAP['software engineer'];
  }
  return ['TypeScript', 'Python', 'System Design', 'Git', 'RESTful APIs', 'Problem Solving'];
}

export function getResumeGuidance(resumeData: ResumeData): GuidanceItem[] {
  const items: GuidanceItem[] = [];

  // Collect all experience highlights
  const allBullets: { expIndex: number; bulletIndex: number; text: string; id: string }[] = [];
  (resumeData.experience || []).forEach((exp, expIndex) => {
    (exp.highlights || []).forEach((bullet, bulletIndex) => {
      if (bullet && bullet.trim().length > 0) {
        allBullets.push({
          expIndex,
          bulletIndex,
          text: bullet.trim(),
          id: `exp-${expIndex}-bullet-${bulletIndex}`,
        });
      }
    });
  });

  const totalBullets = allBullets.length;

  // 1. METRICS CHECK
  const metricRegex = /(?:\d+[\d,.]*(?:%|\$|k|M|x|X|\+)?|\$\d+)/;
  const bulletsWithMetrics = allBullets.filter((b) => metricRegex.test(b.text));
  const metricsCount = bulletsWithMetrics.length;
  const bulletsWithoutMetrics = allBullets.filter((b) => !metricRegex.test(b.text));

  if (totalBullets === 0) {
    items.push({
      id: 'metrics',
      status: 'fix',
      title: 'Quantified metrics & impact',
      found: 'Found 0 experience bullets with measurable metrics.',
      why: 'Recruiters and ATS scorecards prioritize quantifiable results over task listings.',
      fix: 'Add measurable numbers, percentages, or dollar scale to your accomplishments.',
      section: 'experience',
    });
  } else if (metricsCount === totalBullets) {
    items.push({
      id: 'metrics',
      status: 'ok',
      title: 'Quantified metrics & impact',
      found: `Found ${metricsCount} of ${totalBullets} bullets with numbers, %, or $ (100%).`,
      why: 'Quantified metrics verify accomplishments and make resume scanning memorable.',
      fix: 'Maintain this standard for any future additions.',
      section: 'experience',
    });
  } else {
    const firstLacking = bulletsWithoutMetrics[0];
    const metricPct = Math.round((metricsCount / totalBullets) * 100);
    const suggestedRewrite = firstLacking
      ? `${firstLacking.text.replace(/[.]+$/, '')}, achieving [X%] increase in efficiency and saving [$Y].`
      : 'Accomplished [X] as measured by [Y] by doing [Z].';

    items.push({
      id: 'metrics',
      status: 'fix',
      title: 'Quantified metrics & impact',
      found: `Found ${metricsCount} of ${totalBullets} bullets with numbers, %, or $ (${metricPct}%).`,
      why: 'Recruiters and ATS scorecards prioritize quantifiable results over task listings.',
      fix: `Add measurable metrics to ${Math.min(3, bulletsWithoutMetrics.length)} more bullet(s) using the X-Y-Z formula.`,
      before: firstLacking?.text,
      after: suggestedRewrite,
      section: 'experience',
      bulletRef: firstLacking?.id,
    });
  }

  // 2. ACTION VERBS CHECK
  const bulletsWithWeakOpener = allBullets.filter((b) =>
    WEAK_OPENERS.some((wo) => wo.pattern.test(b.text))
  );

  if (bulletsWithWeakOpener.length > 0) {
    const firstWeak = bulletsWithWeakOpener[0];
    const matchedWo = WEAK_OPENERS.find((wo) => wo.pattern.test(firstWeak.text));
    const replacementVerb = matchedWo ? matchedWo.verb : 'Spearheaded';
    const rewritten = matchedWo
      ? firstWeak.text.replace(matchedWo.pattern, `${replacementVerb} `)
      : `${replacementVerb} ${firstWeak.text}`;

    items.push({
      id: 'action-verbs',
      status: 'fix',
      title: 'Action verbs & decisive ownership',
      found: `Found ${bulletsWithWeakOpener.length} bullet(s) opening with passive phrasing (e.g. "${matchedWo?.name || 'passive'}").`,
      why: 'Starting with power verbs signals ownership and direct leadership instead of passive attendance.',
      fix: `Replace passive openers with decisive action verbs like ${replacementVerb}, Architected, or Accelerated.`,
      before: firstWeak.text,
      after: rewritten,
      section: 'experience',
      bulletRef: firstWeak.id,
    });
  } else if (totalBullets > 0) {
    items.push({
      id: 'action-verbs',
      status: 'ok',
      title: 'Action verbs & decisive ownership',
      found: `All ${totalBullets} bullets begin with active, decisive verbs.`,
      why: 'Active voice establishes clear individual ownership for recruiters.',
      fix: 'Continue leading every bullet with strong past-tense action verbs.',
      section: 'experience',
    });
  }

  // 3. SKILLS COVERAGE CHECK (runs only when a target title exists)
  const allUserSkills = (resumeData.skills || []).flatMap((s) => s.skills || []).map((s) => s.trim());
  const targetTitle = (resumeData.personalInfo.jobTitle || '').trim();
  if (targetTitle) {
    const coreSkills = getCoreSkillsForRole(targetTitle);

    const presentSkills = coreSkills.filter((cs) =>
      allUserSkills.some((us) => matchesSkillOrSynonym(cs, us))
    );
    const missingSkills = coreSkills.filter((cs) => !presentSkills.includes(cs));

    if (missingSkills.length > 0) {
      items.push({
        id: 'skills-coverage',
        status: 'fix',
        title: 'Core skills coverage',
        found: `Found ${presentSkills.length} of ${coreSkills.length} standard skills for "${targetTitle}". Missing: ${missingSkills.slice(0, 4).join(', ')}${missingSkills.length > 4 ? ` (+${missingSkills.length - 4} more)` : ''}.`,
        why: 'ATS filters cross-reference your skills directly against standard requisition templates.',
        fix: 'Add the missing competencies you have experience with to your Skills section.',
        section: 'skills',
        presentSkills,
        missingSkills,
      });
    } else {
      items.push({
        id: 'skills-coverage',
        status: 'ok',
        title: 'Core skills coverage',
        found: `All ${coreSkills.length} benchmark skills for "${targetTitle}" are present in your resume.`,
        why: 'Complete skills coverage prevents automated filter rejections by keyword matchers.',
        fix: 'Keep core skills aligned with the latest versions and tooling in your specialty.',
        section: 'skills',
        presentSkills,
        missingSkills: [],
      });
    }
  }

  // 4. AI & TOOLING MENTION
  const aiKeywordsRegex = /\b(llm|llms|copilot|gemini|gpt|chatgpt|openai|claude|prompt|prompts|prompting|automation|langchain|rag|pytorch|ai|agents)\b/i;
  const fullResumeText = [
    resumeData.summary || '',
    ...allBullets.map((b) => b.text),
    ...allUserSkills,
  ].join(' ');

  const hasAiMention = aiKeywordsRegex.test(fullResumeText);

  if (hasAiMention) {
    const matches = fullResumeText.match(/\b(llms?|copilot|gemini|gpt|chatgpt|openai|claude|prompt(?:ing)?|automation|langchain|rag|pytorch|ai|agents)\b/gi) || [];
    const uniqueMatches = Array.from(new Set(matches.map((m) => m.toLowerCase())));
    items.push({
      id: 'ai-tooling',
      status: 'ok',
      title: 'AI & workflow automation adoption',
      found: `Detected modern AI/tooling keywords: ${uniqueMatches.slice(0, 4).join(', ')}.`,
      why: 'Demonstrating AI tooling literacy is an active competitive advantage in 2026 hiring.',
      fix: 'Highlight the specific business or velocity outcomes resulting from using these tools.',
      section: 'experience',
    });
  } else {
    const candidateBullet = allBullets[0];
    items.push({
      id: 'ai-tooling',
      status: 'fix',
      title: 'AI & workflow automation adoption',
      found: 'No mention of AI, LLMs, Copilot, or modern automation tooling detected.',
      why: 'Modern engineering teams prioritize candidates who leverage AI tooling to multiply output.',
      fix: 'Mention how you utilize tools like Copilot, Gemini, LLMs, or automated pipelines in your workflow.',
      before: candidateBullet?.text,
      after: candidateBullet
        ? `${candidateBullet.text.replace(/[.]+$/, '')}, utilizing AI-assisted tooling (Copilot/LLMs) to accelerate delivery by [20%].`
        : 'Leveraged AI-assisted tooling (LLMs/Copilot) to automate test generation and refactoring, improving sprint velocity by [25%].',
      section: 'experience',
      bulletRef: candidateBullet?.id,
    });
  }

  // 5. SUMMARY CHECK
  const summary = (resumeData.summary || '').trim();
  const summaryWords = summary.split(/\s+/).filter(Boolean);
  const wordCount = summaryWords.length;
  const hasResult = /(?:\d+%|\$\d+|\d+\+|\bmeasurable\b|\blead\b|\bdelivered\b|\bincreased\b|\breduced\b|\baccelerated\b)/i.test(summary);

  if (!summary) {
    items.push({
      id: 'summary-check',
      status: 'fix',
      title: 'Professional summary elevator pitch',
      found: 'Professional summary is empty.',
      why: 'A 3-4 sentence elevator pitch anchors your background for recruiters scanning within 6 seconds.',
      fix: 'Write a 30-60 word summary with your role title, core skills, and a quantified win.',
      section: 'summary',
    });
  } else if (wordCount < 30 || wordCount > 60 || !hasResult) {
    const issues: string[] = [];
    if (wordCount < 30) issues.push(`too short (${wordCount} words, ideal: 30-60)`);
    else if (wordCount > 60) issues.push(`too long (${wordCount} words, ideal: 30-60)`);
    if (!hasResult) issues.push('missing a quantified outcome');

    items.push({
      id: 'summary-check',
      status: 'fix',
      title: 'Professional summary elevator pitch',
      found: `Summary is ${issues.join(', ')}.`,
      why: 'Summaries over 60 words get skipped; under 30 words lack sufficient ATS keyword density.',
      fix: 'Format into 3 crisp sentences: [Current Role] -> [Core Technical Strengths] -> [Top Quantified Win].',
      before: summary,
      section: 'summary',
    });
  } else {
    items.push({
      id: 'summary-check',
      status: 'ok',
      title: 'Professional summary elevator pitch',
      found: `Summary is ${wordCount} words with role title and concrete impact.`,
      why: 'Crisp summaries maintain high recruiter retention during initial screening.',
      fix: 'Keep summary aligned with your highest-priority target role.',
      section: 'summary',
    });
  }

  // 6. LENGTH & FORMAT CHECK
  const expList = resumeData.experience || [];
  const rolesWithBadCount = expList.filter(
    (e) => (e.highlights || []).length < 3 || (e.highlights || []).length > 6
  );
  const longBullets = allBullets.filter((b) => b.text.length > 200);

  if (rolesWithBadCount.length > 0 || longBullets.length > 0) {
    const issues: string[] = [];
    if (rolesWithBadCount.length > 0) {
      issues.push(`${rolesWithBadCount.length} role(s) have outside the recommended 3-6 bullets`);
    }
    if (longBullets.length > 0) {
      issues.push(`${longBullets.length} bullet(s) exceed 2 lines (${longBullets[0].text.length} chars)`);
    }

    items.push({
      id: 'length-format',
      status: 'fix',
      title: 'Scannability & bullet density',
      found: `Detected formatting issues: ${issues.join('; ')}.`,
      why: 'Dense text blocks and uneven bullet counts cause scanning fatigue in recruiters.',
      fix: 'Trim bullets under 180 characters and maintain 3 to 6 high-impact bullets per role.',
      before: longBullets[0]?.text,
      after: longBullets[0]
        ? `${longBullets[0].text.slice(0, 150).replace(/\s+\S*$/, '')}... [trimmed to 2 lines]`
        : undefined,
      section: 'experience',
      bulletRef: longBullets[0]?.id,
    });
  } else if (expList.length > 0) {
    items.push({
      id: 'length-format',
      status: 'ok',
      title: 'Scannability & bullet density',
      found: `All ${expList.length} role(s) maintain 3-6 concise bullets under 2 lines.`,
      why: 'Balanced whitespace and concise bullets maximize recruiter read-through rate.',
      fix: 'Preserve this visual rhythm as you add new roles.',
      section: 'experience',
    });
  }

  // Order: fix first, ok last
  const fixes = items.filter((i) => i.status === 'fix');
  const oks = items.filter((i) => i.status === 'ok');
  return [...fixes, ...oks];
}
