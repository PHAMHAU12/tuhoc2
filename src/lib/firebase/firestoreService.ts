import { User } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocsFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { ASSETS } from "../../data/sampleData";
import {
  CatalogConversationScenario,
  CatalogSpeakingTask,
  CatalogVocabularyItem,
  CefrLevel,
  CompletedLessonRecord,
  CompletedSpeakingTaskRecord,
  DatasetVerificationResult,
  SkillScoresMap,
  SpeakingHistoryRecord,
  TestResultRecord,
  UserProfile,
  VocabularyBookmarkRecord,
  WeeklyMinutesMap,
} from "../../types/learning";
import { ADMIN_EMAIL, db, FIRESTORE_COLLECTIONS } from "./config";
import { handleFirestoreError, OperationType } from "./errors";

const CEFR_LEVELS_LIST: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const CEFR_ORDER: Record<CefrLevel, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
};

const STARTER_DATASET_URL =
  "/assets/aistudio/english_speaking_ai_starter_dataset_a8275b28.json";

const DEFAULT_SKILL_SCORES: SkillScoresMap = {
  Speaking: 45,
  Listening: 50,
  Pronunciation: 42,
  Vocabulary: 48,
  Grammar: 46,
};

const DEFAULT_WEEKLY_MINUTES: WeeklyMinutesMap = {
  T2: 0,
  T3: 0,
  T4: 0,
  T5: 0,
  T6: 0,
  T7: 0,
  CN: 0,
};

function getTodayWeekdayKey(): keyof WeeklyMinutesMap {
  const day = new Date().getDay(); // 0 = Sunday
  const map: Array<keyof WeeklyMinutesMap> = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return map[day] ?? "T2";
}

function formatTimestampVi(value: unknown): string {
  if (value instanceof Timestamp) {
    const date = value.toDate();
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return "Vừa xong";
}

function getTimestampMillis(value: unknown): number {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }
  return 0;
}

