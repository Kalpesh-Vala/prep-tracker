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
