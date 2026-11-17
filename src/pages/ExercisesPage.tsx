import {
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Mic,
  MicOff,
  Save,
  Search,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CatalogEmptyState } from "../components/CatalogEmptyState";
import { CefrFilterBar } from "../components/CefrFilterBar";
import { SPEAKING_EXERCISES } from "../data/sampleData";
import {
  isSpeechRecognitionSupported,
  speakEnglishText,
  SpeechRecognitionController,
  startBrowserSpeechRecognition,
} from "../lib/speech";
import {
  CatalogSpeakingTask,
  CefrLevel,
  CompletedSpeakingTaskRecord,
  DatasetVerificationResult,
  SpeakingExercise,
  TestResultRecord,
  UserProfile,
} from "../types/learning";

interface ExercisesPageProps {
  user: UserProfile;
  speakingTasks: CatalogSpeakingTask[];
  completedTasksMap: Record<string, CompletedSpeakingTaskRecord>;
  loadingData: boolean;
  isAdmin: boolean;
  importingDataset: boolean;
  onImportDataset: () => Promise<DatasetVerificationResult | null>;
  onSaveSpeakingTask: (payload: {
    taskId: string;
    topic: string;
    level: CefrLevel;
    promptEn: string;
    checkedCriteria: string[];
    totalCriteriaCount: number;
    completed: boolean;
    notes: string;
  }) => Promise<void>;
  onSaveExerciseResult: (
    payload: Omit<TestResultRecord, "id" | "uid" | "createdAtLabel">
  ) => Promise<void>;
}

const GROUPS: Array<{ key: "ALL" | SpeakingExercise["group"]; label: string }> = [
  { key: "ALL", label: "Tất cả bài tập" },
  { key: "âm-cuối", label: "Âm cuối & Phụ âm" },
  { key: "trọng-âm", label: "Trọng âm từ" },
  { key: "shadowing", label: "Đọc đuổi (Shadowing)" },
];

