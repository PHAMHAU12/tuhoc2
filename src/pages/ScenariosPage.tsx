import {
  ArrowRight,
  Loader2,
  MessageSquare,
  Search,
  Sparkles,
  Users,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CatalogEmptyState } from "../components/CatalogEmptyState";
import { CefrFilterBar } from "../components/CefrFilterBar";
import { speakEnglishText } from "../lib/speech";
import {
  CatalogConversationScenario,
  CefrLevel,
  DatasetVerificationResult,
  UserProfile,
} from "../types/learning";

interface ScenariosPageProps {
  user: UserProfile;
  scenarios: CatalogConversationScenario[];
  loadingData: boolean;
  isAdmin: boolean;
  importingDataset: boolean;
  onImportDataset: () => Promise<DatasetVerificationResult | null>;
  onStartScenarioInStudio: (scenario: CatalogConversationScenario) => void;
}

export function ScenariosPage({
  user,
  scenarios,
  loadingData,
  isAdmin,
  importingDataset,
  onImportDataset,
  onStartScenarioInStudio,
}: ScenariosPageProps) {
  const [cefrFilter, setCefrFilter] = useState<"ALL" | CefrLevel>("ALL");
  const [topicFilter, setTopicFilter] = useState<string>("Tất cả");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");

  const availableTopics = useMemo(() => {
    const unique = Array.from(new Set(scenarios.map((item) => item.topic))).sort((a, b) =>
      a.localeCompare(b)
    );
    return ["Tất cả", ...unique];
  }, [scenarios]);

  useEffect(() => {
    if (topicFilter !== "Tất cả" && !availableTopics.includes(topicFilter)) {
      setTopicFilter("Tất cả");
    }
  }, [availableTopics, topicFilter]);

  const filteredScenarios = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return scenarios.filter((item) => {
      const matchCefr = cefrFilter === "ALL" || item.level === cefrFilter;
      const matchTopic = topicFilter === "Tất cả" || item.topic === topicFilter;
      const matchQuery =
        !normalized ||
        item.topic.toLowerCase().includes(normalized) ||
        item.context_vi.toLowerCase().includes(normalized) ||
        item.id.toLowerCase().includes(normalized) ||
        item.roles.some(
          (r) =>
            r.role.toLowerCase().includes(normalized) ||
            r.description_vi.toLowerCase().includes(normalized)
        ) ||
        item.useful_phrases.some(
          (p) =>
            p.en.toLowerCase().includes(normalized) ||
            p.vi.toLowerCase().includes(normalized)
        );
      return matchCefr && matchTopic && matchQuery;
    });
  }, [scenarios, cefrFilter, topicFilter, query]);

  const previewScenario =
    filteredScenarios.find((item) => item.id === selectedId) ??
    filteredScenarios[0] ??
    null;

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-xl font-bold text-[#0B1F3A]">
              Tình huống hội thoại thực tế (A1–C2)
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Dữ liệu từ collection{" "}
              <span className="font-mono text-xs text-[#0F294A]">conversation_scenarios</span> trên
              Cloud Firestore · Xem vai trò, hội thoại mẫu, cụm từ hữu ích và chuyển thẳng vào
              phòng luyện nói AI.
            </p>
          </div>
          <span className="font-mono text-xs font-semibold text-[#0F294A] tabular-nums shrink-0">
            {filteredScenarios.length}/{scenarios.length} tình huống
          </span>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-sm">
            <Search
              className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm chủ đề, bối cảnh hoặc cụm từ mẫu..."
              aria-label="Tìm kiếm tình huống hội thoại"
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
            />
          </div>

          <CefrFilterBar value={cefrFilter} onChange={setCefrFilter} />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <label htmlFor="scenario-topic-select" className="text-xs font-medium text-slate-600">
            Chủ đề:
          </label>
          <select
            id="scenario-topic-select"
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
      </div>

      {loadingData && scenarios.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-10 text-sm text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin text-[#1D4ED8]" aria-hidden="true" />
          <span>Đang tải các tình huống hội thoại từ Cloud Firestore...</span>
        </div>
      ) : scenarios.length === 0 ? (
        <CatalogEmptyState
          collectionName="conversation_scenarios"
          titleVi="Chưa có tình huống hội thoại nào trong Firestore"
          descriptionVi="Các tình huống nhập vai từ CEFR A1 đến C2 sẽ hiển thị tại đây sau khi Starter Dataset được nhập vào collection conversation_scenarios."
          isAdmin={isAdmin}
          importingDataset={importingDataset}
          onImportDataset={onImportDataset}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Scenario Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7 lg:self-start">
            {filteredScenarios.length === 0 ? (
              <div className="col-span-full rounded-xl border border-slate-200 bg-white p-8 text-center">
                <p className="text-sm font-medium text-slate-700">
                  Không có tình huống nào khớp bộ lọc hiện tại.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCefrFilter("ALL");
                    setTopicFilter("Tất cả");
                    setQuery("");
                  }}
                  className="mt-3 min-h-[38px] rounded-lg bg-[#0F294A] px-4 py-1.5 text-xs font-semibold text-white"
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            ) : (
              filteredScenarios.map((scenario) => {
                const isSelected = previewScenario?.id === scenario.id;
                return (
                  <article
                    key={scenario.id}
                    className={`flex flex-col justify-between overflow-hidden rounded-xl border bg-white transition-colors ${
                      isSelected
                        ? "border-[#1D4ED8] bg-[#F8FBFF]"
                        : "border-slate-200 hover:border-sky-300"
                    }`}
                  >
                    <div>
                      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-5 py-4 text-white">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-blue-400">
                            CEFR {scenario.level}
                          </span>
                          <span className="font-mono text-[11px] text-blue-300/80">
                            {scenario.id}
                          </span>
                        </div>
                        <h3 className="mt-1 font-display text-base font-bold leading-snug">
                          {scenario.topic}
                        </h3>
                      </div>

                      <div className="p-5 space-y-3">
                        <p className="text-xs leading-relaxed text-slate-700">
                          {scenario.context_vi}
                        </p>

                        <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-600">
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-medium">
                            <Users className="h-3 w-3 text-blue-600" aria-hidden="true" />
                            {scenario.roles.map((r) => r.role).join(" & ")}
                          </span>
                          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono tabular-nums">
                            {scenario.dialogue.length} lượt thoại
                          </span>
                          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono tabular-nums">
                            {scenario.useful_phrases.length} cụm mẫu
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedId(scenario.id)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Xem chi tiết
                      </button>
                      <button
                        type="button"
                        onClick={() => onStartScenarioInStudio(scenario)}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:from-blue-700 hover:to-indigo-700"
                      >
                        <span>Luyện với AI</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* Right Scenario Preview Panel */}
          <aside className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 lg:sticky lg:top-24 lg:self-start">
            {previewScenario ? (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <p className="text-xs font-semibold text-[#1D4ED8]">
                    CEFR {previewScenario.level} · Mã: {previewScenario.id}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-bold text-[#0B1F3A]">
                    {previewScenario.topic}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    {previewScenario.context_vi}
                  </p>
                </div>

                {/* Roles */}
                <div>
                  <p className="text-xs font-semibold text-slate-700">Vai trò nhập vai</p>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {previewScenario.roles.map((r) => (
                      <div
                        key={r.role}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs"
                      >
                        <p className="font-semibold text-[#0B1F3A]">{r.role}</p>
                        <p className="mt-0.5 text-slate-600">{r.description_vi}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sample Dialogue */}
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-700">Hội thoại mẫu</p>
                    <button
                      type="button"
                      onClick={() =>
                        speakEnglishText(
                          previewScenario.dialogue.map((l) => l.en).join(" "),
                          { accent: user.preferredAccent, rate: user.speechRate }
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:text-[#0F294A]"
                    >
                      <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Nghe cả đoạn</span>
                    </button>
                  </div>

                  <div className="mt-3 max-h-[320px] space-y-2.5 overflow-y-auto pr-1">
                    {previewScenario.dialogue.map((line, idx) => (
                      <div
                        key={`${previewScenario.id}-line-${idx}`}
                        className={`rounded-lg p-3 text-sm ${
                          idx % 2 === 0
                            ? "bg-[#F4F8FF] text-[#0B1F3A]"
                            : "bg-slate-50 text-slate-900"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#0F294A]">
                            {line.speaker}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              speakEnglishText(line.en, {
                                accent: user.preferredAccent,
                                rate: user.speechRate,
                              })
                            }
                            aria-label={`Nghe câu của ${line.speaker}`}
                            className="rounded p-1 text-[#1D4ED8] hover:bg-white"
                          >
                            <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                        <p className="mt-1 font-medium leading-relaxed">{line.en}</p>
                        {user.showVietnameseHints && (
                          <p className="mt-1 text-xs text-slate-600">{line.vi}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Useful Phrases */}
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-700">
                    Cụm từ & cấu trúc hữu ích
                  </p>
                  <div className="mt-2 space-y-2">
                    {previewScenario.useful_phrases.map((phrase, idx) => (
                      <div
                        key={`${previewScenario.id}-phrase-${idx}`}
                        className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#0B1F3A]">{phrase.en}</p>
                          <p className="mt-0.5 text-xs text-slate-600">{phrase.vi}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            speakEnglishText(phrase.en, {
                              accent: user.preferredAccent,
                              rate: user.speechRate,
                            })
                          }
                          aria-label={`Nghe cụm từ ${phrase.en}`}
                          className="shrink-0 rounded p-1 text-[#1D4ED8] hover:bg-[#F4F8FF]"
                        >
                          <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Coaching Instruction */}
                <div className="rounded-lg border border-sky-200 bg-[#F4F8FF] p-3.5 text-xs">
                  <p className="flex items-center gap-1.5 font-semibold text-[#0F294A]">
                    <Sparkles className="h-3.5 w-3.5 text-[#1D4ED8]" aria-hidden="true" />
                    <span>Hướng dẫn AI Coach cho tình huống này</span>
                  </p>
                  <p className="mt-1 leading-relaxed text-slate-700">
                    {previewScenario.ai_coaching_instruction_vi}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onStartScenarioInStudio(previewScenario)}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-all"
                >
                  <MessageSquare className="h-4 w-4" aria-hidden="true" />
                  <span>Vào phòng luyện nói với tình huống này</span>
                </button>
              </div>
            ) : null}
          </aside>
        </div>
      )}
    </div>
  );
}
