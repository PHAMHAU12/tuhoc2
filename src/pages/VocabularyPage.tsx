import {
  Bookmark,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCw,
  Search,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CatalogEmptyState } from "../components/CatalogEmptyState";
import { CefrFilterBar } from "../components/CefrFilterBar";
import { speakEnglishText } from "../lib/speech";
import {
  CatalogVocabularyItem,
  CefrLevel,
  DatasetVerificationResult,
  UserProfile,
} from "../types/learning";

interface VocabularyPageProps {
  user: UserProfile;
  vocabulary: CatalogVocabularyItem[];
  loadingData: boolean;
  isAdmin: boolean;
  importingDataset: boolean;
  onImportDataset: () => Promise<DatasetVerificationResult | null>;
  onToggleMastered: (wordId: string) => Promise<void>;
  onToggleBookmarked: (wordId: string) => Promise<void>;
}

export function VocabularyPage({
  user,
  vocabulary,
  loadingData,
  isAdmin,
  importingDataset,
  onImportDataset,
  onToggleMastered,
  onToggleBookmarked,
}: VocabularyPageProps) {
  const [cefrFilter, setCefrFilter] = useState<"ALL" | CefrLevel>("ALL");
  const [topicFilter, setTopicFilter] = useState<string>("Tất cả");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>(vocabulary[0]?.id ?? "");
  const [viewMode, setViewMode] = useState<"list" | "flashcard">("list");
  const [cardFlipped, setCardFlipped] = useState(false);

  const availableTopics = useMemo(() => {
    const unique = Array.from(new Set(vocabulary.map((item) => item.topic))).sort((a, b) =>
      a.localeCompare(b)
    );
    return ["Tất cả", ...unique];
  }, [vocabulary]);

  useEffect(() => {
    if (topicFilter !== "Tất cả" && !availableTopics.includes(topicFilter)) {
      setTopicFilter("Tất cả");
    }
  }, [availableTopics, topicFilter]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return vocabulary.filter((item) => {
      const matchesCefr = cefrFilter === "ALL" || item.level === cefrFilter;
      const matchesTopic = topicFilter === "Tất cả" || item.topic === topicFilter;
      const matchesBookmark = !bookmarkedOnly || Boolean(item.bookmarked);
      const matchesQuery =
        !normalized ||
        item.word.toLowerCase().includes(normalized) ||
        item.meaning_vi.toLowerCase().includes(normalized) ||
        item.topic.toLowerCase().includes(normalized) ||
        item.example_en.toLowerCase().includes(normalized) ||
        item.id.toLowerCase().includes(normalized);
      return matchesCefr && matchesTopic && matchesBookmark && matchesQuery;
    });
  }, [vocabulary, cefrFilter, topicFilter, bookmarkedOnly, query]);

  const activeIndex = Math.max(
    0,
    filtered.findIndex((item) => item.id === selectedId)
  );
  const activeWord = filtered[activeIndex] ?? filtered[0] ?? null;

  const masteredCount = vocabulary.filter((item) => item.mastered).length;
  const bookmarkedCount = vocabulary.filter((item) => item.bookmarked).length;
  const masteryPct = Math.round((masteredCount / Math.max(1, vocabulary.length)) * 100);

  const stepCard = (delta: number) => {
    if (filtered.length === 0) return;
    const nextIdx = (activeIndex + delta + filtered.length) % filtered.length;
    setSelectedId(filtered[nextIdx].id);
    setCardFlipped(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Summary */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0B1F3A]">
            Kho từ vựng theo khung CEFR (A1–C2)
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Dữ liệu trực tiếp từ Cloud Firestore · Lưu từ vựng quan tâm, nghe phát âm chuẩn và đồng
            bộ trạng thái đã thuộc theo tài khoản của bạn.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end shrink-0">
          <p className="font-display text-base font-bold text-[#0B1F3A] tabular-nums">
            {masteredCount}/{vocabulary.length} đã thuộc ({masteryPct}%) · {bookmarkedCount} đã
            lưu
          </p>
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                viewMode === "list"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Danh sách chi tiết
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("flashcard");
                setCardFlipped(false);
              }}
              className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                viewMode === "flashcard"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Thẻ ghi nhớ
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
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
              placeholder="Tìm từ tiếng Anh, nghĩa Việt hoặc chủ đề..."
              aria-label="Tìm kiếm từ vựng"
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
            />
          </div>

          <CefrFilterBar value={cefrFilter} onChange={setCefrFilter} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="vocab-topic-select" className="text-xs font-medium text-slate-600">
              Chủ đề ({Math.max(0, availableTopics.length - 1)}):
            </label>
            <select
              id="vocab-topic-select"
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
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              Hiển thị {filtered.length}/{vocabulary.length} mục
            </span>
          </div>

          <button
            type="button"
            onClick={() => setBookmarkedOnly((prev) => !prev)}
            className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              bookmarkedOnly
                ? "bg-[#1D4ED8] text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Từ đã lưu ({bookmarkedCount})</span>
          </button>
        </div>
      </div>

      {/* Loading / Firestore Empty / Search Empty / Content */}
      {loadingData && vocabulary.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-10 text-sm text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin text-[#1D4ED8]" aria-hidden="true" />
          <span>Đang tải kho từ vựng từ Cloud Firestore...</span>
        </div>
      ) : vocabulary.length === 0 ? (
        <CatalogEmptyState
          collectionName="vocabulary"
          titleVi="Kho từ vựng Firestore chưa có dữ liệu"
          descriptionVi="Bộ từ vựng CEFR A1–C2 sẽ xuất hiện tại đây ngay sau khi Starter Dataset được nhập vào collection vocabulary trên Cloud Firestore."
          isAdmin={isAdmin}
          importingDataset={importingDataset}
          onImportDataset={onImportDataset}
        />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <p className="mt-3 font-display text-base font-semibold text-[#0B1F3A]">
            Không tìm thấy từ vựng phù hợp
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Hãy thử xóa từ khóa tìm kiếm, đổi chủ đề hoặc tắt bộ lọc từ đã lưu.
          </p>
          <button
            type="button"
            onClick={() => {
              setCefrFilter("ALL");
              setTopicFilter("Tất cả");
              setBookmarkedOnly(false);
              setQuery("");
            }}
            className="mt-4 min-h-[40px] rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:from-blue-700 hover:to-indigo-700"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      ) : viewMode === "flashcard" && activeWord ? (
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span className="font-mono tabular-nums">
              Thẻ {activeIndex + 1} / {filtered.length} · ID: {activeWord.id}
            </span>
            <span>
              CEFR {activeWord.level} · {activeWord.topic}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            {!cardFlipped ? (
              <div className="space-y-4 py-6">
                <p className="text-xs font-semibold text-[#1D4ED8]">
                  {activeWord.part_of_speech}
                </p>
                <h3 className="font-display text-4xl font-bold text-[#0B1F3A]">
                  {activeWord.word}
                </h3>
                {user.showIpaNotation && (
                  <p className="font-mono text-base text-[#1D4ED8]">{activeWord.ipa}</p>
                )}
                <div className="pt-4 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      speakEnglishText(activeWord.word, {
                        accent: user.preferredAccent,
                        rate: user.speechRate,
                      })
                    }
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-[#0F294A] hover:bg-slate-50"
                  >
                    <Volume2 className="h-4 w-4 text-[#1D4ED8]" aria-hidden="true" />
                    <span>Nghe phát âm</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardFlipped(true)}
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <RotateCw className="h-4 w-4" aria-hidden="true" />
                    <span>Lật xem nghĩa</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4 text-left">
                <div className="flex items-center justify-between">
                  <span className="font-display text-xl font-bold text-[#0B1F3A]">
                    {activeWord.word} ({activeWord.part_of_speech})
                  </span>
                  <button
                    type="button"
                    onClick={() => setCardFlipped(false)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8]"
                  >
                    <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Mặt trước</span>
                  </button>
                </div>
                <p className="text-lg font-semibold text-slate-900">
                  {activeWord.meaning_vi}
                </p>
                <div className="rounded-lg bg-[#F4F8FF] p-3.5 text-sm">
                  <p className="font-medium text-[#0B1F3A]">"{activeWord.example_en}"</p>
                  <p className="mt-1 text-xs text-slate-600">{activeWord.example_vi}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => stepCard(-1)}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-[#0F294A] hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span>Thẻ trước</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void onToggleBookmarked(activeWord.id)}
                className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold ${
                  activeWord.bookmarked
                    ? "bg-[#1D4ED8] text-white"
                    : "border border-slate-200 bg-white text-[#0F294A]"
                }`}
              >
                <Bookmark className="h-4 w-4" aria-hidden="true" />
                <span>{activeWord.bookmarked ? "Đã lưu" : "Lưu từ"}</span>
              </button>
              <button
                type="button"
                onClick={() => void onToggleMastered(activeWord.id)}
                className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold ${
                  activeWord.mastered
                    ? "bg-emerald-700 text-white"
                    : "bg-[#0F294A] text-white"
                }`}
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>{activeWord.mastered ? "Đã thuộc" : "Đánh dấu thuộc"}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => stepCard(1)}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-[#0F294A] hover:bg-slate-50"
            >
              <span>Thẻ tiếp theo</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="max-h-[640px] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-white lg:col-span-5">
            {filtered.map((item) => {
              const isSelected = activeWord?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors ${
                    isSelected ? "bg-[#F4F8FF]" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-display text-sm font-bold text-[#0B1F3A]">
                        {item.word}
                      </p>
                      <span className="font-mono text-[11px] font-semibold text-[#1D4ED8]">
                        {item.level}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-600">
                      {item.topic} · {item.meaning_vi}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold whitespace-nowrap ${
                      item.mastered
                        ? "text-emerald-700"
                        : item.bookmarked
                          ? "text-[#1D4ED8]"
                          : "text-slate-400"
                    }`}
                  >
                    {item.mastered ? "Đã thuộc" : item.bookmarked ? "Đã lưu" : "Đang học"}
                  </span>
                </button>
              );
            })}
          </div>

          {activeWord && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7 lg:self-start">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    CEFR {activeWord.level} · {activeWord.part_of_speech} · {activeWord.topic} ·{" "}
                    <span className="font-mono">{activeWord.id}</span>
                  </p>
                  <h3 className="mt-1 font-display text-3xl font-bold text-[#0B1F3A]">
                    {activeWord.word}
                  </h3>
                  {user.showIpaNotation && (
                    <p className="mt-1 font-mono text-sm text-[#1D4ED8]">
                      {activeWord.ipa}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      speakEnglishText(activeWord.word, {
                        accent: user.preferredAccent,
                        rate: user.speechRate,
                      })
                    }
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#0F294A] hover:bg-slate-50"
                  >
                    <Volume2 className="h-4 w-4 text-[#1D4ED8]" aria-hidden="true" />
                    <span>Nghe phát âm</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void onToggleBookmarked(activeWord.id)}
                    className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                      activeWord.bookmarked
                        ? "bg-[#1D4ED8] text-white hover:bg-[#1E40AF]"
                        : "border border-slate-200 bg-white text-[#0F294A] hover:bg-slate-50"
                    }`}
                  >
                    <Bookmark className="h-4 w-4" aria-hidden="true" />
                    <span>{activeWord.bookmarked ? "Đã lưu" : "Lưu từ"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void onToggleMastered(activeWord.id)}
                    className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                      activeWord.mastered
                        ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-xs"
                    }`}
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {activeWord.mastered ? "Đã thuộc từ này" : "Đánh dấu đã thuộc"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="mt-5 space-y-5">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Nghĩa tiếng Việt</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {activeWord.meaning_vi}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-500">
                      Câu ví dụ trong giao tiếp
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        speakEnglishText(activeWord.example_en, {
                          accent: user.preferredAccent,
                          rate: user.speechRate,
                        })
                      }
                      className="text-xs font-semibold text-[#1D4ED8] hover:text-[#0F294A]"
                    >
                      Nghe câu ví dụ
                    </button>
                  </div>
                  <p className="mt-2 rounded-lg bg-[#F4F8FF] p-3.5 text-sm font-medium text-[#0B1F3A]">
                    "{activeWord.example_en}"
                  </p>
                  {user.showVietnameseHints && (
                    <p className="mt-2 text-sm text-slate-600">{activeWord.example_vi}</p>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
