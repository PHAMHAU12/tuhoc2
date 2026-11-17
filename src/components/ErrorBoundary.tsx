import { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || "Đã xảy ra lỗi hiển thị không mong muốn.",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 text-center shadow-lg shadow-blue-500/5">
            <h1 className="font-display text-xl font-bold text-slate-900">
              TỰ HỌC TIẾNG ANH - PHẠM HẬU
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Ứng dụng gặp sự cố tạm thời khi hiển thị giao diện.
            </p>
            <p className="mt-2 rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-700">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 min-h-[42px] rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
