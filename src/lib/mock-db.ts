// ============================================================
//  BAGUPADU — In-Memory Mock Database
//  Simulates database tables for development mode.
//  All collections start EMPTY — no seed data.
//  Data persists for the duration of the server process.
// ============================================================
import { User, Resume, AtsScore, CoverLetter, SavedJob, InterviewSession, ChatHistory, ActivityFeedItem, JobMatch } from './types';

// --------------- Demo User (auth only, no resume data) ---------------

const DEMO_USER: User = {
  id: 'demo-001',
  name: 'Demo User',
  email: 'demo@bagupadu.io',
  avatar: 'DU',
  location: '',
  plan: 'free',
  preferences: {
    theme: 'light',
    default_template: 'Modern Professional',
    writing_tone: 'Professional',
    currency: 'USD',
    notifications: {
      resumeUpdates: true,
      jobMatches: true,
      appReminders: false,
      productUpdates: true,
    },
  },
  created_at: new Date().toISOString(),
  isDemo: true,
};

// --------------- Mock DB Store (all collections start empty) ---------------
class MockDatabase {
  private users = new Map<string, User>([[DEMO_USER.id, DEMO_USER]]);
  private resumes = new Map<string, Resume>();
  private atsScores = new Map<string, AtsScore>();
  private coverLetters = new Map<string, CoverLetter>();
  private savedJobs = new Map<string, SavedJob>();
  private interviews = new Map<string, InterviewSession>();
  private chats = new Map<string, ChatHistory>();
  private activity = new Map<string, ActivityFeedItem>();
  private jobMatches = new Map<string, JobMatch>();
  private resumeVersions = new Map<string, { id: string; resume_id: string; parsed_data: any; version: number; created_at: string }>();

  private counter = 1000;
  private newId() { return `mock-${++this.counter}-${Date.now()}`; }

  // Users
  getUser(id: string) { return this.users.get(id) ?? null; }
  getUserByEmail(email: string) { return [...this.users.values()].find(u => u.email === email) ?? null; }
  upsertUser(user: Partial<User> & { id: string }): User {
    const existing = this.users.get(user.id) ?? { ...DEMO_USER };
    const updated = { ...existing, ...user, updated_at: new Date().toISOString() } as User;
    this.users.set(user.id, updated);
    return updated;
  }

  // Resumes
  getResumes(userId: string) { return [...this.resumes.values()].filter(r => r.user_id === userId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); }
  getResume(id: string) { return this.resumes.get(id) ?? null; }
  createResume(data: Omit<Resume, 'id' | 'created_at' | 'updated_at'>): Resume {
    const resume: Resume = { ...data, id: this.newId(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    this.resumes.set(resume.id, resume);
    return resume;
  }
  updateResume(id: string, data: Partial<Resume>): Resume | null {
    const r = this.resumes.get(id);
    if (!r) return null;
    const updated = { ...r, ...data, updated_at: new Date().toISOString() };
    this.resumes.set(id, updated);
    return updated;
  }
  deleteResume(id: string) {
    this.resumes.delete(id);
    
    // Cascade delete ATS scores
    for (const [key, val] of this.atsScores.entries()) {
      if (val.resume_id === id) {
        this.atsScores.delete(key);
      }
    }
    
    // Cascade delete resume versions
    for (const [key, val] of this.resumeVersions.entries()) {
      if (val.resume_id === id) {
        this.resumeVersions.delete(key);
      }
    }
    
    // Cascade delete job matches
    for (const [key, val] of this.jobMatches.entries()) {
      if (val.resume_id === id) {
        this.jobMatches.delete(key);
      }
    }
  }

  // ATS Scores
  getAtsScores(userId: string) { return [...this.atsScores.values()].filter(a => a.user_id === userId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); }
  getAtsScoresByResume(resumeId: string) { return [...this.atsScores.values()].filter(a => a.resume_id === resumeId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); }
  createAtsScore(data: Omit<AtsScore, 'id' | 'created_at'>): AtsScore {
    const score: AtsScore = { ...data, id: this.newId(), created_at: new Date().toISOString() };
    this.atsScores.set(score.id, score);
    return score;
  }

  // Cover Letters
  getCoverLetters(userId: string) { return [...this.coverLetters.values()].filter(c => c.user_id === userId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); }
  createCoverLetter(data: Omit<CoverLetter, 'id' | 'created_at'>): CoverLetter {
    const cl: CoverLetter = { ...data, id: this.newId(), created_at: new Date().toISOString() };
    this.coverLetters.set(cl.id, cl);
    return cl;
  }
  deleteCoverLetter(id: string) { this.coverLetters.delete(id); }

  // Saved Jobs
  getSavedJobs(userId: string) { return [...this.savedJobs.values()].filter(j => j.user_id === userId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); }
  saveJob(data: Omit<SavedJob, 'id' | 'created_at'>): SavedJob {
    const j: SavedJob = { ...data, id: this.newId(), created_at: new Date().toISOString() };
    this.savedJobs.set(j.id, j);
    return j;
  }
  deleteSavedJob(id: string) { this.savedJobs.delete(id); }

  // Interview Sessions
  getInterviews(userId: string) { return [...this.interviews.values()].filter(i => i.user_id === userId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); }
  createInterview(data: Omit<InterviewSession, 'id' | 'created_at'>): InterviewSession {
    const s: InterviewSession = { ...data, id: this.newId(), created_at: new Date().toISOString() };
    this.interviews.set(s.id, s);
    return s;
  }
  updateInterview(id: string, data: Partial<InterviewSession>): InterviewSession | null {
    const s = this.interviews.get(id);
    if (!s) return null;
    const updated = { ...s, ...data };
    this.interviews.set(id, updated);
    return updated;
  }

  // Chat History
  getChats(userId: string) { return [...this.chats.values()].filter(c => c.user_id === userId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); }
  createChat(data: Omit<ChatHistory, 'id' | 'created_at'>): ChatHistory {
    const c: ChatHistory = { ...data, id: this.newId(), created_at: new Date().toISOString() };
    this.chats.set(c.id, c);
    return c;
  }
  updateChat(id: string, data: Partial<ChatHistory>) {
    const c = this.chats.get(id);
    if (!c) return null;
    const updated = { ...c, ...data };
    this.chats.set(id, updated);
    return updated;
  }

  // Activity Feed
  getActivity(userId: string, limit = 20) { return [...this.activity.values()].filter(a => a.user_id === userId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit); }
  addActivity(data: Omit<ActivityFeedItem, 'id' | 'created_at'>) {
    const a: ActivityFeedItem = { ...data, id: this.newId(), created_at: new Date().toISOString() };
    this.activity.set(a.id, a);
    return a;
  }

  // Job Matches
  getJobMatches(userId: string) { return [...this.jobMatches.values()].filter(j => j.user_id === userId).sort((a, b) => b.match_score - a.match_score); }
  createJobMatch(data: Omit<JobMatch, 'id' | 'created_at'>): JobMatch {
    const j: JobMatch = { ...data, id: this.newId(), created_at: new Date().toISOString() };
    this.jobMatches.set(j.id, j);
    return j;
  }

  // Dashboard aggregations — returns honest empty data for new users
  getDashboardStats(userId: string) {
    const resumes = this.getResumes(userId);
    const atsScores = this.getAtsScores(userId);
    const jobs = this.getJobMatches(userId);
    const activity = this.getActivity(userId, 5);

    const avgAts = resumes.length
      ? Math.round(resumes.reduce((s, r) => s + (r.ats_score || 0), 0) / resumes.length)
      : 0;

    // ATS trend — based on real ATS scores sorted by date
    const trend = atsScores.slice(0, 30).reverse().map((a, i) => ({
      day: new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: a.score,
    }));

    // Skills aggregation from all real resumes only
    const skillCounts: Record<string, number> = {};
    resumes.forEach(r => r.parsed_data?.skills?.forEach(s => { skillCounts[s] = (skillCounts[s] || 0) + 1; }));
    const skillColors = ['#6C5CE7', '#A29BFE', '#00b894', '#0984e3', '#fdcb6e', '#dfe6e9'];
    const topSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count], i) => ({ name, value: Math.round((count / resumes.length) * 28) + 10, color: skillColors[i] }));

