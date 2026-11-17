import { Database, Loader2, Upload } from "lucide-react";
import { ADMIN_EMAIL } from "../lib/firebase/config";
import { DatasetVerificationResult } from "../types/learning";

interface CatalogEmptyStateProps {
  collectionName: string;
  titleVi: string;
  descriptionVi: string;
  isAdmin: boolean;
  importingDataset: boolean;
  onImportDataset: () => Promise<DatasetVerificationResult | null>;
}

export function CatalogEmptyState({
  collectionName,
  titleVi,
  descriptionVi,
  isAdmin,
  importingDataset,
  onImportDataset,
}: CatalogEmptyStateProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center sm:p-10">
      <Database className="mx-auto h-9 w-9 text-[#1D4ED8]" aria-hidden="true" />
      <h3 className="mt-3 font-display text-lg font-bold text-[#0B1F3A]">{titleVi}</h3>
      <p className="mx-auto mt-1.5 max-w-xl text-sm leading-relaxed text-slate-600">
        {descriptionVi}
      </p>

      <div className="mx-auto mt-4 max-w-xl rounded-lg border border-slate-200 bg-[#F8FAFC] p-4 text-left text-xs text-slate-700 space-y-2">
        <p>
          Collection Firestore hiện chưa có dữ liệu:{" "}
          <span className="font-mono font-semibold text-[#0F294A]">{collectionName}</span>
        </p>
        {isAdmin ? (
          <p>
            Bạn đang đăng nhập bằng tài khoản quản trị viên ({ADMIN_EMAIL}). Bạn có thể nhập
            ngay 36 từ vựng, 6 tình huống hội thoại và 6 bài tập nói từ Starter Dataset lên Cloud
            Firestore.
          </p>
        ) : (
          <p>
            Quản trị viên có thể nhập dữ liệu bằng tài khoản{" "}
            <span className="font-mono font-semibold">{ADMIN_EMAIL}</span> trong phần Hồ sơ &
            Cài đặt, hoặc chạy lệnh CLI:{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[#0F294A]">
              npm run import:dataset
            </code>
          </p>
        )}
      </div>

      {isAdmin && (
        <button
          type="button"
          disabled={importingDataset}
          onClick={() => void onImportDataset()}
          className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-all disabled:opacity-60"
        >
          {importingDataset ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="h-4 w-4" aria-hidden="true" />
          )}
          <span>
            {importingDataset
              ? "Đang nhập dữ liệu lên Cloud Firestore..."
              : "Nhập Starter Dataset vào Firestore"}
          </span>
        </button>
      )}
    </div>
  );
}
