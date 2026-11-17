import {
  ArrowRight,
  BookOpen,
  Clock,
  Flame,
  GraduationCap,
  Loader2,
  MessageSquare,
  Mic,
  Plus,
  Volume2,
} from "lucide-react";
import { useState } from "react";
import { DailyGoalRing, WeeklyMinutesChart } from "../components/ProgressCharts";
import { CEFR_DESCRIPTIONS, SKILL_PROGRESS } from "../data/sampleData";
import {
  AppRoute,
  CompletedLessonRecord,
  UserProfile,
  WeeklyStudyPoint,
} from "../types/learning";

interface DashboardPageProps {
  user: UserProfile;
  completedLessons: CompletedLessonRecord[];
  loadingData: boolean;
  onNavigate: (route: AppRoute) => void;
  onAddStudyMinutes: (minutes: number) => Promise<void>;
  onSelectScenario: (scenarioId: string) => void;
}

const DAY_KEYS: Array<"T2" | "T3" | "T4" | "T5" | "T6" | "T7" | "CN"> = [
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "CN",
];

export function DashboardPage({
  user,
  completedLessons,
  loadingData,
  onNavigate,
  onAddStudyMinutes,
  onSelectScenario,
}: DashboardPageProps) {
  const [updatingMinutes, setUpdatingMinutes] = useState(false);

  const goalProgress = Math.min(
    100,
    Math.round((user.todayMinutes / Math.max(1, user.dailyGoalMinutes)) * 100)
  );

  const weeklyChartData: WeeklyStudyPoint[] = DAY_KEYS.map((day) => ({
    dayLabel: day,
    minutes: user.weeklyMinutes?.[day] ?? 0,
    targetMinutes: user.dailyGoalMinutes,
  }));

  const handleAddMinutes = async () => {
    setUpdatingMinutes(true);
    try {
      await onAddStudyMinutes(5);
    } finally {
      setUpdatingMinutes(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Navy Welcome Hero Card with Daily Goal Ring */}
      <section className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white sm:p-8 shadow-xl shadow-blue-950/20 border border-indigo-500/20">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="flex items-start gap-5">
            <div className="hidden sm:block">
              <DailyGoalRing
                minutes={user.todayMinutes}
                goalMinutes={user.dailyGoalMinutes}
                size={94}
                inverted
              />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-blue-400">
                Cấp độ hiện tại: CEFR {user.currentCefr} ·{" "}
                {CEFR_DESCRIPTIONS[user.currentCefr].labelVi}
              </p>
              <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight sm:text-3xl text-white">
                Xin chào, {user.fullName}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-200">
                {CEFR_DESCRIPTIONS[user.currentCefr].focusVi}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate("ai-speaking")}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-blue-900 shadow-md transition-all hover:bg-blue-50 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Mic className="h-4 w-4 text-blue-600" aria-hidden="true" />
              <span>Bắt đầu luyện nói</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate("exercises")}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20 whitespace-nowrap"
            >
              <Volume2 className="h-4 w-4 text-blue-300" aria-hidden="true" />
              <span>Luyện phát âm</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4-column Key Learning KPIs */}
      <section
        aria-label="Chỉ số học tập tổng quan"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Cấp độ CEFR</span>
            <GraduationCap className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {user.currentCefr} · {CEFR_DESCRIPTIONS[user.currentCefr].labelVi}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Mục tiêu kế tiếp: CEFR {user.targetCefr}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Mục tiêu học hằng ngày</span>
            <Clock className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <p className="font-display text-2xl font-bold text-slate-900 tabular-nums">
              {user.todayMinutes} / {user.dailyGoalMinutes} phút
            </p>
            <span className="font-mono text-xs font-bold text-blue-600 tabular-nums">
              {goalProgress}%
            </span>
          </div>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all"
              style={{ width: `${goalProgress}%` }}
            />
          </div>
          <button
            type="button"
            disabled={updatingMinutes}
            onClick={() => void handleAddMinutes()}
            className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-60"
          >
            {updatingMinutes ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>Ghi nhận +5 phút học</span>
          </button>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Từ vựng đã thuộc</span>
            <BookOpen className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {user.vocabularyLearnedCount} từ
          </p>
          <button
            type="button"
            onClick={() => onNavigate("vocabulary")}
            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            <span>Ôn tập kho từ vựng</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Chuỗi ngày duy trì</span>
            <Flame className="h-4 w-4 text-amber-500" aria-hidden="true" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {user.streakDays} ngày
          </p>
          <button
            type="button"
            onClick={() => onNavigate("progress")}
            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            <span>Xem biểu đồ tuần</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Progress Snapshot + Recommended Focus */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-xs lg:col-span-7">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                Biểu đồ thời lượng học tuần này
              </h3>
              <p className="text-xs text-slate-500">
                Dữ liệu thời lượng học được lưu trực tiếp theo tài khoản của bạn
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("progress")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap"
            >
              Chi tiết 5 kỹ năng
            </button>
          </div>
          <div className="mt-5">
            <WeeklyMinutesChart
              data={weeklyChartData}
              dailyGoalMinutes={user.dailyGoalMinutes}
            />
          </div>
        </section>

        <section className="flex flex-col justify-between rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-indigo-50/30 to-white p-6 shadow-xs lg:col-span-5">
          <div>
            <p className="font-mono text-xs font-bold text-blue-700">
              Tình huống đề xuất · CEFR {user.currentCefr}
            </p>
            <h3 className="mt-2 font-display text-xl font-bold text-slate-900">
              Họp cập nhật tiến độ dự án
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Thực hành báo cáo công việc bằng thì hiện tại hoàn thành và luyện bật rõ âm cuối
              /t/ và /d/.
            </p>

            <div className="mt-5 space-y-2.5 border-t border-blue-200/60 pt-4 text-xs">
              <p className="font-bold text-slate-900">Điểm kỹ năng hiện tại:</p>
              <div className="space-y-1.5">
                {SKILL_PROGRESS.slice(0, 3).map((skill) => (
                  <div key={skill.key} className="flex items-center justify-between">
                    <span className="text-slate-600">{skill.labelVi}</span>
                    <span className="font-mono font-bold text-blue-700 tabular-nums">
                      {user.skillScores?.[skill.key] ?? skill.percent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onSelectScenario("sc-meeting-b1");
              onNavigate("ai-speaking");
            }}
            className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all"
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            <span>Mở tình huống này</span>
          </button>
        </section>
      </div>

      {/* Completed Lessons from Cloud Firestore */}
      <section className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900">
              Bài học đã hoàn thành của bạn
            </h3>
            <p className="text-xs text-slate-500">
              Lịch sử học tập riêng tư đồng bộ qua Cloud Firestore
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("progress")}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap"
          >
            Xem tất cả
          </button>
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" aria-hidden="true" />
            <span>Đang tải bài học từ Cloud Firestore...</span>
          </div>
        ) : completedLessons.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-slate-700">
              Bạn chưa ghi nhận bài học hoàn thành nào.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Hãy bắt đầu một lượt luyện nói AI hoặc hoàn thành bài tập phát âm để lưu
              tiến độ đầu tiên.
            </p>
            <button
              type="button"
              onClick={() => onNavigate("ai-speaking")}
              className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-4 py-2 text-xs font-semibold text-white shadow-sm"
            >
              <Mic className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Bắt đầu bài học đầu tiên</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {completedLessons.slice(0, 5).map((lesson) => (
              <div
                key={lesson.id}
                className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 tabular-nums">
                    CEFR {lesson.cefr} · {lesson.skillVi} · {lesson.durationMinutes} phút ·{" "}
                    {lesson.completedAtLabel}
                  </p>
                  <p className="mt-1 font-display text-sm font-semibold text-slate-900">
                    {lesson.titleVi}
                  </p>
                  <p className="text-xs text-slate-500">{lesson.titleEn}</p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-mono text-sm font-bold text-blue-700 tabular-nums">
                    {lesson.scorePercent}%
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate(lesson.routeTarget)}
                    className="min-h-[38px] rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-700 whitespace-nowrap shadow-xs"
                  >
                    Luyện lại
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