function clampString(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

function sanitizeSkillScores(
  scores: Partial<SkillScoresMap> | undefined,
  patch?: Partial<SkillScoresMap>
): SkillScoresMap {
  const clampScore = (val: unknown, fallback: number) => {
    const num = typeof val === "number" && Number.isFinite(val) ? Math.round(val) : fallback;
    return Math.max(0, Math.min(100, num));
  };
  return {
    Speaking: clampScore(patch?.Speaking ?? scores?.Speaking, DEFAULT_SKILL_SCORES.Speaking),
    Listening: clampScore(patch?.Listening ?? scores?.Listening, DEFAULT_SKILL_SCORES.Listening),
    Pronunciation: clampScore(
      patch?.Pronunciation ?? scores?.Pronunciation,
      DEFAULT_SKILL_SCORES.Pronunciation
    ),
    Vocabulary: clampScore(patch?.Vocabulary ?? scores?.Vocabulary, DEFAULT_SKILL_SCORES.Vocabulary),
    Grammar: clampScore(patch?.Grammar ?? scores?.Grammar, DEFAULT_SKILL_SCORES.Grammar),
  };
}

function sanitizeWeeklyMinutes(
  weekly: Partial<WeeklyMinutesMap> | undefined
): WeeklyMinutesMap {
  const clampMin = (val: unknown) => {
    const num = typeof val === "number" && Number.isFinite(val) ? Math.round(val) : 0;
    return Math.max(0, Math.min(1440, num));
  };
  return {
    T2: clampMin(weekly?.T2),
    T3: clampMin(weekly?.T3),
    T4: clampMin(weekly?.T4),
    T5: clampMin(weekly?.T5),
    T6: clampMin(weekly?.T6),
    T7: clampMin(weekly?.T7),
    CN: clampMin(weekly?.CN),
  };
}

export const firestoreService = {
  collections: FIRESTORE_COLLECTIONS,

  async ensureUserProfile(
    firebaseUser: User,
    overrides?: { fullName?: string; targetCefr?: CefrLevel }
  ): Promise<UserProfile> {
    const userPath = `${FIRESTORE_COLLECTIONS.users}/${firebaseUser.uid}`;
    const userRef = doc(db, FIRESTORE_COLLECTIONS.users, firebaseUser.uid);

    try {
      const snapshot = await getDoc(userRef);
      if (snapshot.exists()) {
        return snapshot.data() as UserProfile;
      }

      const fullName =
        clampString(
          overrides?.fullName?.trim() ||
            firebaseUser.displayName?.trim() ||
            firebaseUser.email?.split("@")[0] ||
            "Học viên mới",
          100
        ) || "Học viên mới";

      const rawAvatar = firebaseUser.photoURL?.trim();
      const safeAvatar =
        rawAvatar && rawAvatar.length <= 480 ? rawAvatar : ASSETS.studentAvatar;

      const newProfilePayload = {
        uid: firebaseUser.uid,
        fullName,
        email: clampString(firebaseUser.email || `${firebaseUser.uid}@learner.local`, 160),
        avatarUrl: safeAvatar,
        currentCefr: "B1" as CefrLevel,
        targetCefr: overrides?.targetCefr ?? ("B2" as CefrLevel),
        dailyGoalMinutes: 20,
        todayMinutes: 0,
        streakDays: 1,
        vocabularyLearnedCount: 0,
        preferredAccent: "US" as const,
        speechRate: 1.0 as const,
        showVietnameseHints: true,
        showIpaNotation: true,
        skillScores: DEFAULT_SKILL_SCORES,
        weeklyMinutes: DEFAULT_WEEKLY_MINUTES,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(userRef, newProfilePayload);
      return {
        ...newProfilePayload,
      } as unknown as UserProfile;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, userPath);
    }
  },

  subscribeUserProfile(
    uid: string,
    onData: (profile: UserProfile | null) => void,
    onError: (err: Error) => void
  ): Unsubscribe {
    const userPath = `${FIRESTORE_COLLECTIONS.users}/${uid}`;
    const userRef = doc(db, FIRESTORE_COLLECTIONS.users, uid);

    return onSnapshot(
      userRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          onData(null);
          return;
        }
        onData(snapshot.data() as UserProfile);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, userPath);
        } catch (wrapped) {
          onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    );
  },

  async updateUserPreferences(
    uid: string,
    profile: UserProfile
  ): Promise<void> {
    const userPath = `${FIRESTORE_COLLECTIONS.users}/${uid}`;
    const userRef = doc(db, FIRESTORE_COLLECTIONS.users, uid);

    try {
      await updateDoc(userRef, {
        fullName: clampString(profile.fullName || "", 100) || "Học viên",
        email: clampString(profile.email || "", 160) || "learner@local.app",
        avatarUrl: clampString(profile.avatarUrl || ASSETS.studentAvatar, 500),
        currentCefr: profile.currentCefr,
        targetCefr: profile.targetCefr,
        dailyGoalMinutes: Math.max(5, Math.min(180, Math.round(profile.dailyGoalMinutes))),
        preferredAccent: profile.preferredAccent,
        speechRate: profile.speechRate,
        showVietnameseHints: Boolean(profile.showVietnameseHints),
        showIpaNotation: Boolean(profile.showIpaNotation),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userPath);
    }
  },

  async recordStudyMinutes(
    uid: string,
    currentProfile: UserProfile,
    addMinutes: number
  ): Promise<void> {
    const userPath = `${FIRESTORE_COLLECTIONS.users}/${uid}`;
    const userRef = doc(db, FIRESTORE_COLLECTIONS.users, uid);
    const todayKey = getTodayWeekdayKey();
    const currentWeekly = sanitizeWeeklyMinutes(currentProfile.weeklyMinutes);
    const safeAdd = Math.max(0, Math.round(addMinutes));
    const nextToday = Math.min(1440, Math.max(0, Math.round(currentProfile.todayMinutes) + safeAdd));
    currentWeekly[todayKey] = Math.min(1440, Math.max(0, currentWeekly[todayKey] + safeAdd));

    try {
      await updateDoc(userRef, {
        todayMinutes: nextToday,
        weeklyMinutes: currentWeekly,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userPath);
    }
  },

  subscribeVocabularyBookmarks(
    uid: string,
    onData: (bookmarks: Record<string, VocabularyBookmarkRecord>) => void,
    onError: (err: Error) => void
  ): Unsubscribe {
    const colPath = FIRESTORE_COLLECTIONS.vocabularyBookmarks(uid);
    const q = query(collection(db, colPath), where("uid", "==", uid));

    return onSnapshot(
      q,
      (snapshot) => {
        const map: Record<string, VocabularyBookmarkRecord> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as VocabularyBookmarkRecord;
          map[data.wordId] = data;
        });
        onData(map);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, colPath);
        } catch (wrapped) {
          onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    );
  },

  async upsertVocabularyBookmark(
    uid: string,
    payload: {
      wordId: string;
      word: string;
      cefr: CefrLevel;
      mastered: boolean;
      bookmarked: boolean;
    },
    nextMasteredCount: number
  ): Promise<void> {
    const docPath = `${FIRESTORE_COLLECTIONS.vocabularyBookmarks(uid)}/${payload.wordId}`;
    const docRef = doc(db, FIRESTORE_COLLECTIONS.vocabularyBookmarks(uid), payload.wordId);

    try {
      await setDoc(docRef, {
        uid,
        wordId: clampString(payload.wordId, 64),
        word: clampString(payload.word, 120),
        cefr: payload.cefr,
        mastered: Boolean(payload.mastered),
        bookmarked: Boolean(payload.bookmarked),
        updatedAt: serverTimestamp(),
      });

      const userRef = doc(db, FIRESTORE_COLLECTIONS.users, uid);
      await updateDoc(userRef, {
        vocabularyLearnedCount: Math.max(0, Math.round(nextMasteredCount)),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  },

  subscribeCompletedLessons(
    uid: string,
    onData: (lessons: CompletedLessonRecord[]) => void,
    onError: (err: Error) => void
  ): Unsubscribe {
    const colPath = FIRESTORE_COLLECTIONS.completedLessons(uid);
    const q = query(collection(db, colPath), where("uid", "==", uid));

    return onSnapshot(
      q,
      (snapshot) => {
        const items: CompletedLessonRecord[] = [...snapshot.docs]
          .sort(
            (a, b) =>
              getTimestampMillis(b.data().completedAt) -
              getTimestampMillis(a.data().completedAt)
          )
          .slice(0, 20)
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              uid: String(d.uid),
              lessonId: String(d.lessonId),
              titleVi: String(d.titleVi),
              titleEn: String(d.titleEn),
              cefr: d.cefr as CefrLevel,
              skillVi: String(d.skillVi),
              durationMinutes: Number(d.durationMinutes),
              scorePercent: Number(d.scorePercent),
              routeTarget: d.routeTarget,
              completedAtLabel: formatTimestampVi(d.completedAt),
            };
          });
        onData(items);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, colPath);
        } catch (wrapped) {
          onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    );
  },

  async saveCompletedLesson(
    uid: string,
    lesson: Omit<CompletedLessonRecord, "id" | "uid" | "completedAtLabel">
  ): Promise<void> {
    const safeLessonId = clampString(lesson.lessonId, 64);
    const docPath = `${FIRESTORE_COLLECTIONS.completedLessons(uid)}/${safeLessonId}`;
    const docRef = doc(db, FIRESTORE_COLLECTIONS.completedLessons(uid), safeLessonId);
    const safeDuration = Math.max(1, Math.min(300, Math.round(lesson.durationMinutes)));
    const safeScore = Math.max(0, Math.min(100, Math.round(lesson.scorePercent)));

    try {
      const existingSnap = await getDoc(docRef);
      if (existingSnap.exists()) {
        await updateDoc(docRef, {
          durationMinutes: safeDuration,
          scorePercent: safeScore,
          completedAt: serverTimestamp(),
        });
      } else {
        await setDoc(docRef, {
          uid,
          lessonId: safeLessonId,
          titleVi: clampString(lesson.titleVi, 200) || safeLessonId,
          titleEn: clampString(lesson.titleEn, 200) || safeLessonId,
          cefr: lesson.cefr,
          skillVi: clampString(lesson.skillVi, 80) || "Luyện tập",
          durationMinutes: safeDuration,
          scorePercent: safeScore,
          routeTarget: clampString(lesson.routeTarget, 40) || "dashboard",
          completedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  },

  subscribeSpeakingHistory(
    uid: string,
    onData: (history: SpeakingHistoryRecord[]) => void,
    onError: (err: Error) => void
  ): Unsubscribe {
    const colPath = FIRESTORE_COLLECTIONS.speakingHistory(uid);
    const q = query(collection(db, colPath), where("uid", "==", uid));

    return onSnapshot(
      q,
      (snapshot) => {
        const items: SpeakingHistoryRecord[] = [...snapshot.docs]
          .sort(
            (a, b) =>
              getTimestampMillis(b.data().createdAt) -
              getTimestampMillis(a.data().createdAt)
          )
          .slice(0, 20)
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              uid: String(d.uid),
              scenarioId: String(d.scenarioId),
              scenarioTitleVi: String(d.scenarioTitleVi),
              cefr: d.cefr as CefrLevel,
              promptEn: String(d.promptEn),
              learnerTranscript: String(d.learnerTranscript),
              naturalRewrite: String(d.naturalRewrite ?? ""),
              grammarNotesVi: String(d.grammarNotesVi ?? ""),
              pronunciationFocusVi: String(d.pronunciationFocusVi ?? ""),
              source: d.source === "gemini-server" ? "gemini-server" : "self-practice",
              createdAtLabel: formatTimestampVi(d.createdAt),
            };
          });
        onData(items);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, colPath);
        } catch (wrapped) {
          onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    );
  },

  async saveSpeakingHistoryItem(
    uid: string,
    payload: Omit<SpeakingHistoryRecord, "id" | "uid" | "createdAtLabel">,
    currentProfile: UserProfile
  ): Promise<void> {
    const colPath = FIRESTORE_COLLECTIONS.speakingHistory(uid);

    try {
      await addDoc(collection(db, colPath), {
        uid,
        scenarioId: clampString(payload.scenarioId, 64),
        scenarioTitleVi: clampString(payload.scenarioTitleVi, 200),
        cefr: payload.cefr,
        promptEn: clampString(payload.promptEn, 500),
        learnerTranscript: clampString(payload.learnerTranscript, 2000),
        naturalRewrite: clampString(payload.naturalRewrite, 2000),
        grammarNotesVi: clampString(payload.grammarNotesVi, 2000),
        pronunciationFocusVi: clampString(payload.pronunciationFocusVi, 2000),
        source: payload.source,
        createdAt: serverTimestamp(),
      });

      const nextSkills = sanitizeSkillScores(currentProfile.skillScores, {
        Speaking: Math.min(100, Math.round(currentProfile.skillScores?.Speaking ?? 45) + 2),
      });
      const userRef = doc(db, FIRESTORE_COLLECTIONS.users, uid);
      await updateDoc(userRef, {
        skillScores: nextSkills,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, colPath);
    }
  },

  subscribeTestResults(
    uid: string,
    onData: (results: TestResultRecord[]) => void,
    onError: (err: Error) => void
  ): Unsubscribe {
    const colPath = FIRESTORE_COLLECTIONS.testResults(uid);
    const q = query(collection(db, colPath), where("uid", "==", uid));

    return onSnapshot(
      q,
      (snapshot) => {
        const items: TestResultRecord[] = [...snapshot.docs]
          .sort(
            (a, b) =>
              getTimestampMillis(b.data().createdAt) -
              getTimestampMillis(a.data().createdAt)
          )
          .slice(0, 20)
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              uid: String(d.uid),
              exerciseId: String(d.exerciseId),
              titleVi: String(d.titleVi),
              cefr: d.cefr as CefrLevel,
              category: String(d.category),
              completedItems: Number(d.completedItems),
              totalItems: Number(d.totalItems),
              scorePercent: Number(d.scorePercent),
              createdAtLabel: formatTimestampVi(d.createdAt),
            };
          });
        onData(items);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, colPath);
        } catch (wrapped) {
          onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    );
  },

  async saveTestResult(
    uid: string,
    payload: Omit<TestResultRecord, "id" | "uid" | "createdAtLabel">,
    currentProfile: UserProfile
  ): Promise<void> {
    const colPath = FIRESTORE_COLLECTIONS.testResults(uid);

    try {
      await addDoc(collection(db, colPath), {
        uid,
        exerciseId: clampString(payload.exerciseId, 64),
        titleVi: clampString(payload.titleVi, 200),
        cefr: payload.cefr,
        category: clampString(payload.category, 60),
        completedItems: Math.max(0, Math.min(200, Math.round(payload.completedItems))),
        totalItems: Math.max(1, Math.min(200, Math.round(payload.totalItems))),
        scorePercent: Math.max(0, Math.min(100, Math.round(payload.scorePercent))),
        createdAt: serverTimestamp(),
      });

      const nextSkills = sanitizeSkillScores(currentProfile.skillScores, {
        Pronunciation: Math.min(
          100,
          Math.max(
            Math.round(currentProfile.skillScores?.Pronunciation ?? 42),
            Math.round(payload.scorePercent)
          )
        ),
      });

      const userRef = doc(db, FIRESTORE_COLLECTIONS.users, uid);
      await updateDoc(userRef, {
        skillScores: nextSkills,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, colPath);
    }
  },

  subscribeCatalogVocabulary(
    onData: (items: CatalogVocabularyItem[]) => void,
    onError: (err: Error) => void
  ): Unsubscribe {
    const colPath = FIRESTORE_COLLECTIONS.vocabulary;
    const q = query(collection(db, colPath), where("level", "in", CEFR_LEVELS_LIST));

    return onSnapshot(
      q,
      (snapshot) => {
        const items: CatalogVocabularyItem[] = snapshot.docs
          .map((docSnap) => docSnap.data() as CatalogVocabularyItem)
          .sort(
            (a, b) =>
              (CEFR_ORDER[a.level] ?? 99) - (CEFR_ORDER[b.level] ?? 99) ||
              a.id.localeCompare(b.id)
          );
        onData(items);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, colPath);
        } catch (wrapped) {
          onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    );
  },

  subscribeCatalogScenarios(
    onData: (items: CatalogConversationScenario[]) => void,
    onError: (err: Error) => void
  ): Unsubscribe {
    const colPath = FIRESTORE_COLLECTIONS.conversationScenarios;
    const q = query(collection(db, colPath), where("level", "in", CEFR_LEVELS_LIST));

    return onSnapshot(
      q,
      (snapshot) => {
        const items: CatalogConversationScenario[] = snapshot.docs
          .map((docSnap) => docSnap.data() as CatalogConversationScenario)
          .sort(
            (a, b) =>
              (CEFR_ORDER[a.level] ?? 99) - (CEFR_ORDER[b.level] ?? 99) ||
              a.id.localeCompare(b.id)
          );
        onData(items);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, colPath);
        } catch (wrapped) {
          onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    );
  },

  subscribeCatalogSpeakingTasks(
    onData: (items: CatalogSpeakingTask[]) => void,
    onError: (err: Error) => void
  ): Unsubscribe {
    const colPath = FIRESTORE_COLLECTIONS.speakingTasks;
    const q = query(collection(db, colPath), where("level", "in", CEFR_LEVELS_LIST));

    return onSnapshot(
      q,
      (snapshot) => {
        const items: CatalogSpeakingTask[] = snapshot.docs
          .map((docSnap) => docSnap.data() as CatalogSpeakingTask)
          .sort(
            (a, b) =>
              (CEFR_ORDER[a.level] ?? 99) - (CEFR_ORDER[b.level] ?? 99) ||
              a.id.localeCompare(b.id)
          );
        onData(items);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, colPath);
        } catch (wrapped) {
          onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    );
  },

  subscribeCompletedSpeakingTasks(
    uid: string,
    onData: (records: Record<string, CompletedSpeakingTaskRecord>) => void,
    onError: (err: Error) => void
  ): Unsubscribe {
    const colPath = FIRESTORE_COLLECTIONS.completedSpeakingTasks(uid);
    const q = query(collection(db, colPath), where("uid", "==", uid));

    return onSnapshot(
      q,
      (snapshot) => {
        const map: Record<string, CompletedSpeakingTaskRecord> = {};
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const taskId = String(d.taskId ?? docSnap.id);
          map[taskId] = {
            uid: String(d.uid),
            taskId,
            topic: String(d.topic ?? ""),
            level: d.level as CefrLevel,
            promptEn: String(d.promptEn ?? ""),
            checkedCriteria: Array.isArray(d.checkedCriteria)
              ? d.checkedCriteria.map(String)
              : [],
            completed: Boolean(d.completed),
            notes: String(d.notes ?? ""),
            updatedAtLabel: formatTimestampVi(d.updatedAt),
          };
        });
        onData(map);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, colPath);
        } catch (wrapped) {
          onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    );
  },

  async upsertCompletedSpeakingTask(
    uid: string,
    payload: {
      taskId: string;
      topic: string;
      level: CefrLevel;
      promptEn: string;
      checkedCriteria: string[];
      totalCriteriaCount: number;
      completed: boolean;
      notes: string;
    },
    currentProfile: UserProfile
  ): Promise<void> {
    const safeTaskId = clampString(payload.taskId, 64);
    const colPath = FIRESTORE_COLLECTIONS.completedSpeakingTasks(uid);
    const docPath = `${colPath}/${safeTaskId}`;
    const docRef = doc(db, colPath, safeTaskId);
    const safeCriteria = payload.checkedCriteria
      .map((item) => clampString(item, 300))
      .filter(Boolean)
      .slice(0, 15);

    try {
      await setDoc(docRef, {
        uid,
        taskId: safeTaskId,
        topic: clampString(payload.topic, 200) || "Speaking Task",
        level: payload.level,
        promptEn: clampString(payload.promptEn, 1000) || safeTaskId,
        checkedCriteria: safeCriteria,
        completed: Boolean(payload.completed),
        notes: payload.notes.trim().slice(0, 2000),
        updatedAt: serverTimestamp(),
      });

      if (payload.completed) {
        const totalCriteria = Math.max(1, payload.totalCriteriaCount);
        const computedScore =
          safeCriteria.length > 0
            ? Math.min(100, Math.round((safeCriteria.length / totalCriteria) * 100))
            : 100;

        await this.saveCompletedLesson(uid, {
          lessonId: safeTaskId,
          titleVi: clampString(payload.topic, 200) || "Nhiệm vụ luyện nói",
          titleEn: clampString(payload.promptEn, 200) || safeTaskId,
          cefr: payload.level,
          skillVi: "Bài tập nói CEFR",
          durationMinutes: 8,
          scorePercent: computedScore,
          routeTarget: "exercises",
        });

        const nextSkills = sanitizeSkillScores(currentProfile.skillScores, {
          Speaking: Math.min(
            100,
            Math.round(currentProfile.skillScores?.Speaking ?? 45) + 2
          ),
        });
        const userRef = doc(db, FIRESTORE_COLLECTIONS.users, uid);
        await updateDoc(userRef, {
          skillScores: nextSkills,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  },

  async verifyStarterDatasetCounts(): Promise<DatasetVerificationResult> {
    try {
      const [vocabSnap, scenariosSnap, tasksSnap] = await Promise.all([
        getDocsFromServer(
          query(
            collection(db, FIRESTORE_COLLECTIONS.vocabulary),
            where("level", "in", CEFR_LEVELS_LIST)
          )
        ),
        getDocsFromServer(
          query(
            collection(db, FIRESTORE_COLLECTIONS.conversationScenarios),
            where("level", "in", CEFR_LEVELS_LIST)
          )
        ),
        getDocsFromServer(
          query(
            collection(db, FIRESTORE_COLLECTIONS.speakingTasks),
            where("level", "in", CEFR_LEVELS_LIST)
          )
        ),
      ]);

      return {
        vocabularyCount: vocabSnap.size,
        scenariosCount: scenariosSnap.size,
        tasksCount: tasksSnap.size,
        verifiedAtLabel: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, FIRESTORE_COLLECTIONS.vocabulary);
    }
  },

  async importStarterDatasetFromClient(
    isVerifiedAdmin: boolean
  ): Promise<DatasetVerificationResult> {
    if (!isVerifiedAdmin) {
      throw new Error(
        `Chỉ tài khoản quản trị viên đã xác minh (${ADMIN_EMAIL}) hoặc script CLI có service account mới được phép ghi dữ liệu mẫu vào các collection dùng chung.`
      );
    }

    const response = await window.fetch(STARTER_DATASET_URL);
    if (!response.ok) {
      throw new Error(
        `Không thể tải tệp starter dataset từ máy chủ (HTTP ${response.status}).`
      );
    }

    const dataset = (await response.json()) as {
      vocabulary?: CatalogVocabularyItem[];
      conversation_scenarios?: CatalogConversationScenario[];
      speaking_tasks?: CatalogSpeakingTask[];
    };

    const vocabulary = Array.isArray(dataset.vocabulary) ? dataset.vocabulary : [];
    const scenarios = Array.isArray(dataset.conversation_scenarios)
      ? dataset.conversation_scenarios
      : [];
    const tasks = Array.isArray(dataset.speaking_tasks) ? dataset.speaking_tasks : [];

    if (vocabulary.length === 0 || scenarios.length === 0 || tasks.length === 0) {
      throw new Error("Tệp JSON starter dataset không có đủ 3 nhóm dữ liệu hợp lệ.");
    }

    const batch = writeBatch(db);
    for (const item of vocabulary) {
      batch.set(doc(db, FIRESTORE_COLLECTIONS.vocabulary, item.id), { ...item });
    }
    for (const item of scenarios) {
      batch.set(
        doc(db, FIRESTORE_COLLECTIONS.conversationScenarios, item.id),
        { ...item }
      );
    }
    for (const item of tasks) {
      batch.set(doc(db, FIRESTORE_COLLECTIONS.speakingTasks, item.id), { ...item });
    }

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, FIRESTORE_COLLECTIONS.vocabulary);
    }

    return this.verifyStarterDatasetCounts();
  },
};
