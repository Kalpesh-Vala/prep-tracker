/** Shared user shape exposed to the UI and server components. */
export interface SessionUser {
  id: string;
  username: string;
  email: string;
}

/** Consistent success envelope returned by all API route handlers. */
export interface ApiSuccess<T> {
  data: T;
}

/** Consistent error envelope returned by all API route handlers. */
export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/** Energy level recorded for a day (optional on an entry). */
export type EnergyLevel = 'low' | 'medium' | 'high';

/** Serialized Daily Log entry returned by the API (dates as ISO strings). */
export interface DailyLogDTO {
  id: string;
  date: string;
  studyHours: number;
  summary: string;
  problemsSolved: number;
  revisionCompleted: boolean;
  biggestChallenge: string;
  nextDayGoal: string;
  energyLevel?: EnergyLevel;
  createdAt: string;
  updatedAt: string;
}

/** Payload accepted when creating a Daily Log entry (date defaults to today). */
export interface CreateDailyLogInput {
  date?: string;
  studyHours: number;
  summary: string;
  problemsSolved: number;
  revisionCompleted: boolean;
  biggestChallenge: string;
  nextDayGoal: string;
  energyLevel?: EnergyLevel;
}

/** Payload accepted when editing a Daily Log entry (date is immutable). */
export type UpdateDailyLogInput = Partial<Omit<CreateDailyLogInput, 'date'>> & {
  energyLevel?: EnergyLevel | null;
};

// --- DSA tracker ------------------------------------------------------------

/** Difficulty of a DSA problem. */
export type Difficulty = 'easy' | 'medium' | 'hard';

/** Whether a problem was a first attempt or a revisit. */
export type AttemptType = 'first_attempt' | 'revisit';

/** Serialized DSA problem returned by the API (dates as ISO strings). */
export interface DsaProblemDTO {
  id: string;
  title: string;
  topic: string;
  subtopic?: string;
  difficulty: Difficulty;
  platform: string;
  timeTakenMinutes: number;
  attemptType: AttemptType;
  solvedWithoutHints: boolean;
  timeComplexity: string;
  spaceComplexity: string;
  confidence: number;
  needsRevision: boolean;
  interviewWorthy: boolean;
  solvedOn: string;
  createdAt: string;
  updatedAt: string;
}

/** Payload accepted when creating a DSA problem (solvedOn defaults to today). */
export interface CreateDsaInput {
  title: string;
  topic: string;
  subtopic?: string;
  difficulty: Difficulty;
  platform: string;
  timeTakenMinutes: number;
  attemptType: AttemptType;
  solvedWithoutHints: boolean;
  timeComplexity: string;
  spaceComplexity: string;
  confidence: number;
  needsRevision: boolean;
  interviewWorthy: boolean;
  solvedOn?: string;
}

/** Payload accepted when editing a DSA problem. */
export type UpdateDsaInput = Partial<CreateDsaInput>;

/** Filters/pagination accepted by the DSA list endpoint. */
export interface DsaFilter {
  topic?: string;
  difficulty?: Difficulty;
  needsRevision?: boolean;
  interviewWorthy?: boolean;
  page?: number;
  limit?: number;
}

/** Insights returned by the DSA summary endpoint (computed over all records). */
export interface DsaSummaryDTO {
  totalSolved: number;
  countsByTopic: { topic: string; count: number }[];
  countsByDifficulty: { easy: number; medium: number; hard: number };
  weakTopics: { topic: string; averageConfidence: number; needsRevisionCount: number }[];
}

// --- Weekly review ----------------------------------------------------------

/** Serialized Weekly Review returned by the API (dates as ISO strings). */
export interface WeeklyReviewDTO {
  id: string;
  weekNumber: number;
  weekStartDate: string;
  weekEndDate: string;
  plannedWork: string;
  completedWork: string;
  totalStudyHours: number;
  problemsSolved: number;
  dsaAccuracyPercent?: number;
  weakTopics: string[];
  wins: string;
  nextWeekAdjustments: string;
  prefillSourceUsed?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Payload accepted when creating a Weekly Review (dates derived from weekNumber). */
export interface CreateWeeklyReviewInput {
  weekNumber: number;
  plannedWork: string;
  completedWork: string;
  totalStudyHours: number;
  problemsSolved: number;
  dsaAccuracyPercent?: number;
  weakTopics: string[];
  wins: string;
  nextWeekAdjustments: string;
  prefillSourceUsed?: boolean;
}

/** Payload accepted when editing a Weekly Review (week identity is immutable). */
export type UpdateWeeklyReviewInput = Partial<Omit<CreateWeeklyReviewInput, 'weekNumber'>>;

/** Suggested totals for a week, derived from Daily Log + DSA data (never stored). */
export interface WeeklyPrefillDTO {
  weekNumber: number;
  weekStartDate: string;
  weekEndDate: string;
  suggestedTotalStudyHours: number;
  suggestedDsaSolvedCount: number;
  suggestedDsaAttemptCount: number;
  suggestedDsaAccuracyPercent: number | null;
  suggestedWeakTopics: string[];
  coverage: { dailyLogCount: number; dsaCount: number; hasData: boolean; notes: string[] };
}

// --- Dashboard --------------------------------------------------------------

/** Read-only aggregate shown on the Dashboard home screen (computed on demand). */
export interface DashboardSummaryDTO {
  currentWeek: number;
  totalWeeks: number;
  completionPercentage: number;
  totalHoursLogged: number;
  targetHours: number;
  hoursProgressPercentage: number;
  currentStreakDays: number;
  dsaTotalSolved: number;
  dsaSolvedThisWeek: number;
  weeklyGoals: string | null;
  weeklyGoalsStatus: 'set' | 'not_set';
  lastUpdated: string;
}
