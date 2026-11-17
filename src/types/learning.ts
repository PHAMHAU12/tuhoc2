export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type AppRoute =
  | "landing"
  | "auth"
  | "dashboard"
  | "ai-speaking"
  | "vocabulary"
  | "scenarios"
  | "exercises"
  | "progress"
  | "profile";

export type SkillCategory =
  | "Speaking"
  | "Listening"
  | "Pronunciation"
  | "Vocabulary"
  | "Grammar";

export type SkillScoresMap = Record<SkillCategory, number>;

export type WeeklyMinutesMap = Record<
  "T2" | "T3" | "T4" | "T5" | "T6" | "T7" | "CN",
  number
>;

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  avatarUrl: string;
  currentCefr: CefrLevel;
  targetCefr: CefrLevel;
  dailyGoalMinutes: number;
  todayMinutes: number;
  streakDays: number;
  vocabularyLearnedCount: number;
  preferredAccent: "US" | "UK";
  speechRate: 0.8 | 1.0 | 1.15;
  showVietnameseHints: boolean;
  showIpaNotation: boolean;
  skillScores?: SkillScoresMap;
  weeklyMinutes?: WeeklyMinutesMap;
}

export interface RecentLesson {
  id: string;
  titleVi: string;
  titleEn: string;
  cefr: CefrLevel;
  skillVi: string;
  durationMinutes: number;
  scorePercent: number;
  completedAtLabel: string;
  routeTarget: AppRoute;
}

export interface CompletedLessonRecord {
  id: string;
  uid: string;
  lessonId: string;
  titleVi: string;
  titleEn: string;
  cefr: CefrLevel;
  skillVi: string;
  durationMinutes: number;
  scorePercent: number;
  routeTarget: AppRoute;
  completedAtLabel: string;
}

export interface VocabularyBookmarkRecord {
  uid: string;
  wordId: string;
  word: string;
  cefr: CefrLevel;
  mastered: boolean;
  bookmarked: boolean;
}

export interface SpeakingHistoryRecord {
  id: string;
  uid: string;
  scenarioId: string;
  scenarioTitleVi: string;
  cefr: CefrLevel;
  promptEn: string;
  learnerTranscript: string;
  naturalRewrite: string;
  grammarNotesVi: string;
  pronunciationFocusVi: string;
  source: "gemini-server" | "self-practice";
  createdAtLabel: string;
}

export interface TestResultRecord {
  id: string;
  uid: string;
  exerciseId: string;
  titleVi: string;
  cefr: CefrLevel;
  category: string;
  completedItems: number;
  totalItems: number;
  scorePercent: number;
  createdAtLabel: string;
}

export interface VocabularyItem {
  id: string;
  word: string;
  ipa: string;
  partOfSpeech: string;
  cefr: CefrLevel;
  topic: string;
  meaningVi: string;
  definitionEn: string;
  exampleEn: string;
  exampleVi: string;
  collocations: string[];
  mastered: boolean;
  bookmarked?: boolean;
}

export interface DialogueMessage {
  id: string;
  speaker: "ai" | "learner";
  speakerLabel: string;
  textEn: string;
  translationVi: string;
  pronunciationNoteVi?: string;
}

export interface ConversationScenario {
  id: string;
  titleVi: string;
  titleEn: string;
  cefr: CefrLevel;
  category: "Đời sống" | "Công việc" | "Du lịch" | "Học thuật";
  durationMinutes: number;
  turnsCount: number;
  aiRole: string;
  learnerRole: string;
  summaryVi: string;
  objectivesVi: string[];
  imageUrl?: string;
  sampleDialogue: DialogueMessage[];
  suggestedPhrases: Array<{ phrase: string; ipa: string; meaningVi: string }>;
}

export interface SpeakingExercise {
  id: string;
  group: "âm-cuối" | "trọng-âm" | "shadowing";
  titleVi: string;
  cefr: CefrLevel;
  targetSound: string;
  ipaPair: string;
  pitfallVi: string;
  articulationTipVi: string;
  practiceItems: Array<{
    id: string;
    promptEn: string;
    ipa: string;
    meaningVi: string;
    focusWord: string;
  }>;
}

export interface SkillProgressMetric {
  key: SkillCategory;
  labelVi: string;
  percent: number;
  cefrEstimate: CefrLevel;
  weeklyDeltaLabel: string;
  nextMilestoneVi: string;
}

export interface WeeklyStudyPoint {
  dayLabel: "T2" | "T3" | "T4" | "T5" | "T6" | "T7" | "CN";
  minutes: number;
  targetMinutes: number;
}

export interface IntegrationStatus {
  serverReady: boolean;
  geminiConfigured: boolean;
  firebasePrepared: boolean;
  firebaseConnected: boolean;
  firebaseProjectId?: string;
}

export type SpeakingTopicKey =
  | "daily_life"
  | "school"
  | "travel"
  | "food"
  | "shopping"
  | "work"
  | "ielts";

export interface SpeakingTopicOption {
  key: SpeakingTopicKey;
  titleVi: string;
  titleEn: string;
  aiRole: string;
  descriptionVi: string;
  starterByCefr: Record<
    CefrLevel,
    {
      questionEn: string;
      translationVi: string;
      sampleTipVi: string;
    }
  >;
}

export interface ConversationChatMessage {
  id: string;
  speaker: "ai" | "learner";
  textEn: string;
  translationVi?: string;
  showTranslation?: boolean;
  inputMethod?: "text" | "mic";
  hasGrammarCorrection?: boolean;
  correctedSentenceEn?: string;
  grammarExplanationVi?: string;
  naturalExpressions?: string[];
  encouragementVi?: string;
}

export interface CatalogVocabularyItem {
  id: string;
  level: CefrLevel;
  topic: string;
  word: string;
  ipa: string;
  part_of_speech: string;
  meaning_vi: string;
  example_en: string;
  example_vi: string;
  mastered?: boolean;
  bookmarked?: boolean;
}

export interface CatalogConversationScenario {
  id: string;
  level: CefrLevel;
  topic: string;
  context_vi: string;
  roles: Array<{ role: string; description_vi: string }>;
  dialogue: Array<{ speaker: string; en: string; vi: string }>;
  useful_phrases: Array<{ en: string; vi: string }>;
  ai_coaching_instruction_vi: string;
}

export interface CatalogSpeakingTask {
  id: string;
  level: CefrLevel;
  topic: string;
  prompt_en: string;
  prompt_vi: string;
  instructions_vi: string[];
  guiding_questions: string[];
  self_assessment: string[];
}

export interface CompletedSpeakingTaskRecord {
  uid: string;
  taskId: string;
  topic: string;
  level: CefrLevel;
  promptEn: string;
  checkedCriteria: string[];
  completed: boolean;
  notes: string;
  updatedAtLabel: string;
}

export interface DatasetVerificationResult {
  vocabularyCount: number;
  scenariosCount: number;
  tasksCount: number;
  verifiedAtLabel: string;
}


