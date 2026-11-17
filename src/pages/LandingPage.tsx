import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Menu,
  MessageSquare,
  Mic,
  Sparkles,
  TrendingUp,
  Volume2,
  X,
} from "lucide-react";
import { useState } from "react";
import { MediaImage } from "../components/MediaImage";
import { ASSETS, CEFR_DESCRIPTIONS } from "../data/sampleData";
import { speakEnglishText } from "../lib/speech";
import { AppRoute, CefrLevel } from "../types/learning";

interface LandingPageProps {
  isAuthenticated?: boolean;
  onNavigate: (route: AppRoute) => void;
  onSelectScenario: (scenarioId: string) => void;
}

const CEFR_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const CEFR_SAMPLE_LINES: Record<
  CefrLevel,
  { en: string; ipa: string; vi: string }
> = {
  A1: {
    en: "I'd like a medium iced coffee with less sugar, please.",
    ipa: "/aɪd laɪk ə ˈmiː.di.əm aɪst ˈkɒf.i wɪð les ˈʃʊɡ.ər pliːz/",
    vi: "Cho tôi một ly cà phê đá cỡ vừa ít đường nhé.",
  },
  A2: {
    en: "Could I request a window seat for my flight to Singapore?",
    ipa: "/kʊd aɪ rɪˈkwest ə ˈwɪn.doʊ siːt fɔːr maɪ flaɪt/",
    vi: "Tôi có thể xin ghế cạnh cửa sổ cho chuyến bay đi Singapore không?",
  },
  B1: {
    en: "Everything is on track, though we need to clarify Friday's timeline.",
    ipa: "/ˈev.ri.θɪŋ ɪz ɒn træk | ðoʊ wiː niːd tuː ˈkler.ə.faɪ/",
    vi: "Mọi thứ đang đúng tiến độ, dù chúng ta cần làm rõ lịch thứ Sáu.",
  },
  B2: {
    en: "There's a clear trade-off between rapid delivery and thorough QA review.",
    ipa: "/ðerz ə klɪr ˈtreɪd.ɔːf bɪˈtwiːn ˈræp.ɪd dɪˈlɪv.ər.i/",
    vi: "Luôn có sự đánh đổi rõ ràng giữa tốc độ bàn giao và kiểm tra kỹ lưỡng.",
  },
  C1: {
    en: "Transitioning to automated onboarding is both technically and economically feasible.",
    ipa: "/trænˈzɪʃ.ən.ɪŋ tuː ˈɔː.tə.meɪ.tɪd ... ˈfiː.zə.bəl/",
    vi: "Chuyển sang quy trình tự động hóa hoàn toàn khả thi về kỹ thuật và chi phí.",
  },
  C2: {
    en: "Intelligibility across global accents ought to take precedence over mimicry.",
    ipa: "/ɪnˌtel.ɪ.dʒəˈbɪl.ə.ti ... teɪk ˈpres.ɪ.dəns/",
    vi: "Khả năng truyền đạt rõ ràng liên văn hóa nên được ưu tiên hơn bắt chước giọng.",
  },
};

