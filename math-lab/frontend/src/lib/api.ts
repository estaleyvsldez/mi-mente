// Cliente HTTP y tipos de la API. Toda la comunicación con el backend pasa por aquí.

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = (data as { detail?: unknown }).detail;
    throw new ApiError(res.status, typeof detail === "string" ? detail : "Error de comunicación con el servidor");
  }
  return data as T;
}

export const api = {
  get: <T>(url: string) => req<T>("GET", url),
  post: <T>(url: string, body: unknown = {}) => req<T>("POST", url, body),
  put: <T>(url: string, body: unknown) => req<T>("PUT", url, body),
};

// ---------------------------------------------------------------- tipos ---

export type TopicState = "no_iniciado" | "aprendiendo" | "en_practica" | "dominado" | "consolidado";

export interface TopicSummary {
  uid: string;
  number: string;
  title: string;
  state: TopicState;
  stage: string;
  stage_label: string;
  mastery: number;
  unlocked: boolean;
  conceptual: boolean;
}

export interface BlockSummary {
  uid: string;
  number: number;
  title: string;
  intro: string;
  topics: TopicSummary[];
  mastered: number;
  total: number;
  unlocked: boolean;
  progress: number;
}

export interface CurriculumMap {
  modules: { id: string; code: string; title: string }[];
  blocks: BlockSummary[];
}

export interface Choice { id: string; label: string }
export interface FieldSpec { key: string; label: string; kind: string; unit: string }
export interface AnswerSpecPublic {
  kind: "integer" | "number" | "choice" | "multichoice" | "token" | "words" | "list" | "factorization" | "fields";
  form: string;
  unit: string;
  placeholder: string;
  choices: Choice[];
  fields: FieldSpec[];
  ordered: boolean;
}

export interface Workspace {
  type: string;
  op?: string;
  operands?: (number | string)[];
  result?: number | string;
  partials?: number[];
  dividend?: number;
  divisor?: number;
  quotient?: number;
  remainder?: number;
  [k: string]: unknown;
}

export interface ExercisePublic {
  id: string;
  topic_uid: string;
  topic_title: string;
  topic_number: string;
  level: number;
  mode: string;
  stage: string | null;
  prompt: string;
  answer: AnswerSpecPublic;
  exercise_name: string;
  hints_available: number;
  workspace: Workspace | null;
  help_level: number;
  assessment_id: number | null;
  position?: number;
  total?: number;
}

export interface SolutionStep { title: string; explanation: string; why: string; procedure: string; property: string }
export interface Solution {
  steps: SolutionStep[];
  final: string;
  exercise_name: string;
  procedure_name: string;
  properties: string[];
  workspace: Workspace | null;
}

export interface GameEvent {
  xp?: number;
  reason?: string;
  code?: string;
  title?: string;
  description?: string;
  stage?: string;
  level_up?: number;
  level_down?: number;
  message?: string;
}

export interface AssessmentResult {
  assessment_id: number;
  kind: string;
  score: number;
  correct: number;
  total: number;
  passed: boolean | null;
  late: boolean;
  message: string;
  events: GameEvent[];
}

export interface AnswerResult {
  parsed: boolean;
  message?: string;
  correct?: boolean;
  assisted?: boolean;
  diagnosis?: { code: string; title: string; explanation: string; step_index: number | null } | null;
  format_issue?: string | null;
  field_results?: Record<string, boolean>;
  correct_answer?: string;
  solution?: Solution;
  followup?: { question: string; options: string[] };
  assessment?: { id: number; answered: number; total: number; result: AssessmentResult | null };
  events?: GameEvent[];
  flow?: FlowState;
  help?: HelpRung;
}

export interface HelpRung {
  kind: "concept" | "step" | "solution";
  help_level: number;
  message: string;
  hints?: string[];
  exercise_name?: string;
  procedure_name?: string;
  revealed?: SolutionStep[];
  your_turn?: { step_index: number; title: string; prompt: string; answer: AnswerSpecPublic } | null;
  total_steps?: number;
  solution?: Solution;
  simpler?: { generator: string; level: number } | null;
}

export interface FlowState {
  topic_uid: string;
  stage: string;
  stage_label: string;
  state: TopicState;
  level: number;
  mastery: number;
  accuracy: number;
  unassisted: number;
  stages: { id: string; label: string; done: boolean }[];
  sections_passed: number[];
  sections_total: number;
  requirements: string[];
  ready_for_assessment: boolean;
  guided_progress: { done: number; needed: number };
  active_assessment: number | null;
  consolidation_due: string | null;
  consolidation_available: boolean;
  top_errors: { code: string; title: string; count: number }[];
  diagnostic_score: number | null;
  exam_score: number | null;
  unlocked: boolean;
}

export interface Section {
  title: string;
  concept: string;
  explanation: string;
  definition: string;
  rules: string[];
  examples: { problem: string; solution: string }[];
  common_errors: string[];
  summary: string;
  check: { question: string; options: string[] };
}

export interface Lesson {
  intro: {
    what: string;
    purpose: string;
    importance: string;
    foundations: string;
    prerequisites: string[];
    outcomes: string[];
    everyday_example: string;
  };
  sections: Section[];
  glossary: { term: string; definition: string }[];
}

export interface TopicDetail {
  uid: string;
  number: string;
  title: string;
  block: { uid: string; number: number; title: string };
  previous: { uid: string; title: string; number: string } | null;
  lesson: Lesson | null;
  example: { prompt: string; solution: Solution } | null;
  flow: FlowState;
  conceptual: boolean;
}

export interface Dashboard {
  xp: number;
  level: number;
  level_floor: number;
  level_ceil: number;
  streak: number;
  best_streak: number;
  topics_total: number;
  mastered: number;
  consolidated: number;
  in_progress: number;
  reviews_due: number;
  next_topic: { uid: string; number: string; title: string; stage_label: string; block: string } | null;
  attempts: number;
  accuracy: number | null;
  week_attempts: number;
  week_accuracy: number | null;
  achievements: number;
}

export interface AssessmentView {
  id: number;
  kind: string;
  scope: string;
  scope_title: string;
  total: number;
  answered: number;
  correct: number | null;
  finished: boolean;
  passed: boolean | null;
  time_limit_s: number | null;
  started_at: string;
  items?: { exercise_id: string; topic_uid: string; correct: boolean; level: number }[];
}
