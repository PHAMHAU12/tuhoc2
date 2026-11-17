import { IntegrationStatus } from "../../types/learning";

export interface SpeakingFeedbackApiResponse {
  configured: boolean;
  feedback?: {
    naturalRewrite: string;
    grammarNotesVi: string;
    pronunciationFocusVi: string;
    vocabularySuggestions: string[];
    encouragementVi: string;
  };
  error?: string;
}

export interface ConversationTurnApiResponse {
  configured: boolean;
  turn?: {
    replyEn: string;
    translationVi: string;
    hasGrammarCorrection: boolean;
    correctedSentenceEn: string;
    grammarExplanationVi: string;
    naturalExpressions: string[];
    encouragementVi: string;
  };
  error?: string;
}

export async function fetchServerHealth(): Promise<IntegrationStatus> {
  try {
    const response = await window.fetch("/api/health");
    if (!response.ok) {
      throw new Error("Health check failed");
    }
    const data = await response.json();
    return {
      serverReady: Boolean(data.serverReady),
      geminiConfigured: Boolean(data.geminiConfigured),
      firebasePrepared: Boolean(data.firebasePrepared),
      firebaseConnected: Boolean(data.firebaseConnected),
      firebaseProjectId:
        typeof data.firebaseProjectId === "string" ? data.firebaseProjectId : undefined,
    };
  } catch {
    return {
      serverReady: false,
      geminiConfigured: false,
      firebasePrepared: true,
      firebaseConnected: false,
    };
  }
}

export async function requestSpeakingFeedback(payload: {
  transcript: string;
  targetPrompt: string;
  cefrLevel: string;
  topicTitle?: string;
}): Promise<SpeakingFeedbackApiResponse> {
  try {
    const response = await window.fetch("/api/ai/speaking-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as SpeakingFeedbackApiResponse;
    if (!response.ok && !data.error) {
      return {
        configured: Boolean(data.configured),
        error: "Máy chủ trả về phản hồi không hợp lệ.",
      };
    }
    return data;
  } catch {
    return {
      configured: false,
      error: "Không thể kết nối tới máy chủ. Vui lòng thử lại sau.",
    };
  }
}

export async function requestConversationTurn(payload: {
  mode?: "start" | "reply";
  topicKey?: string;
  scenarioTitle: string;
  cefrLevel: string;
  aiRole: string;
  history: Array<{ speaker: "ai" | "learner"; text: string }>;
  learnerMessage: string;
}): Promise<ConversationTurnApiResponse> {
  try {
    const response = await window.fetch("/api/ai/conversation-turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as ConversationTurnApiResponse;
    if (!response.ok && !data.error) {
      return {
        configured: Boolean(data.configured),
        error: "Máy chủ trả về phản hồi hội thoại không hợp lệ.",
      };
    }
    return data;
  } catch {
    return {
      configured: false,
      error: "Không thể kết nối tới máy chủ hội thoại AI. Vui lòng thử lại sau.",
    };
  }
}
