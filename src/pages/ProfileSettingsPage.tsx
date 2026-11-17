import { CheckCircle2, Database, Loader2, LogOut, RefreshCw, Upload } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { MediaImage } from "../components/MediaImage";
import { fetchServerHealth } from "../lib/api/geminiClient";
import {
  ADMIN_EMAIL,
  ConnectionCheckResult,
  FIREBASE_PROJECT_INFO,
  testFirestoreConnection,
} from "../lib/firebase/config";
import { formatFirestoreErrorVi } from "../lib/firebase/errors";
import { firestoreService } from "../lib/firebase/firestoreService";
import {
  CefrLevel,
  DatasetVerificationResult,
  IntegrationStatus,
  UserProfile,
} from "../types/learning";

interface ProfileSettingsPageProps {
  user: UserProfile;
  authProviderLabel: string;
  isAdmin: boolean;
  catalogCounts: {
    vocabulary: number;
    scenarios: number;
    tasks: number;
  };
  datasetVerification: DatasetVerificationResult | null;
  importingDataset: boolean;
  verifyingDataset: boolean;
  onVerifyDataset: () => Promise<DatasetVerificationResult | null>;
  onImportDataset: () => Promise<DatasetVerificationResult | null>;
  onLogout: () => Promise<void>;
  loggingOut: boolean;
  onUpdateProfile?: (updated: UserProfile) => void;
}

