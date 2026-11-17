import {
  BarChart3,
  BookOpen,
  Compass,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Mic,
  Settings,
  Volume2,
  X,
} from "lucide-react";
import { ReactNode, useState } from "react";
import { AppRoute, UserProfile } from "../types/learning";
import { MediaImage } from "./MediaImage";

interface AppShellProps {
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  onLogout: () => Promise<void> | void;
  loggingOut?: boolean;
  user: UserProfile;
  pageTitle: string;
  children: ReactNode;
}

const WORKSPACE_NAV: Array<{
  route: AppRoute;
  label: string;
  shortLabel: string;
  icon: typeof LayoutDashboard;
}> = [
  {
    route: "dashboard",
    label: "Bảng điều khiển",
    shortLabel: "Tổng quan",
    icon: LayoutDashboard,
  },
  {
    route: "ai-speaking",
    label: "Luyện nói AI",
    shortLabel: "Luyện nói",
    icon: Mic,
  },
  {
    route: "vocabulary",
    label: "Từ vựng CEFR",
    shortLabel: "Từ vựng",
    icon: BookOpen,
  },
  {
    route: "scenarios",
    label: "Tình huống hội thoại",
    shortLabel: "Tình huống",
    icon: MessageSquare,
  },
  {
    route: "exercises",
    label: "Bài tập & Phát âm",
    shortLabel: "Bài tập",
    icon: Volume2,
  },
  {
    route: "progress",
    label: "Tiến độ học tập",
    shortLabel: "Tiến độ",
    icon: BarChart3,
  },
  {
    route: "profile",
    label: "Hồ sơ & Cài đặt",
    shortLabel: "Cài đặt",
    icon: Settings,
  },
];

const MOBILE_PRIMARY_TABS: AppRoute[] = [
  "dashboard",
  "ai-speaking",
  "vocabulary",
  "scenarios",
  "progress",
];

