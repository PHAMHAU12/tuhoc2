import { Loader2 } from "lucide-react";
import { SkillRadarChart, WeeklyMinutesChart } from "../components/ProgressCharts";
import { CEFR_DESCRIPTIONS, SKILL_PROGRESS } from "../data/sampleData";
import {
  CefrLevel,
  CompletedLessonRecord,
  SpeakingHistoryRecord,
  TestResultRecord,
  UserProfile,
  WeeklyStudyPoint,
} from "../types/learning";

interface ProgressPageProps {
  user: UserProfile;
  completedLessons: CompletedLessonRecord[];
  testResults: TestResultRecord[];
  speakingHistory: SpeakingHistoryRecord[];
  loadingData: boolean;
}

const CEFR_ORDER: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
const DAY_KEYS: Array<"T2" | "T3" | "T4" | "T5" | "T6" | "T7" | "CN"> = [
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "CN",
];

export function ProgressPage({
  user,
  completedLessons,
  testResults,
  speakingHistory,
  loadingData,
}: ProgressPageProps) {
  const skillsWithLiveScores = SKILL_PROGRESS.map((skill) => ({
    ...skill,
    percent: user.skillScores?.[skill.key] ?? skill.percent,
    cefrEstimate: user.currentCefr,
  }));

  const weeklyChartData: WeeklyStudyPoint[] = DAY_KEYS.map((day) => ({
    dayLabel: day,
    minutes: user.weeklyMinutes?.[day] ?? 0,
    targetMinutes: user.dailyGoalMinutes,
  }));

  const weeklyTotal = weeklyChartData.reduce((sum, day) => sum + day.minutes, 0);
  const averageScore =
    completedLessons.length > 0
      ? Math.round(
          completedLessons.reduce((sum, item) => sum + item.scorePercent, 0) /
            completedLessons.length
        )
      : testResults.length > 0
        ? Math.round(
            testResults.reduce((sum, item) => sum + item.scorePercent, 0) /
              testResults.length
          )
        : 0;

  return (
    <div className="space-y-6">
      {/* CEFR Level Ladder */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">
              Lộ trình tiến bộ CEFR A1 → C2
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Cấp độ hiện tại: {user.currentCefr} ({CEFR_DESCRIPTIONS[user.currentCefr].labelVi}) ·
              Mục tiêu: {user.targetCefr}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-right font-mono text-xs font-semibold tabular-nums">
            <span className="text-blue-600 font-bold">Tuần này: {weeklyTotal} phút</span>
            <span className="text-slate-800">Lượt nói: {speakingHistory.length}</span>
            <span className="text-slate-800">Điểm TB: {averageScore}%</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CEFR_ORDER.map((level) => {
            const currentIndex = CEFR_ORDER.indexOf(user.currentCefr);
            const idx = CEFR_ORDER.indexOf(level);
            const isPassed = idx < currentIndex;
            const isCurrent = level === user.currentCefr;
            const isTarget = level === user.targetCefr;

            return (
              <div
                key={level}
                className={`rounded-xl border p-4 transition-all ${
                  isCurrent
                    ? "border-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                    : isPassed
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : isTarget
                        ? "border-amber-300 bg-amber-50 text-amber-900"
                        : "border-slate-200 bg-white text-slate-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg font-bold">{level}</span>
                  <span
                    className={`text-xs font-semibold ${
                      isCurrent
                        ? "text-blue-100"
                        : isPassed
                          ? "text-emerald-700"
                          : isTarget
                            ? "text-amber-700"
                            : "text-slate-400"
                    }`}
                  >
                    {isCurrent
                      ? "Hiện tại"
                      : isPassed
                        ? "Đã qua"
                        : isTarget
                          ? "Mục tiêu"
                          : "Sắp tới"}
                  </span>
                </div>
                <p
                  className={`mt-1 text-xs ${
                    isCurrent ? "text-blue-100" : isPassed ? "text-emerald-700 font-medium" : "text-slate-600"
                  }`}
                >
                  {CEFR_DESCRIPTIONS[level].labelVi}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* 5 Skills Matrix + Radar */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-display text-lg font-bold text-[#0B1F3A]">
              Phân tích 5 kỹ năng trọng tâm
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Cập nhật tự động theo các buổi luyện nói và bài kiểm tra phát âm đã lưu
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 items-center gap-6 md:grid-cols-12">
            <div className="md:col-span-5">
              <SkillRadarChart skills={skillsWithLiveScores} />
            </div>
            <div className="space-y-4 md:col-span-7">
              {skillsWithLiveScores.map((skill) => (
                <div key={skill.key}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-900">{skill.labelVi}</p>
                    <p className="font-mono text-xs font-semibold text-[#0F294A] tabular-nums">
                      {skill.percent}% · {skill.cefrEstimate}
                    </p>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#1D4ED8]"
                      style={{ width: `${skill.percent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">{skill.nextMilestoneVi}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Weekly Study Minutes Chart */}
        <section className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <div>
            <h3 className="font-display text-lg font-bold text-[#0B1F3A]">
              Thời lượng luyện tập 7 ngày qua
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Mục tiêu hằng ngày: {user.dailyGoalMinutes} phút/ngày
            </p>
          </div>

          <div className="mt-6">
            <WeeklyMinutesChart
              data={weeklyChartData}
              dailyGoalMinutes={user.dailyGoalMinutes}
            />
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Cột màu xanh ngọc / xanh lá biểu thị ngày đạt hoặc vượt mục tiêu {user.dailyGoalMinutes}{" "}
            phút.
          </p>
        </section>
      </div>

      {/* Completed Lessons & Test Results Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="font-display text-lg font-bold text-[#0B1F3A]">
              Bài học đã hoàn thành
            </h3>
          </div>
          {loadingData ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-[#1D4ED8]" aria-hidden="true" />
              <span>Đang tải...</span>
            </div>
          ) : completedLessons.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-500">
              Chưa có bài học hoàn thành được lưu.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-[#F8FAFC] text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-5 py-3">Bài học</th>
                    <th className="px-3 py-3">CEFR</th>
                    <th className="px-5 py-3 text-right">Điểm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {completedLessons.map((lesson) => (
                    <tr key={lesson.id} className="hover:bg-[#F4F8FF]/60">
                      <td className="px-5 py-3 font-medium text-slate-900">
                        <p>{lesson.titleVi}</p>
                        <p className="text-xs text-slate-500">{lesson.completedAtLabel}</p>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs font-semibold text-[#0F294A]">
                        {lesson.cefr}
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-semibold tabular-nums text-[#0F294A]">
                        {lesson.scorePercent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="font-display text-lg font-bold text-[#0B1F3A]">
              Kết quả bài kiểm tra phát âm
            </h3>
          </div>
          {loadingData ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-[#1D4ED8]" aria-hidden="true" />
              <span>Đang tải...</span>
            </div>
          ) : testResults.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-500">
              Chưa có kết quả bài kiểm tra phát âm nào được lưu.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-[#F8FAFC] text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-5 py-3">Bài tập</th>
                    <th className="px-3 py-3">Hoàn thành</th>
                    <th className="px-5 py-3 text-right">Điểm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {testResults.map((result) => (
                    <tr key={result.id} className="hover:bg-[#F4F8FF]/60">
                      <td className="px-5 py-3 font-medium text-slate-900">
                        <p>{result.titleVi}</p>
                        <p className="text-xs text-slate-500">
                          {result.cefr} · {result.createdAtLabel}
                        </p>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs tabular-nums text-slate-600">
                        {result.completedItems}/{result.totalItems}
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-semibold tabular-nums text-[#0F294A]">
                        {result.scorePercent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