export function ExercisesPage({
  user,
  speakingTasks,
  completedTasksMap,
  loadingData,
  isAdmin,
  importingDataset,
  onImportDataset,
  onSaveSpeakingTask,
  onSaveExerciseResult,
}: ExercisesPageProps) {
  const [activeTab, setActiveTab] = useState<"tasks" | "pronunciation">("tasks");

  // Firestore speaking_tasks state
  const [cefrFilter, setCefrFilter] = useState<"ALL" | CefrLevel>("ALL");
  const [topicFilter, setTopicFilter] = useState<string>("Tất cả");
  const [query, setQuery] = useState("");
  const [draftCriteriaByTask, setDraftCriteriaByTask] = useState<
    Record<string, string[]>
  >({});
  const [draftNotesByTask, setDraftNotesByTask] = useState<Record<string, string>>({});
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [taskNotice, setTaskNotice] = useState<string | null>(null);
  const [listeningTaskId, setListeningTaskId] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionController | null>(null);
  const speechRecognitionSupported = useMemo(() => isSpeechRecognitionSupported(), []);

  // Pronunciation drills state (preserved)
  const [groupFilter, setGroupFilter] =
    useState<"ALL" | SpeakingExercise["group"]>("ALL");
  const [completedItemIds, setCompletedItemIds] = useState<Record<string, boolean>>({});
  const [practicingId, setPracticingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const availableTopics = useMemo(() => {
    const unique = Array.from(new Set(speakingTasks.map((t) => t.topic))).sort((a, b) =>
      a.localeCompare(b)
    );
    return ["Tất cả", ...unique];
  }, [speakingTasks]);

  useEffect(() => {
    if (topicFilter !== "Tất cả" && !availableTopics.includes(topicFilter)) {
      setTopicFilter("Tất cả");
    }
  }, [availableTopics, topicFilter]);

  const filteredTasks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return speakingTasks.filter((task) => {
      const matchCefr = cefrFilter === "ALL" || task.level === cefrFilter;
      const matchTopic = topicFilter === "Tất cả" || task.topic === topicFilter;
      const matchQuery =
        !normalized ||
        task.topic.toLowerCase().includes(normalized) ||
        task.prompt_en.toLowerCase().includes(normalized) ||
        task.prompt_vi.toLowerCase().includes(normalized) ||
        task.id.toLowerCase().includes(normalized);
      return matchCefr && matchTopic && matchQuery;
    });
  }, [speakingTasks, cefrFilter, topicFilter, query]);

  const completedTasksCount = useMemo(
    () =>
      speakingTasks.filter((task) => completedTasksMap[task.id]?.completed).length,
    [speakingTasks, completedTasksMap]
  );

  const tasksCompletionPct = Math.round(
    (completedTasksCount / Math.max(1, speakingTasks.length)) * 100
  );

  const getTaskCriteria = (taskId: string): string[] => {
    if (taskId in draftCriteriaByTask) {
      return draftCriteriaByTask[taskId];
    }
    return completedTasksMap[taskId]?.checkedCriteria ?? [];
  };

  const getTaskNotes = (taskId: string): string => {
    if (taskId in draftNotesByTask) {
      return draftNotesByTask[taskId];
    }
    return completedTasksMap[taskId]?.notes ?? "";
  };

  const toggleTaskCriterion = (taskId: string, criterion: string) => {
    const current = getTaskCriteria(taskId);
    const exists = current.includes(criterion);
    const next = exists
      ? current.filter((item) => item !== criterion)
      : [...current, criterion];
    setDraftCriteriaByTask((prev) => ({ ...prev, [taskId]: next }));
  };

  const handleToggleDictation = (taskId: string) => {
    setMicError(null);
    if (!speechRecognitionSupported) {
      setMicError(
        "Trình duyệt hiện tại không hỗ trợ nhận diện giọng nói. Bạn có thể ghi chú trực tiếp vào ô văn bản."
      );
      return;
    }

    if (listeningTaskId === taskId) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setListeningTaskId(null);
      return;
    }

    recognitionRef.current?.stop();
    setListeningTaskId(taskId);
    const controller = startBrowserSpeechRecognition({
      accent: user.preferredAccent,
      onInterim: () => undefined,
      onFinal: (chunk) => {
        setDraftNotesByTask((prev) => {
          const base = prev[taskId] ?? completedTasksMap[taskId]?.notes ?? "";
          return {
            ...prev,
            [taskId]: base.trim() ? `${base.trim()} ${chunk}` : chunk,
          };
        });
      },
      onError: (errVi) => {
        setMicError(errVi);
        setListeningTaskId(null);
      },
      onEnd: () => {
        setListeningTaskId(null);
        recognitionRef.current = null;
      },
    });
    if (!controller) {
      setListeningTaskId(null);
    } else {
      recognitionRef.current = controller;
    }
  };

  const handlePersistSpeakingTask = async (
    task: CatalogSpeakingTask,
    markCompleted: boolean
  ) => {
    setSavingTaskId(task.id);
    setTaskNotice(null);
    try {
      const criteria = getTaskCriteria(task.id);
      const notes = getTaskNotes(task.id);
      await onSaveSpeakingTask({
        taskId: task.id,
        topic: task.topic,
        level: task.level,
        promptEn: task.prompt_en,
        checkedCriteria: criteria,
        totalCriteriaCount: task.self_assessment.length,
        completed: markCompleted,
        notes,
      });
      setTaskNotice(
        markCompleted
          ? `Đã đánh dấu hoàn thành nhiệm vụ "${task.topic}" (CEFR ${task.level}) lên Cloud Firestore.`
          : `Đã lưu tiến độ và ghi chú cho nhiệm vụ "${task.topic}" lên Cloud Firestore.`
      );
    } finally {
      setSavingTaskId(null);
    }
  };

  // Pronunciation drill helpers
  const filteredDrills = useMemo(() => {
    if (groupFilter === "ALL") return SPEAKING_EXERCISES;
    return SPEAKING_EXERCISES.filter((ex) => ex.group === groupFilter);
  }, [groupFilter]);

  const totalItems = useMemo(
    () => SPEAKING_EXERCISES.reduce((sum, ex) => sum + ex.practiceItems.length, 0),
    []
  );
  const completedCount = Object.values(completedItemIds).filter(Boolean).length;
  const completionPct = Math.round((completedCount / Math.max(1, totalItems)) * 100);

  const toggleCompleted = (id: string) => {
    setCompletedItemIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveExercise = async (exercise: SpeakingExercise) => {
    const doneInExercise = exercise.practiceItems.filter(
      (item) => completedItemIds[item.id]
    ).length;
    const totalInExercise = exercise.practiceItems.length;
    const scorePercent =
      doneInExercise > 0
        ? Math.round((doneInExercise / totalInExercise) * 100)
        : 75;

    setSavingId(exercise.id);
    setSavedNotice(null);
    try {
      await onSaveExerciseResult({
        exerciseId: exercise.id,
        titleVi: exercise.titleVi,
        cefr: exercise.cefr,
        category: exercise.targetSound,
        completedItems: doneInExercise > 0 ? doneInExercise : totalInExercise,
        totalItems: totalInExercise,
        scorePercent,
      });
      setSavedNotice(
        `Đã lưu kết quả bài tập "${exercise.titleVi}" (${scorePercent}%) vào Cloud Firestore.`
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Mode Switcher */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0B1F3A]">
            Bài tập nói & Luyện phát âm (CEFR A1–C2)
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Thực hành nhiệm vụ nói có hướng dẫn từ Cloud Firestore hoặc rèn phát âm chuyên sâu cho
            người Việt.
          </p>
        </div>

        <div className="inline-flex rounded-lg bg-slate-100 p-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`min-h-[38px] rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === "tasks"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Nhiệm vụ nói ({speakingTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pronunciation")}
            className={`min-h-[38px] rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === "pronunciation"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Luyện phát âm ({SPEAKING_EXERCISES.length})
          </button>
        </div>
      </div>

      {activeTab === "tasks" ? (
        <div className="space-y-6">
          {/* Filters + Progress */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1 lg:max-w-sm">
                <Search
                  className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm chủ đề hoặc đề bài nói..."
                  aria-label="Tìm kiếm nhiệm vụ nói"
                  className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
                />
              </div>

              <CefrFilterBar value={cefrFilter} onChange={setCefrFilter} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="tasks-topic-select" className="text-xs font-medium text-slate-600">
                  Chủ đề:
                </label>
                <select
                  id="tasks-topic-select"
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-[#1D4ED8] focus:outline-none"
                >
                  {availableTopics.map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </div>

              <span className="font-mono text-xs font-semibold text-[#0F294A] tabular-nums">
                Đã hoàn thành: {completedTasksCount}/{speakingTasks.length} nhiệm vụ (
                {tasksCompletionPct}%)
              </span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all"
                style={{ width: `${tasksCompletionPct}%` }}
              />
            </div>

            {taskNotice && (
              <div
                role="status"
                className="rounded-lg border border-sky-200 bg-[#F4F8FF] p-3 text-xs text-[#0F294A]"
              >
                {taskNotice}
              </div>
            )}

            {micError && (
              <div
                role="alert"
                className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
              >
                {micError}
              </div>
            )}
          </div>

          {loadingData && speakingTasks.length === 0 ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-10 text-sm text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin text-[#1D4ED8]" aria-hidden="true" />
              <span>Đang tải nhiệm vụ luyện nói từ Cloud Firestore...</span>
            </div>
          ) : speakingTasks.length === 0 ? (
            <CatalogEmptyState
              collectionName="speaking_tasks"
              titleVi="Chưa có nhiệm vụ luyện nói nào trong Firestore"
              descriptionVi="Các bài tập nói CEFR A1–C2 kèm câu hỏi gợi ý và bảng tự đánh giá sẽ hiển thị tại đây sau khi Starter Dataset được nhập vào collection speaking_tasks."
              isAdmin={isAdmin}
              importingDataset={importingDataset}
              onImportDataset={onImportDataset}
            />
          ) : filteredTasks.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
              <p className="text-sm font-medium text-slate-700">
                Không có nhiệm vụ luyện nói nào khớp bộ lọc hiện tại.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCefrFilter("ALL");
                  setTopicFilter("Tất cả");
                  setQuery("");
                }}
                className="mt-3 min-h-[38px] rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:from-blue-700 hover:to-indigo-700"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredTasks.map((task) => {
                const record = completedTasksMap[task.id];
                const isCompleted = Boolean(record?.completed);
                const checked = getTaskCriteria(task.id);
                const notes = getTaskNotes(task.id);
                const isSaving = savingTaskId === task.id;
                const isListening = listeningTaskId === task.id;

                return (
                  <section
                    key={task.id}
                    className={`rounded-xl border bg-white p-6 space-y-5 ${
                      isCompleted ? "border-emerald-300" : "border-slate-200"
                    }`}
                  >
                    <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-[#EFF6FF] px-2 py-0.5 font-mono text-xs font-semibold text-[#1D4ED8]">
                            CEFR {task.level}
                          </span>
                          <span className="font-mono text-xs text-slate-400">{task.id}</span>
                          {isCompleted && (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Đã hoàn thành</span>
                            </span>
                          )}
                        </div>
                        <h3 className="mt-1.5 font-display text-lg font-bold text-[#0B1F3A]">
                          {task.topic}
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            speakEnglishText(task.prompt_en, {
                              accent: user.preferredAccent,
                              rate: user.speechRate,
                            })
                          }
                          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#0F294A] hover:bg-slate-50"
                        >
                          <Volume2 className="h-3.5 w-3.5 text-[#1D4ED8]" aria-hidden="true" />
                          <span>Nghe đề bài</span>
                        </button>
                      </div>
                    </div>

                    {/* Prompt EN + VI */}
                    <div className="rounded-lg border border-sky-200 bg-[#F4F8FF] p-4 space-y-1.5">
                      <p className="font-display text-base font-semibold text-[#0B1F3A]">
                        {task.prompt_en}
                      </p>
                      <p className="text-sm text-slate-700">{task.prompt_vi}</p>
                    </div>

                    {/* Instructions & Guiding Questions */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold text-[#0B1F3A]">
                          Hướng dẫn thực hiện
                        </p>
                        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-slate-700">
                          {task.instructions_vi.map((inst, idx) => (
                            <li key={`${task.id}-inst-${idx}`}>{inst}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold text-[#0B1F3A]">
                          Câu hỏi gợi ý (Guiding Questions)
                        </p>
                        <ul className="mt-2 space-y-2 text-xs text-slate-700">
                          {task.guiding_questions.map((q, idx) => (
                            <li
                              key={`${task.id}-gq-${idx}`}
                              className="flex items-center justify-between gap-2"
                            >
                              <span>{q}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  speakEnglishText(q, {
                                    accent: user.preferredAccent,
                                    rate: user.speechRate,
                                  })
                                }
                                aria-label={`Nghe câu hỏi ${q}`}
                                className="shrink-0 rounded p-1 text-[#1D4ED8] hover:bg-[#F4F8FF]"
                              >
                                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Self-Assessment Checklist */}
                    <div className="border-t border-slate-100 pt-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-[#0B1F3A]">
                          <ClipboardCheck
                            className="h-4 w-4 text-[#1D4ED8]"
                            aria-hidden="true"
                          />
                          <span>Tiêu chí tự đánh giá sau khi nói</span>
                        </p>
                        <span className="font-mono text-xs text-slate-500 tabular-nums">
                          {checked.length}/{task.self_assessment.length} tiêu chí
                        </span>
                      </div>

                      <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {task.self_assessment.map((criterion) => {
                          const isChecked = checked.includes(criterion);
                          return (
                            <label
                              key={criterion}
                              className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-xs transition-colors ${
                                isChecked
                                  ? "border-emerald-300 bg-emerald-50/70 text-[#0B1F3A]"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleTaskCriterion(task.id, criterion)}
                                className="mt-0.5 h-4 w-4 accent-[#0F294A]"
                              />
                              <span className="leading-relaxed">{criterion}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Practice Notes + Optional Mic Dictation */}
                    <div className="space-y-2 border-t border-slate-100 pt-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label
                          htmlFor={`notes-${task.id}`}
                          className="text-xs font-semibold text-slate-700"
                        >
                          Dàn ý / Bản ghi bài nói của bạn (tùy chọn)
                        </label>
                        {speechRecognitionSupported && (
                          <button
                            type="button"
                            onClick={() => handleToggleDictation(task.id)}
                            className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
                              isListening
                                ? "bg-red-600 text-white"
                                : "border border-slate-200 bg-white text-[#0F294A] hover:bg-slate-50"
                            }`}
                          >
                            {isListening ? (
                              <>
                                <MicOff className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Dừng ghi âm</span>
                              </>
                            ) : (
                              <>
                                <Mic className="h-3.5 w-3.5 text-[#1D4ED8]" aria-hidden="true" />
                                <span>Đọc thử vào ghi chú</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      <textarea
                        id={`notes-${task.id}`}
                        rows={2}
                        value={notes}
                        onChange={(e) =>
                          setDraftNotesByTask((prev) => ({
                            ...prev,
                            [task.id]: e.target.value,
                          }))
                        }
                        placeholder="Ghi nhanh ý chính hoặc câu trả lời tiếng Anh của bạn tại đây..."
                        className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs leading-relaxed text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
                      />
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                      <span className="text-xs text-slate-500">
                        {record?.updatedAtLabel
                          ? `Cập nhật gần nhất: ${record.updatedAtLabel}`
                          : "Chưa lưu tiến độ cho nhiệm vụ này"}
                      </span>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() =>
                            void handlePersistSpeakingTask(task, isCompleted)
                          }
                          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#0F294A] hover:bg-slate-50 disabled:opacity-60"
                        >
                          <Save className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Lưu tiến độ</span>
                        </button>

                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() =>
                            void handlePersistSpeakingTask(task, !isCompleted)
                          }
                          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-60 ${
                            isCompleted
                              ? "bg-emerald-600 hover:bg-emerald-700 shadow-xs"
                              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20"
                          }`}
                        >
                          {isSaving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          <span>
                            {isCompleted ? "Đã hoàn thành (nhấn để bỏ)" : "Đánh dấu hoàn thành"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h3 className="font-display text-lg font-bold text-[#0B1F3A]">
                  Bài tập phát âm chuyên sâu cho người Việt
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Khắc phục các lỗi phổ biến như nuốt âm cuối -ed/-s, nhầm /θ/ thành /t/ và ngắt
                  nhịp câu dài.
                </p>
              </div>

              <div className="inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 shrink-0">
                {GROUPS.map((group) => (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => setGroupFilter(group.key)}
                    className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                      groupFilter === group.key
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {group.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600">
                  Tiến độ hoàn thành phiên luyện phát âm
                </span>
                <span className="font-mono font-semibold text-[#0F294A] tabular-nums">
                  {completedCount} / {totalItems} mẫu câu ({completionPct}%)
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </div>

            {savedNotice && (
              <div
                role="status"
                className="rounded-lg border border-sky-200 bg-[#F4F8FF] p-3 text-xs text-[#0F294A]"
              >
                {savedNotice}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {filteredDrills.map((exercise) => (
              <section
                key={exercise.id}
                className="rounded-xl border border-slate-200 bg-white p-6"
              >
                <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-semibold text-[#1D4ED8]">
                      CEFR {exercise.cefr} · {exercise.targetSound}
                    </p>
                    <h4 className="mt-1 font-display text-lg font-bold text-[#0B1F3A]">
                      {exercise.titleVi}
                    </h4>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <span className="font-mono text-xs font-semibold text-[#0F294A]">
                      {exercise.ipaPair}
                    </span>
                    <button
                      type="button"
                      disabled={savingId === exercise.id}
                      onClick={() => void handleSaveExercise(exercise)}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60"
                    >
                      {savingId === exercise.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Save className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>Lưu kết quả bài tập</span>
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                    <p className="text-xs font-semibold text-slate-900">
                      Lỗi thường gặp của người Việt
                    </p>
                    <p className="mt-1 leading-relaxed text-slate-600">{exercise.pitfallVi}</p>
                  </div>
                  <div className="rounded-lg border border-sky-200 bg-[#F4F8FF] p-4 text-sm">
                    <p className="text-xs font-semibold text-[#0F294A]">
                      Hướng dẫn đặt khẩu hình & luồng hơi
                    </p>
                    <p className="mt-1 leading-relaxed text-slate-700">
                      {exercise.articulationTipVi}
                    </p>
                  </div>
                </div>

                <div className="mt-5 divide-y divide-slate-100 border-t border-slate-100">
                  {exercise.practiceItems.map((item) => {
                    const isDone = Boolean(completedItemIds[item.id]);
                    const isPracticing = practicingId === item.id;
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col justify-between gap-4 py-4 md:flex-row md:items-center"
                      >
                        <div className="min-w-0">
                          <p className="font-display text-base font-semibold text-[#0B1F3A]">
                            {item.promptEn}
                          </p>
                          {user.showIpaNotation && (
                            <p className="mt-1 font-mono text-xs text-[#1D4ED8]">{item.ipa}</p>
                          )}
                          {user.showVietnameseHints && (
                            <p className="mt-1 text-xs text-slate-500">
                              Nghĩa: {item.meaningVi} · Từ trọng tâm: {item.focusWord}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              speakEnglishText(item.promptEn, {
                                accent: user.preferredAccent,
                                rate: user.speechRate,
                              })
                            }
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#0F294A] hover:bg-slate-50"
                          >
                            <Volume2 className="h-3.5 w-3.5 text-[#1D4ED8]" aria-hidden="true" />
                            <span>Nghe mẫu</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setPracticingId((prev) => (prev === item.id ? null : item.id))
                            }
                            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                              isPracticing
                                ? "bg-red-600 text-white"
                                : "bg-[#F4F8FF] text-[#0F294A] hover:bg-sky-100"
                            }`}
                          >
                            <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>{isPracticing ? "Đang đọc thử..." : "Đọc thử"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleCompleted(item.id)}
                            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                              isDone
                                ? "bg-emerald-700 text-white"
                                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>{isDone ? "Đã luyện" : "Hoàn thành"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
