import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  HelpCircle,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  User,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { authService } from "../lib/firebase/authService";
import { FIREBASE_PROJECT_INFO } from "../lib/firebase/config";
import { AppRoute, CefrLevel } from "../types/learning";

interface AuthPageProps {
  onNavigate: (route: AppRoute) => void;
  authPromptMessage?: string | null;
}

export function AuthPage({ onNavigate, authPromptMessage }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [targetCefr, setTargetCefr] = useState<CefrLevel>("B2");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Auto handle Google OAuth Redirect outcome on page load
  useEffect(() => {
    let mounted = true;
    void authService
      .handleGoogleRedirectResult()
      .then((user) => {
        if (mounted && user) {
          onNavigate("dashboard");
        }
      })
      .catch((err) => {
        if (mounted) {
          setErrorText(
            err instanceof Error ? err.message : "Đăng nhập Google qua chuyển hướng thất bại."
          );
        }
      });
    return () => {
      mounted = false;
    };
  }, [onNavigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorText(null);

    try {
      if (mode === "login") {
        await authService.signInWithEmail({ email, password });
      } else {
        await authService.registerWithEmail({
          fullName,
          email,
          password,
          targetCefr,
        });
      }
      onNavigate("dashboard");
    } catch (err) {
      setErrorText(
        err instanceof Error ? err.message : "Đăng nhập không thành công."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async (preferRedirect = false) => {
    setSubmitting(true);
    setErrorText(null);
    if (preferRedirect) {
      setRedirecting(true);
    }

    try {
      await authService.signInWithGoogle({
        targetCefr: mode === "register" ? targetCefr : undefined,
        preferRedirect,
      });
      if (!preferRedirect) {
        onNavigate("dashboard");
      }
    } catch (err) {
      setErrorText(
        err instanceof Error
          ? err.message
          : mode === "register"
            ? "Không thể đăng ký bằng Google."
            : "Không thể đăng nhập bằng Google."
      );
    } finally {
      setSubmitting(false);
      setRedirecting(false);
    }
  };

  const currentHostname =
    typeof window !== "undefined" && window.location ? window.location.hostname : "localhost";

  const isDomainError = errorText?.includes("Authorized domains") || errorText?.includes("unauthorized-domain");
  const isPopupBlocked = errorText?.includes("chặn cửa sổ bật lên") || errorText?.includes("popup-blocked");

  return (
    <div className="min-h-screen bg-[#F8FAFC] lg:grid lg:grid-cols-12">
      {/* Left Navy Panel */}
      <div className="flex flex-col justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-6 py-8 text-white sm:px-10 lg:col-span-5 lg:px-12 lg:py-12">
        <div>
          <button
            type="button"
            onClick={() => onNavigate("landing")}
            className="inline-flex items-center gap-2 text-sm font-medium text-sky-200 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Quay lại trang chủ</span>
          </button>

          <div className="mt-8 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-sky-400 text-white shadow-lg shadow-blue-500/30">
              <GraduationCap className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display text-xl font-extrabold tracking-tight text-white leading-tight">
                TỰ HỌC TIẾNG ANH
              </h1>
              <p className="text-xs font-bold tracking-widest text-blue-400 uppercase">
                PHẠM HẬU
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-200 sm:text-base">
            Đăng nhập để lưu trữ riêng tư hồ sơ CEFR, từ vựng đã đánh dấu, bài học hoàn
            thành, lịch sử luyện nói AI và kết quả kiểm tra phát âm.
          </p>

          <div className="mt-8 space-y-3 text-sm text-slate-200">
            <p className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />
              <span>Dữ liệu học tập cô lập riêng biệt theo mã tài khoản Firebase</span>
            </p>
            <p className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />
              <span>Hỗ trợ đăng nhập Google một chạm và Email / Mật khẩu bảo mật</span>
            </p>
            <p className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />
              <span>Đồng bộ theo thời gian thực qua Cloud Firestore</span>
            </p>
          </div>
        </div>

        <p className="mt-10 text-xs text-slate-400">
          Bảo mật dữ liệu cá nhân theo chuẩn quyền sở hữu người dùng Firebase Authentication.
        </p>
      </div>

      {/* Right Form Panel */}
      <div className="flex items-center justify-center px-4 py-10 sm:px-8 lg:col-span-7">
        <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md shadow-blue-500/5 sm:p-8">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorText(null);
              }}
              className={`min-h-[40px] rounded-md text-sm font-semibold transition-all ${
                mode === "login"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setErrorText(null);
              }}
              className={`min-h-[40px] rounded-md text-sm font-semibold transition-all ${
                mode === "register"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Đăng ký
            </button>
          </div>

          <div className="mt-6">
            <h2 className="font-display text-xl font-bold text-slate-900">
              {mode === "login" ? "Đăng nhập tài khoản học viên" : "Tạo tài khoản học tập mới"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {mode === "login"
                ? "Sử dụng Google hoặc Email/Mật khẩu để đồng bộ tiến độ."
                : "Khởi tạo hồ sơ học tập riêng trên Cloud Firestore."}
            </p>
          </div>

          {authPromptMessage && (
            <div
              role="status"
              className="mt-4 rounded-lg border border-sky-200 bg-[#F4F8FF] p-3 text-xs leading-relaxed text-[#0F294A]"
            >
              {authPromptMessage}
            </div>
          )}

          {/* Primary Google Action */}
          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={() => handleGoogleSignIn(false)}
              disabled={submitting || redirecting}
              className="flex min-h-[46px] w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#0B1F3A] shadow-xs transition-all hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 disabled:opacity-60"
            >
              {submitting && !redirecting ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#1D4ED8]" aria-hidden="true" />
              ) : (
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>
                {submitting && !redirecting
                  ? "Đang xác thực Google..."
                  : mode === "register"
                    ? "Đăng ký nhanh với Google"
                    : "Đăng nhập với Google"}
              </span>
            </button>

            {/* Alternative Redirect Button for mobile / pop-up issues */}
            {(isPopupBlocked || redirecting) && (
              <button
                type="button"
                onClick={() => handleGoogleSignIn(true)}
                disabled={submitting}
                className="flex min-h-[38px] w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
              >
                {redirecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" aria-hidden="true" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                )}
                <span>
                  {redirecting ? "Đang chuyển hướng sang Google..." : "Thử lại bằng chuyển hướng toàn trang (Redirect)"}
                </span>
              </button>
            )}
          </div>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            <span>hoặc dùng Email & Mật khẩu</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label
                  htmlFor="auth-fullname"
                  className="block text-sm font-medium text-slate-700"
                >
                  Họ và tên
                </label>
                <div className="relative mt-1.5">
                  <User
                    className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Minh Anh"
                    className="min-h-[42px] w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-slate-700">
                Địa chỉ email
              </label>
              <div className="relative mt-1.5">
                <Mail
                  className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tenban@example.vn"
                  className="min-h-[42px] w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium text-slate-700">
                Mật khẩu
              </label>
              <div className="relative mt-1.5">
                <Lock
                  className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="min-h-[42px] w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
                />
              </div>
            </div>

            {mode === "register" && (
              <div>
                <label htmlFor="auth-cefr" className="block text-sm font-medium text-slate-700">
                  Mục tiêu CEFR mong muốn
                </label>
                <select
                  id="auth-cefr"
                  value={targetCefr}
                  onChange={(e) => setTargetCefr(e.target.value as CefrLevel)}
                  className="mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
                >
                  <option value="A2">A2 — Giao tiếp cơ bản</option>
                  <option value="B1">B1 — Giao tiếp độc lập</option>
                  <option value="B2">B2 — Tự tin trong công việc</option>
                  <option value="C1">C1 — Thành thạo học thuật & quản lý</option>
                  <option value="C2">C2 — Sử dụng như người bản ngữ</option>
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Mục tiêu này cũng sẽ áp dụng khi bạn chọn Đăng ký nhanh với Google.
                </p>
              </div>
            )}

            {errorText && (
              <div
                role="alert"
                className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-800"
              >
                <div className="flex items-start gap-2">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                  <div className="flex-1 font-medium">{errorText}</div>
                </div>

                {isDomainError && (
                  <div className="mt-2 rounded border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                    <p className="font-semibold">Cách khắc phục lỗi Authorized domains:</p>
                    <ol className="mt-1 list-decimal pl-4 space-y-1">
                      <li>Truy cập Firebase Console (Project: <strong>{FIREBASE_PROJECT_INFO.projectId}</strong>)</li>
                      <li>Vào mục <strong>Authentication</strong> &gt; <strong>Settings</strong> &gt; <strong>Authorized domains</strong></li>
                      <li>
                        Bấm <strong>Add domain</strong> và nhập:{" "}
                        <code className="rounded bg-amber-100 px-1 py-0.5 font-mono font-bold text-amber-950">
                          {currentHostname}
                        </code>
                      </li>
                      <li>Nhấn <strong>Save</strong> rồi thử lại đăng ký/đăng nhập Google.</li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || redirecting}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-all disabled:opacity-60"
            >
              {submitting && !redirecting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              <span>
                {submitting && !redirecting
                  ? "Đang xác thực..."
                  : mode === "login"
                    ? "Đăng nhập bằng Email"
                    : "Đăng ký tài khoản mới"}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
