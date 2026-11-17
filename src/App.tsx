import { User } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "./components/AppShell";
import { ASSETS } from "./data/sampleData";
import { authService } from "./lib/firebase/authService";
import { ADMIN_EMAIL, testFirestoreConnection } from "./lib/firebase/config";
import { formatFirestoreErrorVi } from "./lib/firebase/errors";
import { firestoreService } from "./lib/firebase/firestoreService";
import { AiSpeakingPage, SpeakingLessonMeta } from "./pages/AiSpeakingPage";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ExercisesPage } from "./pages/ExercisesPage";
import { LandingPage } from "./pages/LandingPage";
import { ProfileSettingsPage } from "./pages/ProfileSettingsPage";
import { ProgressPage } from "./pages/ProgressPage";
import { ScenariosPage } from "./pages/ScenariosPage";
import { VocabularyPage } from "./pages/VocabularyPage";
import {
  AppRoute,
  CatalogConversationScenario,
  CatalogSpeakingTask,
  CatalogVocabularyItem,
  CefrLevel,
  CompletedLessonRecord,
  CompletedSpeakingTaskRecord,
  DatasetVerificationResult,
  SpeakingHistoryRecord,
  TestResultRecord,
  UserProfile,
  VocabularyBookmarkRecord,
} from "./types/learning";

const VALID_ROUTES: AppRoute[] = [
  "landing",
  "auth",
  "dashboard",
  "ai-speaking",
  "vocabulary",
  "scenarios",
  "exercises",
  "progress",
  "profile",
];

const ROUTE_TITLES: Record<AppRoute, string> = {
  landing: "Trang giới thiệu",
  auth: "Đăng nhập & Đăng ký",
  dashboard: "Bảng điều khiển học viên",
  "ai-speaking": "Phòng luyện nói AI",
  vocabulary: "Từ vựng theo CEFR",
  scenarios: "Tình huống hội thoại",
  exercises: "Bài tập nói & phát âm",
  progress: "Tiến độ học tập",
  profile: "Hồ sơ & Cài đặt",
};

const DEFAULT_GUEST_PROFILE: UserProfile = {
  uid: "guest-learner",
  fullName: "Học viên",
  email: "hocvien@tienganh.local",
  avatarUrl: ASSETS.studentAvatar,
  currentCefr: "B1",
  targetCefr: "B2",
  dailyGoalMinutes: 20,
  todayMinutes: 14,
  streakDays: 5,
  vocabularyLearnedCount: 36,
  preferredAccent: "US",
  speechRate: 1.0,
  showVietnameseHints: true,
  showIpaNotation: true,
  skillScores: {
    Speaking: 52,
    Listening: 58,
    Pronunciation: 48,
    Vocabulary: 55,
    Grammar: 50,
  },
  weeklyMinutes: {
    T2: 25,
    T3: 20,
    T4: 30,
    T5: 15,
    T6: 20,
    T7: 0,
    CN: 0,
  },
};

function getLocalItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const val = window.localStorage.getItem(key);
    return val ? (JSON.parse(val) as T) : fallback;
  } catch {
    return fallback;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function getTodayWeekdayKey(): "CN" | "T2" | "T3" | "T4" | "T5" | "T6" | "T7" {
  const day = new Date().getDay();
  const map: Array<"CN" | "T2" | "T3" | "T4" | "T5" | "T6" | "T7"> = [
    "CN", "T2", "T3", "T4", "T5", "T6", "T7"
  ];
  return map[day] ?? "T2";
}

function readRouteFromHash(): AppRoute {
  if (typeof window === "undefined") return "landing";
  const raw = window.location.hash.replace(/^#\/?/, "") as AppRoute;
  return VALID_ROUTES.includes(raw) ? raw : "landing";
}

function buildFallbackProfileFromAuth(firebaseUser: User): UserProfile {
  return {
    uid: firebaseUser.uid,
    fullName:
      firebaseUser.displayName ||
      firebaseUser.email?.split("@")[0] ||
      "Học viên",
    email: firebaseUser.email || "",
    avatarUrl: firebaseUser.photoURL || ASSETS.studentAvatar,
    currentCefr: "B1",
    targetCefr: "B2",
    dailyGoalMinutes: 20,
    todayMinutes: 0,
    streakDays: 1,
    vocabularyLearnedCount: 0,
    preferredAccent: "US",
    speechRate: 1.0,
    showVietnameseHints: true,
    showIpaNotation: true,
  };
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(readRouteFromHash);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authPromptMessage, setAuthPromptMessage] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const [guestProfile, setGuestProfile] = useState<UserProfile>(() =>
    getLocalItem("esa_guest_profile", DEFAULT_GUEST_PROFILE)
  );
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookmarksMap, setBookmarksMap] = useState<
    Record<string, VocabularyBookmarkRecord>
  >(() => getLocalItem("esa_guest_bookmarks", {}));
  const [completedLessons, setCompletedLessons] = useState<
    CompletedLessonRecord[]
  >(() => getLocalItem("esa_guest_lessons", []));
  const [speakingHistory, setSpeakingHistory] = useState<
    SpeakingHistoryRecord[]
  >(() => getLocalItem("esa_guest_speaking", []));
  const [testResults, setTestResults] = useState<TestResultRecord[]>(() =>
    getLocalItem("esa_guest_tests", [])
  );
  const [catalogVocabulary, setCatalogVocabulary] = useState<CatalogVocabularyItem[]>([]);
  const [catalogScenarios, setCatalogScenarios] = useState<
    CatalogConversationScenario[]
  >([]);
  const [catalogSpeakingTasks, setCatalogSpeakingTasks] = useState<
    CatalogSpeakingTask[]
  >([]);
  const [completedSpeakingTasksMap, setCompletedSpeakingTasksMap] = useState<
    Record<string, CompletedSpeakingTaskRecord>
  >(() => getLocalItem("esa_guest_tasks", {}));
  const [datasetVerification, setDatasetVerification] =
    useState<DatasetVerificationResult | null>(null);
  const [importingDataset, setImportingDataset] = useState(false);
  const [verifyingDataset, setVerifyingDataset] = useState(false);
  const [loadingFirestore, setLoadingFirestore] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  const [selectedScenarioId, setSelectedScenarioId] =
    useState<string>("sc-meeting-b1");
  const [selectedCatalogScenario, setSelectedCatalogScenario] =
    useState<CatalogConversationScenario | null>(null);
  const [scenarioRequestedAt, setScenarioRequestedAt] = useState<number>(0);

  useEffect(() => {
    void testFirestoreConnection();
  }, []);

  // Preload starter dataset so the app is always fully functional without login
  useEffect(() => {
    let active = true;
    fetch("/assets/aistudio/english_speaking_ai_starter_dataset_a8275b28.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setCatalogVocabulary((prev) => (prev.length === 0 ? data.vocabulary ?? [] : prev));
        setCatalogScenarios((prev) => (prev.length === 0 ? data.conversation_scenarios ?? [] : prev));
        setCatalogSpeakingTasks((prev) => (prev.length === 0 ? data.speaking_tasks ?? [] : prev));
      })
      .catch((err) => console.warn("Lưu ý: Không thể nạp starter dataset:", err));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      setRoute(readRouteFromHash());
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Real Firebase Auth State Subscription
  useEffect(() => {
    const unsubscribe = authService.subscribeAuthState((firebaseUser) => {
      setAuthUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        setProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real Cloud Firestore Subscriptions scoped by authenticated uid
  useEffect(() => {
    if (!authUser) return;

    let active = true;
    setLoadingFirestore(true);
    setFirestoreError(null);

    const handleSyncError = (err: Error) => {
      if (!active) return;
      setFirestoreError(formatFirestoreErrorVi(err));
      setLoadingFirestore(false);
    };

    void firestoreService
      .ensureUserProfile(authUser)
      .then((initialProfile) => {
        if (active) {
          setProfile((prev) => prev ?? initialProfile);
        }
      })
      .catch((err) => {
        if (active) {
          setFirestoreError(formatFirestoreErrorVi(err));
        }
      });

    const unsubProfile = firestoreService.subscribeUserProfile(
      authUser.uid,
      (nextProfile) => {
        if (!active) return;
        if (nextProfile) {
          setProfile(nextProfile);
        }
        setLoadingFirestore(false);
      },
      handleSyncError
    );

    const unsubBookmarks = firestoreService.subscribeVocabularyBookmarks(
      authUser.uid,
      (map) => {
        if (active) setBookmarksMap(map);
      },
      handleSyncError
    );

    const unsubLessons = firestoreService.subscribeCompletedLessons(
      authUser.uid,
      (items) => {
        if (active) setCompletedLessons(items);
      },
      handleSyncError
    );

    const unsubSpeaking = firestoreService.subscribeSpeakingHistory(
      authUser.uid,
      (items) => {
        if (active) setSpeakingHistory(items);
      },
      handleSyncError
    );

    const unsubTests = firestoreService.subscribeTestResults(
      authUser.uid,
      (items) => {
        if (active) setTestResults(items);
      },
      handleSyncError
    );

    const unsubCatalogVocab = firestoreService.subscribeCatalogVocabulary(
      (items) => {
        if (active) setCatalogVocabulary(items);
      },
      handleSyncError
    );

    const unsubCatalogScenarios = firestoreService.subscribeCatalogScenarios(
      (items) => {
        if (active) setCatalogScenarios(items);
      },
      handleSyncError
    );

    const unsubCatalogTasks = firestoreService.subscribeCatalogSpeakingTasks(
      (items) => {
        if (active) setCatalogSpeakingTasks(items);
      },
      handleSyncError
    );

    const unsubCompletedTasks = firestoreService.subscribeCompletedSpeakingTasks(
      authUser.uid,
      (records) => {
        if (active) setCompletedSpeakingTasksMap(records);
      },
      handleSyncError
    );

    return () => {
      active = false;
      unsubProfile();
      unsubBookmarks();
      unsubLessons();
      unsubSpeaking();
      unsubTests();
      unsubCatalogVocab();
      unsubCatalogScenarios();
      unsubCatalogTasks();
      unsubCompletedTasks();
    };
  }, [authUser]);

  const navigate = (nextRoute: AppRoute) => {
    setAuthPromptMessage(null);
    setRoute(nextRoute);
    if (typeof window !== "undefined") {
      window.location.hash = nextRoute === "landing" ? "" : `#/${nextRoute}`;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // If user is already authenticated and visits /auth, smoothly redirect to dashboard
  useEffect(() => {
    if (!authReady) return;
    if (authUser && route === "auth") {
      setAuthPromptMessage(null);
      setRoute("dashboard");
      if (typeof window !== "undefined") {
        window.location.hash = "#/dashboard";
      }
    }
  }, [authReady, authUser, route]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      if (authUser) {
        await authService.logout();
      }
      setRoute("landing");
      if (typeof window !== "undefined") {
        window.location.hash = "";
      }
    } finally {
      setLoggingOut(false);
    }
  };

  const isVerifiedAdmin = Boolean(
    authUser?.emailVerified && authUser.email === ADMIN_EMAIL
  );

  const mergedCatalogVocabulary: CatalogVocabularyItem[] = useMemo(() => {
    return catalogVocabulary.map((item) => {
      const saved = bookmarksMap[item.id];
      return {
        ...item,
        mastered: saved ? saved.mastered : false,
        bookmarked: saved ? saved.bookmarked : false,
      };
    });
  }, [catalogVocabulary, bookmarksMap]);

  const activeProfile: UserProfile = useMemo(() => {
    if (authUser && profile) return profile;
    if (authUser) return buildFallbackProfileFromAuth(authUser);
    return guestProfile;
  }, [authUser, profile, guestProfile]);

  const handleUpdateGuestProfile = (updated: UserProfile) => {
    setGuestProfile(updated);
    setLocalItem("esa_guest_profile", updated);
  };

  const handleAddStudyMinutes = async (minutes: number) => {
    setFirestoreError(null);
    if (authUser && profile) {
      try {
        await firestoreService.recordStudyMinutes(authUser.uid, activeProfile, minutes);
      } catch (err) {
        setFirestoreError(formatFirestoreErrorVi(err));
      }
    } else {
      setGuestProfile((prev) => {
        const todayKey = getTodayWeekdayKey();
        const prevWeekly = prev.weeklyMinutes ?? {
          T2: 0, T3: 0, T4: 0, T5: 0, T6: 0, T7: 0, CN: 0
        };
        const nextWeekly = {
          ...prevWeekly,
          [todayKey]: Math.min(1440, (prevWeekly[todayKey] ?? 0) + minutes),
        };
        const updated: UserProfile = {
          ...prev,
          todayMinutes: Math.min(1440, prev.todayMinutes + minutes),
          weeklyMinutes: nextWeekly,
        };
        setLocalItem("esa_guest_profile", updated);
        return updated;
      });
    }
  };

  const handleToggleVocabularyMastered = async (wordId: string) => {
    const item = mergedCatalogVocabulary.find((v) => v.id === wordId);
    if (!item) return;
    const nextMastered = !item.mastered;
    const nextMasteredCount = mergedCatalogVocabulary.reduce(
      (count, v) =>
        count + (v.id === wordId ? (nextMastered ? 1 : 0) : v.mastered ? 1 : 0),
      0
    );

    const updatedMap: Record<string, VocabularyBookmarkRecord> = {
      ...bookmarksMap,
      [wordId]: {
        uid: authUser?.uid ?? "guest-learner",
        wordId: item.id,
        word: item.word,
        cefr: item.level,
        mastered: nextMastered,
        bookmarked: Boolean(item.bookmarked),
      },
    };
    setBookmarksMap(updatedMap);
    if (!authUser) {
      setLocalItem("esa_guest_bookmarks", updatedMap);
      setGuestProfile((prev) => {
        const updated = { ...prev, vocabularyLearnedCount: nextMasteredCount };
        setLocalItem("esa_guest_profile", updated);
        return updated;
      });
    }

    if (authUser) {
      setFirestoreError(null);
      try {
        await firestoreService.upsertVocabularyBookmark(
          authUser.uid,
          {
            wordId: item.id,
            word: item.word,
            cefr: item.level,
            mastered: nextMastered,
            bookmarked: Boolean(item.bookmarked),
          },
          nextMasteredCount
        );
      } catch (err) {
        setFirestoreError(formatFirestoreErrorVi(err));
      }
    }
  };

  const handleToggleVocabularyBookmarked = async (wordId: string) => {
    const item = mergedCatalogVocabulary.find((v) => v.id === wordId);
    if (!item) return;
    const nextBookmarked = !item.bookmarked;
    const currentMasteredCount = mergedCatalogVocabulary.filter((v) => v.mastered).length;

    const updatedMap: Record<string, VocabularyBookmarkRecord> = {
      ...bookmarksMap,
      [wordId]: {
        uid: authUser?.uid ?? "guest-learner",
        wordId: item.id,
        word: item.word,
        cefr: item.level,
        mastered: Boolean(item.mastered),
        bookmarked: nextBookmarked,
      },
    };
    setBookmarksMap(updatedMap);
    if (!authUser) {
      setLocalItem("esa_guest_bookmarks", updatedMap);
    }

    if (authUser) {
      setFirestoreError(null);
      try {
        await firestoreService.upsertVocabularyBookmark(
          authUser.uid,
          {
            wordId: item.id,
            word: item.word,
            cefr: item.level,
            mastered: Boolean(item.mastered),
            bookmarked: nextBookmarked,
          },
          currentMasteredCount
        );
      } catch (err) {
        setFirestoreError(formatFirestoreErrorVi(err));
      }
    }
  };

  const handleVerifyStarterDataset = async (): Promise<DatasetVerificationResult | null> => {
    setVerifyingDataset(true);
    setFirestoreError(null);
    try {
      const result = await firestoreService.verifyStarterDatasetCounts();
      setDatasetVerification(result);
      return result;
    } catch (err) {
      setFirestoreError(formatFirestoreErrorVi(err));
      return null;
    } finally {
      setVerifyingDataset(false);
    }
  };

  const handleImportStarterDataset = async (): Promise<DatasetVerificationResult | null> => {
    setImportingDataset(true);
    setFirestoreError(null);
    try {
      const result = await firestoreService.importStarterDatasetFromClient(
        isVerifiedAdmin
      );
      setDatasetVerification(result);
      return result;
    } catch (err) {
      setFirestoreError(formatFirestoreErrorVi(err));
      return null;
    } finally {
      setImportingDataset(false);
    }
  };

  const handleSaveSpeakingTaskProgress = async (payload: {
    taskId: string;
    topic: string;
    level: CefrLevel;
    promptEn: string;
    checkedCriteria: string[];
    totalCriteriaCount: number;
    completed: boolean;
    notes: string;
  }) => {
    const record: CompletedSpeakingTaskRecord = {
      uid: authUser?.uid ?? "guest-learner",
      taskId: payload.taskId,
      topic: payload.topic,
      level: payload.level,
      promptEn: payload.promptEn,
      checkedCriteria: payload.checkedCriteria,
      completed: payload.completed,
      notes: payload.notes,
      updatedAtLabel: "Vừa xong",
    };
    const nextMap = {
      ...completedSpeakingTasksMap,
      [payload.taskId]: record,
    };
    setCompletedSpeakingTasksMap(nextMap);
    if (!authUser) {
      setLocalItem("esa_guest_tasks", nextMap);
    }

    if (authUser && activeProfile) {
      setFirestoreError(null);
      try {
        await firestoreService.upsertCompletedSpeakingTask(
          authUser.uid,
          payload,
          activeProfile
        );
      } catch (err) {
        setFirestoreError(formatFirestoreErrorVi(err));
      }
    }
  };

  const handleSaveSpeakingSession = async (
    payload: Omit<SpeakingHistoryRecord, "id" | "uid" | "createdAtLabel">,
    lessonMeta: SpeakingLessonMeta
  ) => {
    const record: SpeakingHistoryRecord = {
      id: `local-speaking-${Date.now()}`,
      uid: authUser?.uid ?? "guest-learner",
      scenarioId: payload.scenarioId,
      scenarioTitleVi: payload.scenarioTitleVi,
      cefr: payload.cefr,
      promptEn: payload.promptEn,
      learnerTranscript: payload.learnerTranscript,
      naturalRewrite: payload.naturalRewrite,
      grammarNotesVi: payload.grammarNotesVi,
      pronunciationFocusVi: payload.pronunciationFocusVi,
      source: "gemini-server",
      createdAtLabel: "Vừa xong",
    };
    const nextHistory = [record, ...speakingHistory];
    setSpeakingHistory(nextHistory);

    const lessonRecord: CompletedLessonRecord = {
      id: `local-lesson-${Date.now()}`,
      uid: authUser?.uid ?? "guest-learner",
      lessonId: lessonMeta.id,
      titleVi: lessonMeta.titleVi,
      titleEn: lessonMeta.titleEn,
      cefr: lessonMeta.cefr,
      skillVi: "Hội thoại AI",
      durationMinutes: lessonMeta.durationMinutes,
      scorePercent: 100,
      routeTarget: "ai-speaking",
      completedAtLabel: "Vừa xong",
    };
    const nextLessons = [lessonRecord, ...completedLessons];
    setCompletedLessons(nextLessons);

    if (!authUser) {
      setLocalItem("esa_guest_speaking", nextHistory);
      setLocalItem("esa_guest_lessons", nextLessons);
      void handleAddStudyMinutes(5);
    }

    if (authUser && activeProfile) {
      setFirestoreError(null);
      try {
        await firestoreService.saveSpeakingHistoryItem(
          authUser.uid,
          payload,
          activeProfile
        );
        await firestoreService.saveCompletedLesson(authUser.uid, {
          lessonId: lessonMeta.id,
          titleVi: lessonMeta.titleVi,
          titleEn: lessonMeta.titleEn,
          cefr: lessonMeta.cefr,
          skillVi: "Hội thoại AI",
          durationMinutes: lessonMeta.durationMinutes,
          scorePercent: 100,
          routeTarget: "ai-speaking",
        });
        await firestoreService.recordStudyMinutes(authUser.uid, activeProfile, 5);
      } catch (err) {
        setFirestoreError(formatFirestoreErrorVi(err));
      }
    }
  };

  const handleSaveExerciseResult = async (
    payload: Omit<TestResultRecord, "id" | "uid" | "createdAtLabel">
  ) => {
    const record: TestResultRecord = {
      id: `local-test-${Date.now()}`,
      uid: authUser?.uid ?? "guest-learner",
      exerciseId: payload.exerciseId,
      titleVi: payload.titleVi,
      cefr: payload.cefr,
      category: payload.category,
      completedItems: payload.completedItems,
      totalItems: payload.totalItems,
      scorePercent: payload.scorePercent,
      createdAtLabel: "Vừa xong",
    };
    const nextList = [record, ...testResults];
    setTestResults(nextList);

    const lessonRecord: CompletedLessonRecord = {
      id: `local-exercise-${Date.now()}`,
      uid: authUser?.uid ?? "guest-learner",
      lessonId: payload.exerciseId,
      titleVi: payload.titleVi,
      titleEn: payload.category,
      cefr: payload.cefr,
      skillVi: "Phát âm",
      durationMinutes: 8,
      scorePercent: payload.scorePercent,
      routeTarget: "exercises",
      completedAtLabel: "Vừa xong",
    };
    const nextLessons = [lessonRecord, ...completedLessons];
    setCompletedLessons(nextLessons);

    if (!authUser) {
      setLocalItem("esa_guest_tests", nextList);
      setLocalItem("esa_guest_lessons", nextLessons);
      void handleAddStudyMinutes(8);
    }

    if (authUser && activeProfile) {
      setFirestoreError(null);
      try {
        await firestoreService.saveTestResult(authUser.uid, payload, activeProfile);
        await firestoreService.saveCompletedLesson(authUser.uid, {
          lessonId: payload.exerciseId,
          titleVi: payload.titleVi,
          titleEn: payload.category,
          cefr: payload.cefr,
          skillVi: "Phát âm",
          durationMinutes: 8,
          scorePercent: payload.scorePercent,
          routeTarget: "exercises",
        });
      } catch (err) {
        setFirestoreError(formatFirestoreErrorVi(err));
      }
    }
  };

  if (!authReady) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F5F8FC] px-4 text-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#0F294A]" aria-hidden="true" />
        <p className="font-display text-sm font-semibold text-[#0F294A]">
          Đang khởi tạo nền tảng học tiếng Anh...
        </p>
      </div>
    );
  }

  if (route === "landing") {
    return (
      <LandingPage
        isAuthenticated={true}
        onNavigate={navigate}
        onSelectScenario={(scenarioId) => {
          setSelectedCatalogScenario(null);
          setSelectedScenarioId(scenarioId);
          setScenarioRequestedAt(Date.now());
        }}
      />
    );
  }

  if (route === "auth") {
    return (
      <AuthPage
        onNavigate={navigate}
        authPromptMessage={authPromptMessage}
      />
    );
  }

  const effectiveRoute: AppRoute = route === "auth" ? "dashboard" : route;

  const authProviderLabel = authUser
    ? authUser.providerData[0]?.providerId === "google.com"
      ? "Google Sign-In"
      : "Email / Mật khẩu"
    : "Chế độ dùng trực tiếp (Khách)";

  return (
    <AppShell
      activeRoute={effectiveRoute}
      onNavigate={navigate}
      onLogout={handleLogout}
      loggingOut={loggingOut}
      user={activeProfile}
      pageTitle={ROUTE_TITLES[effectiveRoute]}
    >
      {firestoreError && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-800"
        >
          {firestoreError}
        </div>
      )}

      {effectiveRoute === "dashboard" && (
        <DashboardPage
          user={activeProfile}
          completedLessons={completedLessons}
          loadingData={loadingFirestore}
          onNavigate={navigate}
          onAddStudyMinutes={handleAddStudyMinutes}
          onSelectScenario={(scenarioId) => {
            setSelectedCatalogScenario(null);
            setSelectedScenarioId(scenarioId);
          }}
        />
      )}

      {effectiveRoute === "ai-speaking" && (
        <AiSpeakingPage
          user={activeProfile}
          selectedScenarioId={selectedScenarioId}
          selectedCatalogScenario={selectedCatalogScenario}
          scenarioRequestedAt={scenarioRequestedAt}
          speakingHistory={speakingHistory}
          onSaveSpeakingSession={handleSaveSpeakingSession}
        />
      )}

      {effectiveRoute === "vocabulary" && (
        <VocabularyPage
          user={activeProfile}
          vocabulary={mergedCatalogVocabulary}
          loadingData={loadingFirestore}
          isAdmin={isVerifiedAdmin}
          importingDataset={importingDataset}
          onImportDataset={handleImportStarterDataset}
          onToggleMastered={handleToggleVocabularyMastered}
          onToggleBookmarked={handleToggleVocabularyBookmarked}
        />
      )}

      {effectiveRoute === "scenarios" && (
        <ScenariosPage
          user={activeProfile}
          scenarios={catalogScenarios}
          loadingData={loadingFirestore}
          isAdmin={isVerifiedAdmin}
          importingDataset={importingDataset}
          onImportDataset={handleImportStarterDataset}
          onStartScenarioInStudio={(scenario) => {
            setSelectedCatalogScenario(scenario);
            setSelectedScenarioId(scenario.id);
            setScenarioRequestedAt(Date.now());
            navigate("ai-speaking");
          }}
        />
      )}

      {effectiveRoute === "exercises" && (
        <ExercisesPage
          user={activeProfile}
          speakingTasks={catalogSpeakingTasks}
          completedTasksMap={completedSpeakingTasksMap}
          loadingData={loadingFirestore}
          isAdmin={isVerifiedAdmin}
          importingDataset={importingDataset}
          onImportDataset={handleImportStarterDataset}
          onSaveSpeakingTask={handleSaveSpeakingTaskProgress}
          onSaveExerciseResult={handleSaveExerciseResult}
        />
      )}

      {effectiveRoute === "progress" && (
        <ProgressPage
          user={activeProfile}
          completedLessons={completedLessons}
          testResults={testResults}
          speakingHistory={speakingHistory}
          loadingData={loadingFirestore}
        />
      )}

      {effectiveRoute === "profile" && (
        <ProfileSettingsPage
          user={activeProfile}
          authProviderLabel={authProviderLabel}
          isAdmin={isVerifiedAdmin}
          catalogCounts={{
            vocabulary: catalogVocabulary.length,
            scenarios: catalogScenarios.length,
            tasks: catalogSpeakingTasks.length,
          }}
          datasetVerification={datasetVerification}
          importingDataset={importingDataset}
          verifyingDataset={verifyingDataset}
          onVerifyDataset={handleVerifyStarterDataset}
          onImportDataset={handleImportStarterDataset}
          onLogout={handleLogout}
          loggingOut={loggingOut}
          onUpdateProfile={handleUpdateGuestProfile}
        />
      )}
    </AppShell>
  );
}