export function LandingPage({
  isAuthenticated = false,
  onNavigate,
  onSelectScenario,
}: LandingPageProps) {
  const [selectedCefr, setSelectedCefr] = useState<CefrLevel>("B1");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const sampleLine = CEFR_SAMPLE_LINES[selectedCefr];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => onNavigate("landing")}
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

          <nav
            aria-label="Điều hướng chính"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <a
              href="#lo-trinh"
              className="hover:text-blue-600 transition-colors whitespace-nowrap shrink-0"
            >
              Lộ trình A1–C2
            </a>
            <a
              href="#tinh-nang"
              className="hover:text-blue-600 transition-colors whitespace-nowrap shrink-0"
            >
              Kỹ năng
            </a>
            <a
              href="#tinh-huong"
              className="hover:text-blue-600 transition-colors whitespace-nowrap shrink-0"
            >
              Tình huống
            </a>
            <button
              type="button"
              onClick={() => onNavigate("dashboard")}
              className="hover:text-blue-600 transition-colors whitespace-nowrap shrink-0"
            >
              Bảng điều khiển
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate("dashboard")}
              className="hidden sm:inline-flex min-h-[40px] items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition-all whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Vào học ngay
            </button>
            <button
              type="button"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              aria-label={mobileNavOpen ? "Đóng menu" : "Mở menu"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 md:hidden"
            >
              {mobileNavOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
            <nav className="flex flex-col space-y-1 text-sm font-medium text-slate-700">
              <a
                href="#lo-trinh"
                onClick={() => setMobileNavOpen(false)}
                className="rounded-lg px-3 py-2.5 hover:bg-slate-50"
              >
                Lộ trình A1–C2
              </a>
              <a
                href="#tinh-nang"
                onClick={() => setMobileNavOpen(false)}
                className="rounded-lg px-3 py-2.5 hover:bg-slate-50"
              >
                Kỹ năng luyện tập
              </a>
              <a
                href="#tinh-huong"
                onClick={() => setMobileNavOpen(false)}
                className="rounded-lg px-3 py-2.5 hover:bg-slate-50"
              >
                Tình huống mẫu
              </a>
              <button
                type="button"
                onClick={() => {
                  setMobileNavOpen(false);
                  onNavigate("dashboard");
                }}
                className="rounded-lg px-3 py-2.5 text-left hover:bg-slate-50"
              >
                Bảng điều khiển học viên
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileNavOpen(false);
                  onNavigate("dashboard");
                }}
                className="mt-2 min-h-[44px] rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-center font-semibold text-white shadow-md shadow-blue-500/20"
              >
                Vào học ngay
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Split Section */}
      <section className="border-b border-slate-200/80 bg-gradient-to-b from-blue-50/70 via-indigo-50/30 to-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="flex flex-col justify-center lg:col-span-6">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700 shadow-xs">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                  Nền tảng Tự học Tiếng Anh thông minh · CEFR A1–C2
                </span>
              </div>
              <h1
                className="mt-4 font-display font-bold tracking-tight text-slate-900"
                style={{
                  fontSize: "clamp(2.1rem, 4vw, 3.25rem)",
                  lineHeight: 1.15,
                  textWrap: "balance",
                }}
              >
                Luyện nói, nghe và phát âm tiếng Anh{" "}
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 bg-clip-text text-transparent">
                  chuẩn xác từng cấp độ
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
                Thiết kế chuyên biệt cho người học Việt Nam: sửa lỗi âm cuối, rèn phản xạ hội
                thoại theo tình huống thực tế và xây dựng vốn từ vựng, ngữ pháp vững chắc từ
                sơ cấp A1 đến thành thạo C2.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => onNavigate("dashboard")}
                  className="inline-flex min-h-[46px] items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  <span>Vào bảng điều khiển</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("ai-speaking")}
                  className="inline-flex min-h-[46px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-700 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 shadow-xs"
                >
                  <Mic className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  <span>Mở phòng luyện nói AI</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="aspect-video h-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-md">
                <MediaImage
                  src={ASSETS.heroLearner}
                  alt="Học viên Việt Nam đang luyện nghe nói tiếng Anh tại bàn học"
                  fallbackTitle="TỰ HỌC TIẾNG ANH - PHẠM HẬU"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* 4-column summary strip below hero */}
          <div className="mt-10 grid grid-cols-1 gap-5 border-t border-slate-200/80 pt-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-blue-100/60 bg-white/70 p-4 shadow-xs">
              <p className="font-mono text-base font-bold text-blue-700 tabular-nums">
                6 cấp độ CEFR (A1–C2)
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Lộ trình chuẩn châu Âu chia rõ mục tiêu giao tiếp từng chặng.
              </p>
            </div>
            <div className="rounded-xl border border-blue-100/60 bg-white/70 p-4 shadow-xs">
              <p className="font-mono text-base font-bold text-blue-700 tabular-nums">
                5 kỹ năng tích hợp
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Nói, Nghe, Phát âm IPA, Từ vựng và Ngữ pháp ứng dụng.
              </p>
            </div>
            <div className="rounded-xl border border-blue-100/60 bg-white/70 p-4 shadow-xs">
              <p className="font-mono text-base font-bold text-blue-700 tabular-nums">
                Tối ưu cho người Việt
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Khắc phục lỗi âm cuối -s/-ed, cặp âm /θ/ và /t/, trọng âm từ.
              </p>
            </div>
            <div className="rounded-xl border border-blue-100/60 bg-white/70 p-4 shadow-xs">
              <p className="font-mono text-base font-bold text-blue-700 tabular-nums">
                9 màn hình đồng bộ
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Lưu tiến độ trực tuyến trên Cloud Firestore, mượt mà trên máy tính và di động.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive CEFR Roadmap Section */}
      <section id="lo-trinh" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Lộ trình năng lực từ A1 đến C2
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
              Chọn một cấp độ để xem mục tiêu đầu ra, trọng tâm phát âm và nghe thử câu mẫu.
            </p>
          </div>
          <div
            role="group"
            aria-label="Chọn cấp độ CEFR"
            className="inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1"
          >
            {CEFR_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setSelectedCefr(level)}
                className={`min-h-[38px] rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedCefr === level
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-blue-700 hover:bg-white/80"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-indigo-50/30 to-white p-6 md:grid-cols-12 md:p-8 shadow-sm">
          <div className="flex flex-col justify-between md:col-span-5 md:border-r md:border-blue-200/80 md:pr-6">
            <div>
              <p className="font-mono text-sm font-bold text-blue-700">
                CEFR {selectedCefr} · {CEFR_DESCRIPTIONS[selectedCefr].labelVi}
              </p>
              <h3 className="mt-2 font-display text-xl font-bold text-slate-900">
                {CEFR_DESCRIPTIONS[selectedCefr].summaryVi}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                <strong className="font-semibold text-slate-900">Trọng tâm: </strong>
                {CEFR_DESCRIPTIONS[selectedCefr].focusVi}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onNavigate("scenarios")}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700"
              >
                <span>Xem tình huống {selectedCefr}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate("vocabulary")}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-700 shadow-xs"
              >
                <span>Từ vựng {selectedCefr}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col justify-center md:col-span-7 md:pl-2">
            <div className="rounded-xl border border-blue-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-blue-700">
                  Câu giao tiếp mẫu cấp độ {selectedCefr}
                </span>
                <button
                  type="button"
                  onClick={() => speakEnglishText(sampleLine.en)}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/80 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100"
                >
                  <Volume2 className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                  <span>Nghe phát âm</span>
                </button>
              </div>
              <p className="mt-3 font-display text-lg font-bold text-slate-900">
                "{sampleLine.en}"
              </p>
              <p className="mt-1.5 font-mono text-xs font-medium text-blue-600">{sampleLine.ipa}</p>
              <p className="mt-2 text-sm text-slate-600">{sampleLine.vi}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities Section */}
      <section id="tinh-nang" className="border-y border-slate-200 bg-[#F8FAFC]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold tracking-tight text-[#0B1F3A] sm:text-3xl">
            Bốn trụ cột luyện tập trong hệ thống
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
            Chuyển đổi liền mạch giữa luyện nói, sửa phát âm, học từ vựng và theo dõi tiến độ.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 transition-colors hover:border-sky-300">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-[#1D4ED8]">
                    01. Hội thoại AI
                  </span>
                  <Mic className="h-4 w-4 text-[#0F294A]" aria-hidden="true" />
                </div>
                <h3 className="mt-3 font-display text-lg font-bold text-[#0B1F3A]">
                  Phòng luyện nói theo ngữ cảnh
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Thực hành trả lời từng lượt, xem phiên âm IPA, so sánh câu nói tự nhiên và
                  nhận gợi ý ngữ pháp bằng tiếng Việt dễ hiểu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("ai-speaking")}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1D4ED8] hover:text-[#0F294A]"
              >
                <span>Mở phòng luyện nói</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 transition-colors hover:border-sky-300">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-[#1D4ED8]">
                    02. Phát âm chuẩn
                  </span>
                  <Volume2 className="h-4 w-4 text-[#0F294A]" aria-hidden="true" />
                </div>
                <h3 className="mt-3 font-display text-lg font-bold text-[#0B1F3A]">
                  Bài tập sửa lỗi phát âm cho người Việt
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Luyện cặp âm dễ nhầm (/θ/ – /t/), âm cuối -ed/-s, trọng âm danh từ – động từ
                  và đọc đuổi (Shadowing) kèm hướng dẫn khẩu hình.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("exercises")}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1D4ED8] hover:text-[#0F294A]"
              >
                <span>Mở bài tập phát âm</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 transition-colors hover:border-sky-300">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-[#1D4ED8]">
                    03. Từ vựng CEFR
                  </span>
                  <BookOpen className="h-4 w-4 text-[#0F294A]" aria-hidden="true" />
                </div>
                <h3 className="mt-3 font-display text-lg font-bold text-[#0B1F3A]">
                  Kho từ vựng và thẻ ghi nhớ theo chủ đề
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Học từ vựng kèm phiên âm, nghe phát âm trực tiếp, lật thẻ ghi nhớ nhanh, cụm từ
                  đi kèm (collocations) và ví dụ đời sống, công sở, học thuật.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("vocabulary")}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1D4ED8] hover:text-[#0F294A]"
              >
                <span>Khám phá từ vựng</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 transition-colors hover:border-sky-300">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-[#1D4ED8]">
                    04. Theo dõi tiến độ
                  </span>
                  <TrendingUp className="h-4 w-4 text-[#0F294A]" aria-hidden="true" />
                </div>
                <h3 className="mt-3 font-display text-lg font-bold text-[#0B1F3A]">
                  Biểu đồ tiến bộ 5 kỹ năng trực quan
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Theo dõi thời lượng học hằng ngày, biểu đồ mạng nhện 5 kỹ năng, chuỗi ngày duy
                  trì và lộ trình thăng cấp từ A1 đến C2.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("progress")}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1D4ED8] hover:text-[#0F294A]"
              >
                <span>Xem báo cáo tiến độ</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Conversation Scenarios */}
      <section id="tinh-huong" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#0B1F3A] sm:text-3xl">
              Tình huống giao tiếp thực tế
            </h2>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Lựa chọn tình huống gần gũi với công việc và đời sống quốc tế để luyện phản xạ.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("scenarios")}
            className="inline-flex min-h-[40px] items-center gap-2 text-sm font-semibold text-[#1D4ED8] hover:text-[#0F294A] whitespace-nowrap"
          >
            <span>Xem toàn bộ tình huống</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-colors hover:border-sky-300">
            <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
              <MediaImage
                src={ASSETS.scenarioOffice}
                alt="Họp cập nhật tiến độ dự án bằng tiếng Anh"
                fallbackTitle="Họp cập nhật tiến độ dự án"
              />
            </div>
            <div className="p-6">
              <p className="text-xs font-medium text-slate-500">
                CEFR B1 · Công việc · 12 phút
              </p>
              <h3 className="mt-2 font-display text-xl font-bold text-slate-900">
                Họp cập nhật tiến độ dự án
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Thực hành báo cáo công việc đã hoàn thành, trình bày trở ngại kỹ thuật và thống
                nhất kế hoạch tiếp theo với quản lý dự án.
              </p>
              <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                  <span>Mẫu câu báo cáo trạng thái đúng tiến độ</span>
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                  <span>Sửa phát âm đuôi -ed và trọng âm từ chuyên ngành</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onSelectScenario("sc-meeting-b1");
                  onNavigate("ai-speaking");
                }}
                className="mt-5 inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700"
              >
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Luyện tình huống này</span>
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-colors hover:border-blue-300 shadow-xs">
            <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
              <MediaImage
                src={ASSETS.scenarioAirport}
                alt="Làm thủ tục check-in tại sân bay quốc tế"
                fallbackTitle="Làm thủ tục sân bay quốc tế"
              />
            </div>
            <div className="p-6">
              <p className="text-xs font-medium text-slate-500">
                CEFR A2 · Du lịch · 8 phút
              </p>
              <h3 className="mt-2 font-display text-xl font-bold text-slate-900">
                Làm thủ tục check-in tại sân bay
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Giao tiếp tự tin tại quầy hàng không: trình hộ chiếu, yêu cầu ghế cạnh cửa sổ,
                ký gửi hành lý và xác nhận cổng lên máy bay.
              </p>
              <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                  <span>Nghe hiểu số cổng và giờ khởi hành</span>
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                  <span>Câu hỏi lịch sự khi cần hỗ trợ đặc biệt</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onSelectScenario("sc-airport-a2");
                  onNavigate("ai-speaking");
                }}
                className="mt-5 inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700"
              >
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Luyện tình huống này</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
            <div className="md:col-span-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 text-white shadow-md">
                  <GraduationCap className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-display text-base font-extrabold text-white leading-tight">
                    TỰ HỌC TIẾNG ANH
                  </p>
                  <p className="text-[10px] font-bold tracking-wider text-blue-400 uppercase">
                    PHẠM HẬU
                  </p>
                </div>
              </div>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300">
                Nền tảng Tự học Tiếng Anh - Phạm Hậu giúp người học Việt Nam phát triển toàn diện kỹ
                năng nói, nghe, phát âm, từ vựng và ngữ pháp từ CEFR A1 đến C2.
              </p>
            </div>
            <div className="md:col-span-7">
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 text-sm">
                <div className="space-y-2.5">
                  <p className="font-semibold text-white">Học tập</p>
                  <button
                    type="button"
                    onClick={() => onNavigate("dashboard")}
                    className="block text-slate-300 hover:text-white"
                  >
                    Bảng điều khiển
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate("ai-speaking")}
                    className="block text-slate-300 hover:text-white"
                  >
                    Luyện nói AI
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate("vocabulary")}
                    className="block text-slate-300 hover:text-white"
                  >
                    Từ vựng CEFR
                  </button>
                </div>
                <div className="space-y-2.5">
                  <p className="font-semibold text-white">Thực hành</p>
                  <button
                    type="button"
                    onClick={() => onNavigate("scenarios")}
                    className="block text-slate-300 hover:text-white"
                  >
                    Tình huống hội thoại
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate("exercises")}
                    className="block text-slate-300 hover:text-white"
                  >
                    Bài tập phát âm
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate("progress")}
                    className="block text-slate-300 hover:text-white"
                  >
                    Tiến độ học tập
                  </button>
                </div>
                <div className="space-y-2.5">
                  <p className="font-semibold text-white">Tài khoản</p>
                  <button
                    type="button"
                    onClick={() => onNavigate("dashboard")}
                    className="block text-slate-300 hover:text-white"
                  >
                    Bảng điều khiển học tập
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate("profile")}
                    className="block text-slate-300 hover:text-white"
                  >
                    Hồ sơ & Cài đặt
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-slate-800 pt-6 text-xs text-slate-400">
            © 2026 TỰ HỌC TIẾNG ANH - PHẠM HẬU. Nền tảng luyện nói & phát âm tiếng Anh từ CEFR A1 đến C2.
          </div>
        </div>
      </footer>
    </div>
  );
}
