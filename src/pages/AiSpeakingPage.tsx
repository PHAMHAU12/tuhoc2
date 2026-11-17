import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Languages,
  Loader2,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { CONVERSATION_SCENARIOS, SPEAKING_TOPICS } from "../data/sampleData";
import {
  ConversationTurnApiResponse,
  requestConversationTurn,
} from "../lib/api/geminiClient";
import {
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  speakEnglishText,
  SpeechRecognitionController,
  startBrowserSpeechRecognition,
  stopEnglishSpeech,
} from "../lib/speech";
import {
  CatalogConversationScenario,
  CefrLevel,
  ConversationChatMessage,
  SpeakingHistoryRecord,
  SpeakingTopicKey,
  UserProfile,
} from "../types/learning";

export interface SpeakingLessonMeta {
  id: string;
  titleVi: string;
  titleEn: string;
  cefr: CefrLevel;
  durationMinutes: number;
}

interface AiSpeakingPageProps {
  user: UserProfile;
  selectedScenarioId: string;
  selectedCatalogScenario?: CatalogConversationScenario | null;
  scenarioRequestedAt?: number;
  speakingHistory: SpeakingHistoryRecord[];
  onSaveSpeakingSession: (
    payload: Omit<SpeakingHistoryRecord, "id" | "uid" | "createdAtLabel">,
    lessonMeta: SpeakingLessonMeta
  ) => Promise<void>;
}

const CEFR_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

function mapScenarioCategoryToTopic(category: string): SpeakingTopicKey {
  const lower = category.toLowerCase();
  if (lower.includes("du lịch") || lower.includes("travel") || lower.includes("plan")) {
    return "travel";
  }
  if (
    lower.includes("công việc") ||
    lower.includes("meeting") ||
    lower.includes("recommendation") ||
    lower.includes("work")
  ) {
    return "work";
  }
  if (
    lower.includes("học thuật") ||
    lower.includes("forum") ||
    lower.includes("research") ||
    lower.includes("argument")
  ) {
    return "school";
  }
  if (lower.includes("coffee") || lower.includes("food") || lower.includes("order")) {
    return "food";
  }
  return "daily_life";
}

function createInitialAiMessage(params: {
  questionEn: string;
  translationVi: string;
  tipVi?: string;
}): ConversationChatMessage {
  return {
    id: `ai-init-${Date.now()}`,
    speaker: "ai",
    textEn: params.questionEn,
    translationVi: params.translationVi,
    showTranslation: false,
    grammarExplanationVi: params.tipVi,
  };
}