export function ProfileSettingsPage({
  user,
  authProviderLabel,
  isAdmin,
  catalogCounts,
  datasetVerification,
  importingDataset,
  verifyingDataset,
  onVerifyDataset,
  onImportDataset,
  onLogout,
  loggingOut,
  onUpdateProfile,
}: ProfileSettingsPageProps) {
  const [draft, setDraft] = useState<UserProfile>(user);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [integrationStatus, setIntegrationStatus] =
    useState<IntegrationStatus | null>(null);
  const [firestoreProbe, setFirestoreProbe] =
    useState<ConnectionCheckResult | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  const loadHealth = async () => {
    setCheckingHealth(true);
    const [status, probe] = await Promise.all([
      fetchServerHealth(),
      testFirestoreConnection(),
    ]);
    setIntegrationStatus(status);
    setFirestoreProbe(probe);
    setCheckingHealth(false);
  };

  useEffect(() => {
    setDraft(user);
  }, [user]);

  useEffect(() => {
    void loadHealth();
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveNotice(null);
    setSaveError(null);
    try {
      if (user.uid && user.uid !== "guest-learner") {
        await firestoreService.updateUserPreferences(user.uid, draft);
        setSaveNotice("Đã lưu hồ sơ và tùy chọn học tập lên Cloud Firestore.");
      } else {
        setSaveNotice("Đã lưu hồ sơ và tùy chọn học tập vào trình duyệt của bạn.");
      }
      if (onUpdateProfile) {
        onUpdateProfile(draft);
      }
    } catch (err) {
      setSaveError(formatFirestoreErrorVi(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Profile Form */}
        <form
          onSubmit={handleSave}
          className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-slate-200">
                <MediaImage
                  src={draft.avatarUrl}
                  alt={draft.fullName}
                  fallbackTitle={draft.fullName}
                />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-[#0F294A]">
                  {draft.fullName}
                </h2>
                <p className="text-sm text-slate-600">{draft.email}</p>
                <p className="mt-0.5 font-mono text-xs text-slate-400">
                  UID: {user.uid} · {authProviderLabel}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void onLogout()}
              disabled={loggingOut}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>{loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="profile-name"
                className="block text-sm font-medium text-slate-700"
              >
                Họ và tên
              </label>
              <input
                id="profile-name"
                type="text"
                required
                value={draft.fullName}
                onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
                className="mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="block text-sm font-medium text-slate-700"
              >
                Email tài khoản
              </label>
              <input
                id="profile-email"
                type="email"
                required
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                className="mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="profile-current-cefr"
                className="block text-sm font-medium text-slate-700"
              >
                Trình độ hiện tại
              </label>
              <select
                id="profile-current-cefr"
                value={draft.currentCefr}
                onChange={(e) =>
                  setDraft({ ...draft, currentCefr: e.target.value as CefrLevel })
                }
                className="mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
              >
                {(["A1", "A2", "B1", "B2", "C1", "C2"] as CefrLevel[]).map((lv) => (
                  <option key={lv} value={lv}>
                    CEFR {lv}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="profile-target-cefr"
                className="block text-sm font-medium text-slate-700"
              >
                Mục tiêu CEFR
              </label>
              <select
                id="profile-target-cefr"
                value={draft.targetCefr}
                onChange={(e) =>
                  setDraft({ ...draft, targetCefr: e.target.value as CefrLevel })
                }
                className="mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
              >
                {(["A1", "A2", "B1", "B2", "C1", "C2"] as CefrLevel[]).map((lv) => (
                  <option key={lv} value={lv}>
                    CEFR {lv}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Daily Goal Slider */}
          <div className="border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="daily-goal-range"
                className="text-sm font-medium text-slate-700"
              >
                Mục tiêu luyện tập mỗi ngày
              </label>
              <span className="font-mono text-sm font-semibold text-[#0F294A] tabular-nums">
                {draft.dailyGoalMinutes} phút/ngày
              </span>
            </div>
            <input
              id="daily-goal-range"
              type="range"
              min={10}
              max={60}
              step={5}
              value={draft.dailyGoalMinutes}
              onChange={(e) =>
                setDraft({ ...draft, dailyGoalMinutes: Number(e.target.value) })
              }
              className="mt-3 w-full accent-blue-600"
            />
          </div>

          {/* Learning Preferences */}
          <div className="space-y-4 border-t border-slate-100 pt-5">
            <h3 className="font-display text-base font-bold text-slate-900">
              Tùy chọn phát âm & hiển thị
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-slate-600">Giọng đọc mẫu</p>
                <div className="mt-2 inline-flex gap-1 rounded-lg bg-slate-100 p-1">
                  {(["US", "UK"] as const).map((accent) => (
                    <button
                      key={accent}
                      type="button"
                      onClick={() => setDraft({ ...draft, preferredAccent: accent })}
                      className={`min-h-[36px] rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                        draft.preferredAccent === accent
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {accent === "US" ? "Anh - Mỹ (US)" : "Anh - Anh (UK)"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-600">Tốc độ đọc mẫu</p>
                <div className="mt-2 inline-flex gap-1 rounded-lg bg-slate-100 p-1">
                  {([0.8, 1.0, 1.15] as const).map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setDraft({ ...draft, speechRate: rate })}
                      className={`min-h-[36px] rounded-md px-3 py-1 font-mono text-xs font-semibold transition-all ${
                        draft.speechRate === rate
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
                <span>Hiển thị giải thích & gợi ý tiếng Việt</span>
                <input
                  type="checkbox"
                  checked={draft.showVietnameseHints}
                  onChange={(e) =>
                    setDraft({ ...draft, showVietnameseHints: e.target.checked })
                  }
                  className="h-4 w-4 accent-blue-600"
                />
              </label>

              <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
                <span>Hiển thị phiên âm quốc tế IPA</span>
                <input
                  type="checkbox"
                  checked={draft.showIpaNotation}
                  onChange={(e) =>
                    setDraft({ ...draft, showIpaNotation: e.target.checked })
                  }
                  className="h-4 w-4 accent-blue-600"
                />
              </label>
            </div>
          </div>

          {saveNotice && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50/80 p-3 text-xs text-blue-900"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
              <span>{saveNotice}</span>
            </div>
          )}

          {saveError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
            >
              {saveError}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-all disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            <span>{saving ? "Đang lưu..." : "Lưu thay đổi lên Cloud Firestore"}</span>
          </button>
        </form>

        {/* Right Live Integration Status Panel */}
        <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 lg:self-start">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-[#0F294A]">
                Trạng thái kết nối hệ thống
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Dự án Firebase: {FIREBASE_PROJECT_INFO.projectId}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadHealth()}
              disabled={checkingHealth}
              aria-label="Kiểm tra lại trạng thái kết nối"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${checkingHealth ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-sm">
            <div className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold text-slate-900">Máy chủ Node.js / Express</p>
                <p className="text-xs text-slate-500">Runtime phục vụ giao diện & API</p>
              </div>
              <span className="font-mono text-xs font-semibold text-emerald-700">
                {integrationStatus?.serverReady ? "Đang hoạt động" : "Đang kiểm tra"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold text-slate-900">Gemini API phía máy chủ</p>
                <p className="text-xs text-slate-500">Tuyến /api/ai/speaking-feedback</p>
              </div>
              <span
                className={`font-mono text-xs font-semibold ${
                  integrationStatus?.geminiConfigured
                    ? "text-emerald-700"
                    : "text-amber-700"
                }`}
              >
                {integrationStatus?.geminiConfigured ? "Đã cấu hình" : "Chưa cấu hình"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold text-slate-900">Firebase Authentication</p>
                <p className="text-xs text-slate-500">Google Sign-In & Email/Mật khẩu</p>
              </div>
              <span className="font-mono text-xs font-semibold text-emerald-700">
                Đã kết nối
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold text-slate-900">Cloud Firestore</p>
                <p className="text-xs text-slate-500">
                  {firestoreProbe?.messageVi ?? "Đang kiểm tra kết nối máy chủ..."}
                </p>
              </div>
              <span
                className={`font-mono text-xs font-semibold ${
                  firestoreProbe?.connected ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {firestoreProbe?.connected ? "Đã kết nối" : "Đang kiểm tra"}
              </span>
            </div>
          </div>

          {/* Starter Dataset Management & Verification */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="flex items-center gap-1.5 font-display text-sm font-bold text-[#0F294A]">
                  <Database className="h-4 w-4 text-[#1D4ED8]" aria-hidden="true" />
                  <span>Dữ liệu học tập (Cloud Firestore)</span>
                </h4>
                <p className="mt-0.5 text-xs text-slate-500">
                  Số lượng bản ghi thực tế đang đồng bộ từ máy chủ Firestore.
                </p>
              </div>
              <button
                type="button"
                disabled={verifyingDataset}
                onClick={() => void onVerifyDataset()}
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#0F294A] hover:bg-slate-50 disabled:opacity-60"
              >
                {verifyingDataset ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>Kiểm tra</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-2.5">
                <p className="font-mono text-lg font-bold text-[#0F294A] tabular-nums">
                  {datasetVerification ? datasetVerification.vocabularyCount : catalogCounts.vocabulary}
                </p>
                <p className="text-[11px] font-medium text-slate-600">vocabulary</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-2.5">
                <p className="font-mono text-lg font-bold text-[#0F294A] tabular-nums">
                  {datasetVerification ? datasetVerification.scenariosCount : catalogCounts.scenarios}
                </p>
                <p className="text-[11px] font-medium text-slate-600">scenarios</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-2.5">
                <p className="font-mono text-lg font-bold text-[#0F294A] tabular-nums">
                  {datasetVerification ? datasetVerification.tasksCount : catalogCounts.tasks}
                </p>
                <p className="text-[11px] font-medium text-slate-600">speaking_tasks</p>
              </div>
            </div>

            {datasetVerification && (
              <p className="text-xs text-emerald-700">
                Đã xác minh trực tiếp từ máy chủ Firestore lúc {datasetVerification.verifiedAtLabel}:{" "}
                {datasetVerification.vocabularyCount} từ vựng,{" "}
                {datasetVerification.scenariosCount} tình huống,{" "}
                {datasetVerification.tasksCount} bài tập nói.
              </p>
            )}

            {isAdmin ? (
              <button
                type="button"
                disabled={importingDataset}
                onClick={() => void onImportDataset()}
                className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-[#0F294A] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#173A67] disabled:opacity-60"
              >
                {importingDataset ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="h-4 w-4" aria-hidden="true" />
                )}
                <span>
                  {importingDataset
                    ? "Đang nhập & xác minh 48 bản ghi..."
                    : "Nhập / Đồng bộ Starter Dataset lên Firestore (Admin)"}
                </span>
              </button>
            ) : (
              <p className="text-xs leading-relaxed text-slate-500">
                Quyền nhập dữ liệu mẫu dành cho quản trị viên ({ADMIN_EMAIL}) hoặc lệnh{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[#0F294A]">
                  npm run import:dataset
                </code>
                .
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