    // Job match summary from real data only
    const excellent = jobs.filter(j => j.match_score >= 90).length;
    const good = jobs.filter(j => j.match_score >= 70 && j.match_score < 90).length;
    const fair = jobs.filter(j => j.match_score >= 50 && j.match_score < 70).length;
    const low = jobs.filter(j => j.match_score < 50).length;
    const total = jobs.length || 1;

    return {
      resumes_count: resumes.length,
      avg_ats_score: avgAts,
      profile_views: 0,
      jobs_matched: jobs.length,
      ats_trend: trend,
      top_skills: topSkills,
      job_match_summary: [
        { label: 'Excellent (90%+)', count: excellent, pct: Math.round((excellent / total) * 100), color: '#00b894' },
        { label: 'Good (70–89%)',    count: good,      pct: Math.round((good / total) * 100),      color: '#6C5CE7' },
        { label: 'Fair (50–69%)',    count: fair,      pct: Math.round((fair / total) * 100),       color: '#fdcb6e' },
        { label: 'Low (<50%)',       count: low,       pct: Math.round((low / total) * 100),        color: '#ff7675' },
      ],
      recent_resumes: resumes.slice(0, 5),
      activity_feed: activity,
    };
  }

  // Resume Versions
  getResumeVersions(resumeId: string) {
    return [...this.resumeVersions.values()]
      .filter(v => v.resume_id === resumeId)
      .sort((a, b) => b.version - a.version);
  }

  createResumeVersion(resumeId: string, parsedData: any) {
    const versions = this.getResumeVersions(resumeId);
    const nextVersion = versions.length > 0 ? versions[0].version + 1 : 1;
    const versionRecord = {
      id: this.newId(),
      resume_id: resumeId,
      parsed_data: parsedData,
      version: nextVersion,
      created_at: new Date().toISOString(),
    };
    this.resumeVersions.set(versionRecord.id, versionRecord);
    return versionRecord;
  }

  // History — combined, real data only
  getHistory(userId: string) {
    const resumes = this.getResumes(userId).map(r => ({ ...r, type: 'Resume', icon: '📄', role: r.parsed_data?.title || 'Resume', company: '' }));
    const cls = this.getCoverLetters(userId).map(c => ({ ...c, type: 'Cover Letter', icon: '✉️', role: c.job_title, company: c.company }));
    const ats = this.getAtsScores(userId).map(a => ({ ...a, type: 'ATS Check', icon: '🎯', role: 'ATS Analysis', company: '' }));
    const chats = this.getChats(userId).map(c => ({ ...c, type: 'AI Chat', icon: '💬', role: 'Chat Session', company: '' }));
    const interviews = this.getInterviews(userId).map(i => ({ ...i, type: 'Interview', icon: '🎤', role: i.role, company: '' }));
    return [...resumes, ...cls, ...ats, ...chats, ...interviews].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}

// Singleton instance — persists across requests in dev mode
const globalDb = global as typeof global & { __mockDb?: MockDatabase };
if (!globalDb.__mockDb) globalDb.__mockDb = new MockDatabase();

export const mockDb = globalDb.__mockDb;
export { DEMO_USER };
