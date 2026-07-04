// ============================================================
//  All TypeScript types for BAGUPADU
// ============================================================

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  location?: string;
  plan: 'free' | 'pro' | 'enterprise';
  preferences?: UserPreferences;
  created_at: string;
  isDemo?: boolean;
  anthropic_key?: string;
  openai_key?: string;
  groq_key?: string;
  gemini_key?: string;
  active_llm?: 'anthropic' | 'openai' | 'groq' | 'gemini';
  apify_key?: string;
  apify_actor_id?: string;
  app_mode?: 'mock' | 'live';
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  default_template: string;
  writing_tone: string;
  currency: string;
  notifications: NotificationPrefs;
}

export interface NotificationPrefs {
  resumeUpdates: boolean;
  jobMatches: boolean;
  appReminders: boolean;
  productUpdates: boolean;
}

export interface Resume {
  id: string;
  user_id: string;
  filename: string;
  file_url?: string;
  parsed_data?: ParsedResume;
  ats_score?: number;
  template: string;
  status: 'Optimized' | 'Good' | 'Needs Improve' | 'Below Average' | 'Draft';
  created_at: string;
  updated_at: string;
}

export interface ParsedResume {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  github?: string;
  summary: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: string[];
  projects?: ProjectItem[];
  certifications?: string[];
}

export interface ExperienceItem {
  title: string;
  company: string;
  location?: string;
  dates: string;
  bullets: string[];
}

export interface EducationItem {
  degree: string;
  institution: string;
  dates: string;
  gpa?: string;
}

export interface ProjectItem {
  name: string;
  description: string;
  technologies: string[];
  url?: string;
}

export interface AtsSuggestion {
  text: string;
  impact: string;
  section: string;
}

export interface AtsBreakdownExplanations {
  keyword_match: string;
  skills_match: string;
  experience_relevance: string;
  content_quality: string;
  quantified_achievements: string;
  resume_structure: string;
  readability: string;
  profile_completeness: string;
  contact_info: string;
}

export interface AtsScore {
  id: string;
  resume_id: string;
  user_id: string;
  job_description?: string;
  score: number;
  breakdown: AtsBreakdown;
  matched_keywords: string[];
  missing_keywords: string[];
  suggestions: (string | AtsSuggestion)[];
  explanations?: AtsBreakdownExplanations;
  strengths?: string[];
  weaknesses?: string[];
  industry_relevance?: string;
  created_at: string;
}

export interface AtsBreakdown {
  keyword_match: number;
  skills_match: number;
  experience_relevance: number;
  content_quality: number;
  quantified_achievements?: number;
  resume_structure: number;
  readability: number;
  profile_completeness: number;
  contact_info?: number;
  label: string;
  compatibility: string;
  explanations?: AtsBreakdownExplanations;
  // Optional compat fields:
  format_score?: number;
  content_analysis?: {
    has_summary: boolean;
    has_metrics: boolean;
    action_verbs_count: number;
    total_words: number;
  };
  format_check?: {
    single_column: boolean;
    standard_fonts: boolean;
    no_tables: boolean;
    no_images: boolean;
  };
}

export interface CoverLetter {
  id: string;
  user_id: string;
  resume_id?: string;
  job_title: string;
  company: string;
  tone: string;
  content: string;
  template: string;
  created_at: string;
}

export interface SavedJob {
  id: string;
  user_id: string;
  job_title: string;
  company: string;
  location: string;
  job_type: string;
  work_mode?: string;
  description: string;
  skills: string[];
  match_score: number;
  apply_url: string;
  logo?: string;
  created_at: string;
}

export interface InterviewSession {
  id: string;
  user_id: string;
  role: string;
  category: string;
  questions: InterviewQuestion[];
  answers: InterviewAnswer[];
  score?: number;
  feedback?: string;
  created_at: string;
}

export interface InterviewQuestion {
  id: string;
  text: string;
  type: 'behavioral' | 'technical' | 'situational';
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface InterviewAnswer {
  question_id: string;
  answer: string;
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatHistory {
  id: string;
  user_id: string;
  resume_id?: string;
  model: string;
  messages: ChatMessage[];
  created_at: string;
}

export interface ActivityFeedItem {
  id: string;
  user_id: string;
  action_type: 'ats_check' | 'resume_upload' | 'cover_letter' | 'job_match' | 'interview' | 'chat' | 'optimize' | 'download';
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface JobMatch {
  id: string;
  user_id: string;
  resume_id?: string;
  job_data: JobData;
  match_score: number;
  match_breakdown: JobMatchBreakdown;
  created_at: string;
}

export interface JobData {
  title: string;
  company: string;
  location: string;
  work_mode: string;
  job_type: string;
  experience: string;
  description: string;
  skills: string[];
  posted_date: string;
  apply_url: string;
  logo: string;
}

export interface JobMatchBreakdown {
  skills_match: number;
  experience_match: number;
  keyword_match: number;
  role_match: number;
  location_match: number;
  education_match: number;
}

export interface DashboardStats {
  resumes_count: number;
  avg_ats_score: number;
  profile_views: number;
  jobs_matched: number;
  ats_trend: { day: string; score: number }[];
  top_skills: { name: string; value: number; color: string }[];
  job_match_summary: { label: string; count: number; pct: number; color: string }[];
  recent_resumes: Resume[];
  activity_feed: ActivityFeedItem[];
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  success: boolean;
}