export function AiSpeakingPage({
  user,
  selectedScenarioId,
  selectedCatalogScenario,
  scenarioRequestedAt,
  speakingHistory,
  onSaveSpeakingSession,
}: AiSpeakingPageProps) {
  const matchedScenario = useMemo(
    () => CONVERSATION_SCENARIOS.find((item) => item.id === selectedScenarioId) ?? null,
    [selectedScenarioId]
  );

  const hasCatalogScenario = Boolean(selectedCatalogScenario);
  const hasAnyScenario = hasCatalogScenario || Boolean(matchedScenario);

  const [activeTopicKey, setActiveTopicKey] = useState<SpeakingTopicKey>(() => {
    if (selectedCatalogScenario) return mapScenarioCategoryToTopic(selectedCatalogScenario.topic);
    if (matchedScenario) return mapScenarioCategoryToTopic(matchedScenario.category);
    return "daily_life";
  });
  const [cefrLevel, setCefrLevel] = useState<CefrLevel>(() =>
    selectedCatalogScenario?.level ?? user.currentCefr
  );
  const [useScenarioContext, setUseScenarioContext] = useState<boolean>(
    Boolean(scenarioRequestedAt && hasAnyScenario)
  );

  const [accent, setAccent] = useState<"US" | "UK">(user.preferredAccent);
  const [slowSpeech, setSlowSpeech] = useState<boolean>(user.speechRate <= 0.85);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(true);

  const speechSynthesisSupported = useMemo(() => isSpeechSynthesisSupported(), []);
  const speechRecognitionSupported = useMemo(() => isSpeechRecognitionSupported(), []);

  const currentTopic = useMemo(
    () => SPEAKING_TOPICS.find((item) => item.key === activeTopicKey) ?? SPEAKING_TOPICS[0],
    [activeTopicKey]
  );

  const activeCatalog = useScenarioContext ? selectedCatalogScenario ?? null : null;
  const activeSample = !activeCatalog && useScenarioContext ? matchedScenario : null;

  const activeSessionTitleEn = activeCatalog
    ? `${activeCatalog.topic} (${activeCatalog.ai_coaching_instruction_vi})`
    : activeSample
      ? activeSample.titleEn
      : currentTopic.titleEn;

  const activeSessionTitleVi = activeCatalog
    ? activeCatalog.topic
    : activeSample
      ? activeSample.titleVi
      : currentTopic.titleVi;

  const activeAiRole = activeCatalog
    ? activeCatalog.roles
        .map((r) => `${r.role} (${r.description_vi})`)
        .join(" / ")
    : activeSample
      ? activeSample.aiRole
      : currentTopic.aiRole;

  const activeScenarioId = activeCatalog
    ? activeCatalog.id
    : activeSample
      ? activeSample.id
      : `topic-${currentTopic.key}-${cefrLevel}`;

  const buildStarterMessage = (
    topicKey: SpeakingTopicKey,
    level: CefrLevel,
    preferScenario: boolean
  ): ConversationChatMessage => {
    if (preferScenario && selectedCatalogScenario) {
      const firstLine = selectedCatalogScenario.dialogue[0];
      if (firstLine) {
        return createInitialAiMessage({
          questionEn: firstLine.en,
          translationVi: firstLine.vi,
          tipVi: `${selectedCatalogScenario.context_vi} ${selectedCatalogScenario.ai_coaching_instruction_vi}`,
        });
      }
    }
    if (preferScenario && matchedScenario) {
      const firstAiTurn =
        matchedScenario.sampleDialogue.find((d) => d.speaker === "ai") ??
        matchedScenario.sampleDialogue[0];
      if (firstAiTurn) {
        return createInitialAiMessage({
          questionEn: firstAiTurn.textEn,
          translationVi: firstAiTurn.translationVi,
          tipVi: matchedScenario.summaryVi,
        });
      }
    }
    const topicObj = SPEAKING_TOPICS.find((t) => t.key === topicKey) ?? SPEAKING_TOPICS[0];
    const starter = topicObj.starterByCefr[level];
    return createInitialAiMessage({
      questionEn: starter.questionEn,
      translationVi: starter.translationVi,
      tipVi: starter.sampleTipVi,
    });
  };

  const [messages, setMessages] = useState<ConversationChatMessage[]>(() => [
    buildStarterMessage(
      selectedCatalogScenario
        ? mapScenarioCategoryToTopic(selectedCatalogScenario.topic)
        : matchedScenario
          ? mapScenarioCategoryToTopic(matchedScenario.category)
          : "daily_life",
      selectedCatalogScenario?.level ?? user.currentCefr,
      Boolean(scenarioRequestedAt && hasAnyScenario)
    ),
  ]);

  const [inputText, setInputText] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [lastInputMethod, setLastInputMethod] = useState<"text" | "mic">("text");
  const [micError, setMicError] = useState<string | null>(null);

  const [sending, setSending] = useState(false);
  const [startingAiQuestion, setStartingAiQuestion] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionController | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Sync when user launches a scenario from ScenariosPage or Dashboard
  useEffect(() => {
    if (!scenarioRequestedAt) return;
    if (selectedCatalogScenario) {
      const mappedTopic = mapScenarioCategoryToTopic(selectedCatalogScenario.topic);
      setActiveTopicKey(mappedTopic);
      setCefrLevel(selectedCatalogScenario.level);
      setUseScenarioContext(true);
      setMessages([buildStarterMessage(mappedTopic, selectedCatalogScenario.level, true)]);
      setApiError(null);
      setSaveNotice(null);
      setMicError(null);
      return;
    }
    if (matchedScenario) {
      const mappedTopic = mapScenarioCategoryToTopic(matchedScenario.category);
      setActiveTopicKey(mappedTopic);
      setCefrLevel(matchedScenario.cefr);
      setUseScenarioContext(true);
      setMessages([buildStarterMessage(mappedTopic, matchedScenario.cefr, true)]);
      setApiError(null);
      setSaveNotice(null);
      setMicError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioRequestedAt, selectedScenarioId, selectedCatalogScenario]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length, sending]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      stopEnglishSpeech();
    };
  }, []);

  const latestAiMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].speaker === "ai") return messages[i];
    }
    return null;
  }, [messages]);

  const latestCoachingMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      if (
        msg.speaker === "ai" &&
        (msg.grammarExplanationVi ||
          msg.correctedSentenceEn ||
          (msg.naturalExpressions && msg.naturalExpressions.length > 0))
      ) {
        return msg;
      }
    }
    return null;
  }, [messages]);

  const activeSpeechRate = slowSpeech ? 0.72 : 1.0;

  const playEnglishUtterance = (messageId: string, text: string) => {
    if (!speechSynthesisSupported) {
      setApiError("Trình duyệt hiện tại không hỗ trợ đọc giọng nói (Speech Synthesis).");
      return;
    }
    if (speakingMessageId === messageId) {
      stopEnglishSpeech();
      setSpeakingMessageId(null);
      return;
    }

    speakEnglishText(text, {
      accent,
      rate: activeSpeechRate,
      onStart: () => setSpeakingMessageId(messageId),
      onEnd: () => setSpeakingMessageId(null),
      onError: () => setSpeakingMessageId(null),
    });
  };

  const resetConversation = (
    nextTopicKey: SpeakingTopicKey,
    nextLevel: CefrLevel,
    preferScenario: boolean
  ) => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimTranscript("");
    stopEnglishSpeech();
    setSpeakingMessageId(null);
    setApiError(null);
    setMicError(null);
    setSaveNotice(null);
    setInputText("");
    setMessages([buildStarterMessage(nextTopicKey, nextLevel, preferScenario)]);
  };

  const handleSelectTopic = (nextTopic: SpeakingTopicKey) => {
    setActiveTopicKey(nextTopic);
    setUseScenarioContext(false);
    resetConversation(nextTopic, cefrLevel, false);
  };

  const handleSelectCefr = (nextLevel: CefrLevel) => {
    setCefrLevel(nextLevel);
    resetConversation(activeTopicKey, nextLevel, useScenarioContext);
  };

  const handleClearConversation = () => {
    resetConversation(activeTopicKey, cefrLevel, useScenarioContext);
  };

  const handleToggleMicrophone = () => {
    setMicError(null);

    if (!speechRecognitionSupported) {
      setMicError(
        "Trình duyệt của bạn không hỗ trợ nhận diện giọng nói (Web Speech API). Vui lòng nhập câu trả lời bằng bàn phím."
      );
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsListening(false);
      setInterimTranscript("");
      return;
    }

    stopEnglishSpeech();
    setSpeakingMessageId(null);
    setIsListening(true);
    setInterimTranscript("");

    const controller = startBrowserSpeechRecognition({
      accent,
      onInterim: (interim) => {
        setInterimTranscript(interim);
      },
      onFinal: (finalChunk) => {
        setInterimTranscript("");
        setLastInputMethod("mic");
        setInputText((prev) => (prev.trim() ? `${prev.trim()} ${finalChunk}` : finalChunk));
      },
      onError: (errVi) => {
        setMicError(errVi);
        setIsListening(false);
        setInterimTranscript("");
      },
      onEnd: () => {
        setIsListening(false);
        setInterimTranscript("");
        recognitionRef.current = null;
      },
    });

    if (!controller) {
      setIsListening(false);
    } else {
      recognitionRef.current = controller;
    }
  };

  const handleToggleMessageTranslation = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, showTranslation: !msg.showTranslation } : msg
      )
    );
  };

  const handleGenerateFreshAiQuestion = async () => {
    if (startingAiQuestion || sending) return;
    stopEnglishSpeech();
    setSpeakingMessageId(null);
    setStartingAiQuestion(true);
    setApiError(null);

    try {
      const response: ConversationTurnApiResponse = await requestConversationTurn({
        mode: "start",
        topicKey: currentTopic.key,
        scenarioTitle: `${activeSessionTitleEn} (${activeSessionTitleVi})`,
        cefrLevel,
        aiRole: activeAiRole,
        history: [],
        learnerMessage: "",
      });

      if (!response.turn) {
        setApiError(response.error ?? "Không thể tạo câu hỏi mở đầu từ Gemini AI.");
        return;
      }

      const freshAiMsg: ConversationChatMessage = {
        id: `ai-${Date.now()}`,
        speaker: "ai",
        textEn: response.turn.replyEn,
        translationVi: response.turn.translationVi,
        showTranslation: false,
        grammarExplanationVi: response.turn.grammarExplanationVi,
        naturalExpressions: response.turn.naturalExpressions,
        encouragementVi: response.turn.encouragementVi,
      };

      setMessages([freshAiMsg]);
      if (autoSpeak && speechSynthesisSupported) {
        playEnglishUtterance(freshAiMsg.id, freshAiMsg.textEn);
      }
    } finally {
      setStartingAiQuestion(false);
    }
  };

  const handleSendMessage = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const cleaned = inputText.trim();
    if (!cleaned || sending) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setInterimTranscript("");
    }
    stopEnglishSpeech();
    setSpeakingMessageId(null);

    const promptBeingAnswered =
      latestAiMessage?.textEn ?? currentTopic.starterByCefr[cefrLevel].questionEn;

    const learnerMsg: ConversationChatMessage = {
      id: `learner-${Date.now()}`,
      speaker: "learner",
      textEn: cleaned,
      inputMethod: lastInputMethod,
    };

    const nextHistoryPayload = [...messages, learnerMsg].map((item) => ({
      speaker: item.speaker,
      text: item.textEn,
    }));

    setMessages((prev) => [...prev, learnerMsg]);
    setInputText("");
    setLastInputMethod("text");
    setSending(true);
    setApiError(null);
    setSaveNotice(null);

    try {
      const response = await requestConversationTurn({
        mode: "reply",
        topicKey: currentTopic.key,
        scenarioTitle: `${activeSessionTitleEn} (${activeSessionTitleVi})`,
        cefrLevel,
        aiRole: activeAiRole,
        history: nextHistoryPayload.slice(0, -1),
        learnerMessage: cleaned,
      });

      if (!response.turn) {
        setApiError(response.error ?? "Không thể nhận phản hồi từ Gemini AI.");
        return;
      }

      const turn = response.turn;
      const aiReplyMsg: ConversationChatMessage = {
        id: `ai-${Date.now()}`,
        speaker: "ai",
        textEn: turn.replyEn,
        translationVi: turn.translationVi,
        showTranslation: false,
        hasGrammarCorrection: turn.hasGrammarCorrection,
        correctedSentenceEn: turn.correctedSentenceEn,
        grammarExplanationVi: turn.grammarExplanationVi,
        naturalExpressions: turn.naturalExpressions,
        encouragementVi: turn.encouragementVi,
      };

      setMessages((prev) => [...prev, aiReplyMsg]);

      if (autoSpeak && speechSynthesisSupported) {
        playEnglishUtterance(aiReplyMsg.id, aiReplyMsg.textEn);
      }

      const naturalRewriteToSave =
        turn.correctedSentenceEn?.trim() ||
        turn.naturalExpressions?.[0] ||
        turn.replyEn;

      await onSaveSpeakingSession(
        {
          scenarioId: activeScenarioId.slice(0, 64),
          scenarioTitleVi: `${activeSessionTitleVi} (CEFR ${cefrLevel})`,
          cefr: cefrLevel,
          promptEn: promptBeingAnswered,
          learnerTranscript: cleaned,
          naturalRewrite: naturalRewriteToSave,
          grammarNotesVi: turn.grammarExplanationVi,
          pronunciationFocusVi: turn.naturalExpressions.join(" | "),
          source: "gemini-server",
        },
        {
          id: activeScenarioId.slice(0, 64),
          titleVi: activeSessionTitleVi,
          titleEn: activeSessionTitleEn,
          cefr: cefrLevel,
          durationMinutes: 5,
        }
      );

      setSaveNotice("Đã lưu lượt hội thoại và phản hồi vào Cloud Firestore.");
    } catch (err) {
      setApiError(
        err instanceof Error
          ? err.message
          : "Đã xảy ra lỗi khi trao đổi với máy chủ Gemini AI."
      );
    } finally {
      setSending(false);
    }
  };

  const handleTextareaKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const handleReplayLatest = () => {
    if (!latestAiMessage) return;
    playEnglishUtterance(latestAiMessage.id, latestAiMessage.textEn);
  };

  return (
    <div className="space-y-6">
      {/* Top Configuration Strip: Topic + CEFR + Voice Options */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-medium text-[#1D4ED8]">
              Luyện hội thoại AI · Hỏi từng câu một · CEFR {cefrLevel}
            </p>
            <h2 className="mt-0.5 font-display text-lg font-bold text-[#0B1F3A] sm:text-xl">
              {activeSessionTitleVi}
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              {activeCatalog
                ? activeCatalog.context_vi
                : activeSample
                  ? activeSample.summaryVi
                  : currentTopic.descriptionVi}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Accent switch */}
            <div
              role="group"
              aria-label="Chọn giọng đọc tiếng Anh"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-[#F8FAFC] p-1"
            >
              {(["US", "UK"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setAccent(code)}
                  className={`min-h-[34px] rounded-md px-2.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                    accent === code
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-blue-700"
                  }`}
                >
                  Anh - {code === "US" ? "Mỹ" : "Anh"}
                </button>
              ))}
            </div>

            {/* Slow Speech Toggle */}
            <button
              type="button"
              disabled={!speechSynthesisSupported}
              onClick={() => setSlowSpeech((prev) => !prev)}
              aria-pressed={slowSpeech}
              title={
                speechSynthesisSupported
                  ? "Bật hoặc tắt chế độ nói chậm để dễ nghe hơn"
                  : "Trình duyệt không hỗ trợ đọc giọng nói"
              }
              className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 ${
                slowSpeech
                  ? "border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8]"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{slowSpeech ? "Nói chậm (0.72x)" : "Tốc độ chuẩn (1.0x)"}</span>
            </button>

            {/* Auto-speak Toggle */}
            <button
              type="button"
              disabled={!speechSynthesisSupported}
              onClick={() => {
                if (autoSpeak) {
                  stopEnglishSpeech();
                  setSpeakingMessageId(null);
                }
                setAutoSpeak((prev) => !prev);
              }}
              aria-pressed={autoSpeak}
              className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 ${
                autoSpeak
                  ? "border-slate-200 bg-white text-[#0B1F3A] hover:bg-slate-50"
                  : "border-slate-200 bg-slate-100 text-slate-500"
              }`}
            >
              {autoSpeak ? (
                <Volume2 className="h-3.5 w-3.5 text-[#1D4ED8]" aria-hidden="true" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{autoSpeak ? "Tự phát tiếng Anh" : "Đã tắt tự phát"}</span>
            </button>
          </div>
        </div>

        {/* Topic Selection Row */}
        <div className="border-t border-slate-100 pt-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700">Chủ đề luyện nói:</span>
            {useScenarioContext && hasAnyScenario && (
              <button
                type="button"
                onClick={() => {
                  setUseScenarioContext(false);
                  resetConversation(activeTopicKey, cefrLevel, false);
                }}
                className="text-xs font-semibold text-[#1D4ED8] hover:underline"
              >
                Chuyển về hội thoại theo chủ đề tự do
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {SPEAKING_TOPICS.map((topic) => {
              const selected = !useScenarioContext && activeTopicKey === topic.key;
              return (
                <button
                  key={topic.key}
                  type="button"
                  onClick={() => handleSelectTopic(topic.key)}
                  className={`min-h-[38px] rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                    selected
                      ? "border-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-700"
                  }`}
                >
                  {topic.titleVi}
                </button>
              );
            })}
          </div>
        </div>

        {/* CEFR Level Selection Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 mr-1">Trình độ CEFR:</span>
            <div className="inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
              {CEFR_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => handleSelectCefr(level)}
                  className={`min-h-[34px] rounded-md px-3 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                    cefrLevel === level
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-bold"
                      : "text-slate-600 hover:text-blue-700 hover:bg-white/80"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleGenerateFreshAiQuestion()}
            disabled={startingAiQuestion || sending}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/80 px-3.5 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 whitespace-nowrap shrink-0 disabled:opacity-60 shadow-xs"
          >
            {startingAiQuestion ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" aria-hidden="true" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
            )}
            <span>
              {startingAiQuestion ? "Đang tạo câu hỏi..." : "Tạo câu hỏi mở đầu mới (AI)"}
            </span>
          </button>
        </div>
      </section>

      {/* Main Two-Zone AI Speaking Studio */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Zone: Live Conversation Stage (7 cols) */}
        <section className="flex flex-col rounded-xl border border-slate-200 bg-white lg:col-span-7">
          {/* Conversation Stage Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="font-display text-base font-bold text-[#0B1F3A]">
                Hội thoại tiếng Anh cùng AI Coach
              </h3>
              <p className="text-xs text-slate-500">
                Vai trò AI: {activeAiRole} · {messages.length} lượt trao đổi
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReplayLatest}
                disabled={!latestAiMessage || !speechSynthesisSupported}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#0B1F3A] hover:bg-slate-50 whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                {speakingMessageId && latestAiMessage?.id === speakingMessageId ? (
                  <>
                    <Square className="h-3.5 w-3.5 text-red-600" aria-hidden="true" />
                    <span>Dừng phát</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3.5 w-3.5 text-[#1D4ED8]" aria-hidden="true" />
                    <span>Nghe lại phản hồi</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClearConversation}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Xóa hội thoại</span>
              </button>
            </div>
          </div>

          {/* Conversation Messages Thread */}
          <div className="flex-1 space-y-4 overflow-y-auto p-5 max-h-[460px] min-h-[300px] bg-[#F8FAFC]">
            {messages.map((msg) => {
              const isAi = msg.speaker === "ai";
              const isSpeakingThis = speakingMessageId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isAi ? "items-start" : "items-end"}`}
                >
                  <div
                    className={`max-w-[92%] rounded-xl px-4 py-3.5 sm:max-w-[85%] ${
                      isAi
                        ? "border border-slate-200/90 bg-white text-slate-900 shadow-xs"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                    }`}
                  >
                    <p
                      className={`text-xs font-medium ${
                        isAi ? "text-slate-500" : "text-sky-200"
                      }`}
                    >
                      {isAi
                        ? `AI Coach · CEFR ${cefrLevel}`
                        : `Bạn · ${
                            msg.inputMethod === "mic" ? "Nói qua Micro" : "Nhập văn bản"
                          }`}
                    </p>

                    <p className="mt-1.5 text-sm leading-relaxed sm:text-[15px]">
                      {msg.textEn}
                    </p>

                    {/* Optional On-Demand Vietnamese Translation */}
                    {isAi && msg.showTranslation && msg.translationVi && (
                      <div className="mt-2.5 border-t border-slate-100 pt-2.5 text-xs leading-relaxed text-slate-600">
                        <span className="font-semibold text-[#0F294A]">Dịch tiếng Việt: </span>
                        {msg.translationVi}
                      </div>
                    )}

                    {/* Per-Message Action Row */}
                    {isAi && (
                      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-2.5">
                        <button
                          type="button"
                          disabled={!speechSynthesisSupported}
                          onClick={() => playEnglishUtterance(msg.id, msg.textEn)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] hover:text-[#0F294A] disabled:opacity-50"
                        >
                          {isSpeakingThis ? (
                            <>
                              <Square className="h-3.5 w-3.5 text-red-600" aria-hidden="true" />
                              <span className="text-red-600">Dừng nghe</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Nghe lại</span>
                            </>
                          )}
                        </button>

                        {msg.translationVi && (
                          <button
                            type="button"
                            onClick={() => handleToggleMessageTranslation(msg.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0B1F3A]"
                          >
                            <Languages className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>
                              {msg.showTranslation ? "Ẩn bản dịch" : "Dịch tiếng Việt"}
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {sending && (
              <div className="flex items-start">
                <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin text-[#1D4ED8]" aria-hidden="true" />
                  <span>AI Coach đang lắng nghe, phân tích ngữ pháp và chuẩn bị câu hỏi tiếp theo...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Speech Support / Error / Save Notices + Composer */}
          <form onSubmit={handleSendMessage} className="border-t border-slate-200 bg-white p-5 space-y-3.5">
            {!speechRecognitionSupported && (
              <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-xs leading-relaxed text-slate-600">
                Trình duyệt hiện tại không hỗ trợ nhận diện giọng nói từ Micro (Web Speech API). Bạn
                vẫn có thể trò chuyện bình thường bằng cách nhập tiếng Anh bên dưới và nghe phản hồi
                giọng nói AI.
              </div>
            )}

            {!speechSynthesisSupported && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-900">
                Trình duyệt hiện tại không hỗ trợ phát giọng nói (Speech Synthesis). Phản hồi hội
                thoại dạng văn bản và bản dịch tiếng Việt vẫn hoạt động đầy đủ.
              </div>
            )}

            {micError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-900"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                <span>{micError}</span>
              </div>
            )}

            {apiError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs leading-relaxed text-red-800"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                <span>{apiError}</span>
              </div>
            )}

            {saveNotice && (
              <div
                role="status"
                className="rounded-lg border border-sky-200 bg-[#F4F8FF] px-3.5 py-2 text-xs text-[#0F294A]"
              >
                {saveNotice}
              </div>
            )}

            {isListening && (
              <div className="rounded-lg border border-sky-200 bg-[#F4F8FF] px-3.5 py-2.5 text-xs text-[#0F294A]">
                <span className="font-semibold">Đang nghe bằng tiếng Anh ({accent}): </span>
                <span>
                  {interimTranscript || "Hãy nói câu trả lời của bạn vào micro..."}
                </span>
              </div>
            )}

            <div>
              <label htmlFor="ai-speaking-input" className="sr-only">
                Nhập hoặc nói câu trả lời tiếng Anh của bạn
              </label>
              <textarea
                id="ai-speaking-input"
                rows={3}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (!isListening) setLastInputMethod("text");
                }}
                onKeyDown={handleTextareaKeyDown}
                placeholder="Nhập câu trả lời tiếng Anh tại đây (nhấn Enter để gửi, Shift+Enter để xuống dòng)..."
                className="w-full rounded-lg border border-slate-300 bg-white p-3.5 text-sm leading-relaxed text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleMicrophone}
                  disabled={!speechRecognitionSupported || sending}
                  className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all whitespace-nowrap shrink-0 disabled:cursor-not-allowed disabled:opacity-50 ${
                    isListening
                      ? "bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-500/30 animate-pulse"
                      : "border border-slate-300 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-700 shadow-xs"
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="h-4 w-4" aria-hidden="true" />
                      <span>Dừng Micro</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 text-blue-600" aria-hidden="true" />
                      <span>
                        {speechRecognitionSupported ? "Nói qua Micro" : "Micro không hỗ trợ"}
                      </span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="submit"
                disabled={sending || !inputText.trim()}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-all whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{sending ? "Đang phản hồi..." : "Gửi câu trả lời"}</span>
              </button>
            </div>
          </form>
        </section>

        {/* Right Zone: Polite Grammar Coaching & Natural Expressions Deck (5 cols) */}
        <aside className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 lg:self-start">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-display text-lg font-bold text-[#0B1F3A]">
              Chỉnh sửa & Gợi ý diễn đạt tự nhiên
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              AI sửa lỗi ngữ pháp nhẹ nhàng, giải thích bằng tiếng Việt và đề xuất cách nói tự nhiên
              theo trình độ CEFR {cefrLevel}.
            </p>
          </div>

          {latestCoachingMessage ? (
            <div className="space-y-5">
              {/* Grammar Correction */}
              {latestCoachingMessage.correctedSentenceEn ? (
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8]">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {latestCoachingMessage.hasGrammarCorrection
                          ? "Gợi ý sửa nhẹ để câu tự nhiên hơn"
                          : "Câu của bạn đã chính xác"}
                      </span>
                    </p>
                    <button
                      type="button"
                      disabled={!speechSynthesisSupported}
                      onClick={() =>
                        playEnglishUtterance(
                          `coach-correct-${latestCoachingMessage.id}`,
                          latestCoachingMessage.correctedSentenceEn!
                        )
                      }
                      className="text-xs font-semibold text-[#0F294A] hover:text-[#1D4ED8] disabled:opacity-50"
                    >
                      Nghe câu chuẩn
                    </button>
                  </div>
                  <p className="mt-2 rounded-lg bg-[#F4F8FF] p-3.5 text-sm font-medium leading-relaxed text-[#0B1F3A]">
                    "{latestCoachingMessage.correctedSentenceEn}"
                  </p>
                </div>
              ) : null}

              {/* Vietnamese Explanation */}
              {latestCoachingMessage.grammarExplanationVi && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-[#0B1F3A]">
                    Giải thích bằng tiếng Việt
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {latestCoachingMessage.grammarExplanationVi}
                  </p>
                </div>
              )}

              {/* Natural Expressions */}
              {latestCoachingMessage.naturalExpressions &&
                latestCoachingMessage.naturalExpressions.length > 0 && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-semibold text-[#0B1F3A]">
                      Cách diễn đạt tự nhiên nên dùng thêm
                    </p>
                    <div className="mt-2.5 space-y-2">
                      {latestCoachingMessage.naturalExpressions.map((expr, idx) => {
                        const englishOnly = expr.split("—")[0]?.trim() || expr;
                        return (
                          <div
                            key={`${expr}-${idx}`}
                            className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3"
                          >
                            <p className="text-xs leading-relaxed text-[#0B1F3A]">{expr}</p>
                            <button
                              type="button"
                              disabled={!speechSynthesisSupported}
                              onClick={() =>
                                playEnglishUtterance(`expr-${idx}`, englishOnly)
                              }
                              aria-label={`Nghe mẫu ${englishOnly}`}
                              className="shrink-0 rounded-md p-1.5 text-[#1D4ED8] hover:bg-sky-100 disabled:opacity-50"
                            >
                              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {latestCoachingMessage.encouragementVi && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs leading-relaxed text-slate-600">
                    {latestCoachingMessage.encouragementVi}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BookOpen className="h-7 w-7 text-slate-300" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-[#0B1F3A]">
                Sẵn sàng luyện hội thoại CEFR {cefrLevel}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Hãy trả lời câu hỏi ở khung bên trái bằng bàn phím hoặc micro. AI sẽ phản hồi từng
                lượt, giải thích lỗi bằng tiếng Việt và gợi ý cụm từ tự nhiên hơn.
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* Saved Conversation History (Cloud Firestore) */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-bold text-[#0B1F3A]">
              Lịch sử hội thoại đã lưu
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Lưu trữ riêng tư theo tài khoản của bạn trên Cloud Firestore
            </p>
          </div>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            {speakingHistory.length} lượt gần đây
          </span>
        </div>

        {speakingHistory.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Chưa có lượt hội thoại nào được lưu. Khi bạn gửi câu trả lời cho AI Coach, lịch sử và
            phần sửa ngữ pháp sẽ xuất hiện tại đây.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {speakingHistory.slice(0, 8).map((item) => (
              <div key={item.id} className="py-4 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-500 tabular-nums">
                    CEFR {item.cefr} · {item.scenarioTitleVi} · {item.createdAtLabel}
                  </p>
                  {item.naturalRewrite && speechSynthesisSupported && (
                    <button
                      type="button"
                      onClick={() =>
                        playEnglishUtterance(`history-${item.id}`, item.naturalRewrite)
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:text-[#0F294A]"
                    >
                      <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Nghe lại câu chuẩn</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500">Câu hỏi: "{item.promptEn}"</p>
                <p className="text-sm font-medium text-[#0B1F3A]">
                  Bạn đã trả lời: "{item.learnerTranscript}"
                </p>
                {item.naturalRewrite && (
                  <p className="text-xs font-medium text-[#1D4ED8]">
                    Gợi ý tự nhiên: "{item.naturalRewrite}"
                  </p>
                )}
                {item.grammarNotesVi && (
                  <p className="text-xs leading-relaxed text-slate-600">
                    Giải thích: {item.grammarNotesVi}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
