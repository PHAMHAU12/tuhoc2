import { Info, X } from "lucide-react";
import { useState } from "react";

interface PhaseNoticeBannerProps {
  message?: string;
}

export function PhaseNoticeBanner({
  message = "Giai đoạn 1 (Bản mẫu kiến trúc): Giao diện đang hiển thị dữ liệu học tập mẫu. Firebase Auth, Cloud Firestore và Gemini API máy chủ đã được chuẩn bị sẵn sàng cho Giai đoạn 2.",
}: PhaseNoticeBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-sm text-blue-950 shadow-xs">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
        <p className="leading-relaxed">{message}</p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Đóng thông báo giai đoạn 1"
        className="rounded-md p-1 text-slate-500 transition-colors hover:bg-sky-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-sky-600"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