export function AppShell({
  activeRoute,
  onNavigate,
  onLogout,
  loggingOut = false,
  user,
  pageTitle,
  children,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (route: AppRoute) => {
    onNavigate(route);
    setMobileMenuOpen(false);
  };

  const goalPct = Math.min(
    100,
    Math.round((user.todayMinutes / Math.max(1, user.dailyGoalMinutes)) * 100)
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 lg:flex">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-slate-200/80 lg:bg-white">
        <div className="flex h-16 items-center border-b border-slate-200/80 px-5">
          <button
            type="button"
            onClick={() => handleNav("landing")}
            className="flex items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-blue-600 rounded-lg group"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <GraduationCap className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-display text-sm font-extrabold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors whitespace-nowrap">
                TỰ HỌC TIẾNG ANH
              </span>
              <span className="text-[10px] font-bold tracking-wider text-blue-600 uppercase">
                PHẠM HẬU
              </span>
            </div>
          </button>
        </div>

        <nav
          aria-label="Điều hướng học tập"
          className="flex-1 space-y-1.5 px-3 py-5"
        >
          {WORKSPACE_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = activeRoute === item.route;
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => handleNav(item.route)}
                className={`flex min-h-[42px] w-full items-center gap-3 rounded-lg px-3.5 py-2 text-sm font-medium transition-all whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600 ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-500/25"
                    : "text-slate-700 hover:bg-blue-50/80 hover:text-blue-700"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? "text-white" : "text-slate-500"
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          <div className="my-4 border-t border-slate-200/80 pt-4 space-y-1">
            <button
              type="button"
              onClick={() => handleNav("landing")}
              className="flex min-h-[40px] w-full items-center gap-3 rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-blue-50/60 hover:text-blue-700 whitespace-nowrap"
            >
              <Home className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
              <span>Trang giới thiệu</span>
            </button>
            <button
              type="button"
              onClick={() => void onLogout()}
              disabled={loggingOut}
              className="flex min-h-[40px] w-full items-center gap-3 rounded-lg px-3.5 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 whitespace-nowrap"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</span>
            </button>
          </div>
        </nav>

        {/* Compact Daily Progress & Profile Footer */}
        <div className="border-t border-slate-200/80 p-4 space-y-3">
          <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/80 via-indigo-50/30 to-white p-3 shadow-xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">Mục tiêu hôm nay</span>
              <span className="font-mono font-bold text-blue-700 tabular-nums">
                {user.todayMinutes}/{user.dailyGoalMinutes}p
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all"
                style={{ width: `${goalPct}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleNav("profile")}
            className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-blue-200 shadow-xs">
              <MediaImage
                src={user.avatarUrl}
                alt={user.fullName}
                fallbackTitle={user.fullName}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {user.fullName}
              </p>
              <p className="text-xs text-slate-500 tabular-nums">
                CEFR {user.currentCefr} · Mục tiêu {user.targetCefr}
              </p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 sm:h-16 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Mở menu điều hướng"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <button
                type="button"
                onClick={() => handleNav("dashboard")}
                className="hidden sm:inline font-semibold text-slate-500 hover:text-blue-600 whitespace-nowrap transition-colors"
              >
                TỰ HỌC TIẾNG ANH - PHẠM HẬU
              </button>
              <span className="hidden sm:inline text-slate-300" aria-hidden="true">
                /
              </span>
              <h1 className="truncate font-display text-base font-bold text-slate-900 sm:text-lg">
                {pageTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {activeRoute !== "ai-speaking" ? (
              <button
                type="button"
                onClick={() => handleNav("ai-speaking")}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/25 transition-all whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <Mic className="h-4 w-4" aria-hidden="true" />
                <span>Luyện nói AI</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleNav("scenarios")}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <Compass className="h-4 w-4 text-blue-600" aria-hidden="true" />
                <span>Đổi tình huống</span>
              </button>
            )}
          </div>
        </header>

        {/* Mobile Slide-Over Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="relative flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl">
              <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm">
                    <GraduationCap className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-display text-xs font-extrabold tracking-tight text-slate-900 leading-tight">
                      TỰ HỌC TIẾNG ANH
                    </span>
                    <span className="text-[9px] font-bold tracking-wider text-blue-600 uppercase">
                      PHẠM HẬU
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Đóng menu"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
                {WORKSPACE_NAV.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeRoute === item.route;
                  return (
                    <button
                      key={item.route}
                      type="button"
                      onClick={() => handleNav(item.route)}
                      className={`flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-500/20"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}

                <div className="my-3 border-t border-slate-200 pt-3 space-y-1">
                  <button
                    type="button"
                    onClick={() => handleNav("landing")}
                    className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <Home className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Trang giới thiệu</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      void onLogout();
                    }}
                    disabled={loggingOut}
                    className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3.5 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</span>
                  </button>
                </div>
              </nav>
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-24 sm:px-6 md:pb-8 lg:px-8 lg:py-8">
          {children}
        </main>

        {/* Mobile-First Bottom Tab Navigation */}
        <nav
          aria-label="Điều hướng nhanh trên di động"
          className="fixed right-0 bottom-0 left-0 z-30 flex h-14 items-center justify-around border-t border-slate-200 bg-white/95 px-1 backdrop-blur-md md:hidden"
        >
          {WORKSPACE_NAV.filter((item) => MOBILE_PRIMARY_TABS.includes(item.route)).map(
            (item) => {
              const Icon = item.icon;
              const isActive = activeRoute === item.route;
              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => handleNav(item.route)}
                  className={`flex min-h-[44px] min-w-[52px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-[11px] font-medium transition-colors ${
                    isActive ? "text-blue-600 font-bold" : "text-slate-500"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${isActive ? "text-blue-600" : "text-slate-400"}`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.shortLabel}</span>
                </button>
              );
            }
          )}
        </nav>
      </div>
    </div>
  );
}
