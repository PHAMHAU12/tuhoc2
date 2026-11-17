import { GoogleGenAI, Type } from "@google/genai";

export interface SpeakingFeedbackRequest {
  transcript: string;
  targetPrompt: string;
  cefrLevel: string;
  topicTitle?: string;
}

export interface SpeakingFeedbackResult {
  naturalRewrite: string;
  grammarNotesVi: string;
  pronunciationFocusVi: string;
  vocabularySuggestions: string[];
  encouragementVi: string;
}

export interface ConversationTurnRequest {
  mode?: "start" | "reply";
  topicKey?: string;
  scenarioTitle: string;
  cefrLevel: string;
  aiRole: string;
  history: Array<{ speaker: "ai" | "learner"; text: string }>;
  learnerMessage: string;
}

export interface ConversationTurnResult {
  replyEn: string;
  translationVi: string;
  hasGrammarCorrection: boolean;
  correctedSentenceEn: string;
  grammarExplanationVi: string;
  naturalExpressions: string[];
  encouragementVi: string;
}

export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(key && key !== "MY_GEMINI_API_KEY");
}

function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("GEMINI_API_KEY_NOT_CONFIGURED");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function isTransientGeminiError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("503") ||
    message.includes("UNAVAILABLE") ||
    message.includes("429") ||
    message.includes("RESOURCE_EXHAUSTED")
  );
}

async function withGeminiRetry<T>(operation: () => Promise<T>): Promise<T> {
  const delaysMs = [600, 1400];
  let lastError: unknown;

  for (let attempt = 0; attempt <= delaysMs.length; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === delaysMs.length || !isTransientGeminiError(error)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delaysMs[attempt]));
    }
  }

  throw lastError;
}

export async function generateSpeakingFeedback(
  payload: SpeakingFeedbackRequest
): Promise<SpeakingFeedbackResult> {
  const ai = createGeminiClient();

  const response = await withGeminiRetry(() =>
    ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: [
        `Learner CEFR level: ${payload.cefrLevel}`,
        payload.topicTitle ? `Scenario/Topic: ${payload.topicTitle}` : "",
        `Target question or prompt: ${payload.targetPrompt}`,
        `Learner response: ${payload.transcript}`,
      ]
        .filter(Boolean)
        .join("\n"),
      config: {
        systemInstruction:
          "You are an English speaking coach for Vietnamese learners (CEFR A1 to C2). Give constructive, concise feedback. Explanations must be in clear natural Vietnamese; corrected sentences and vocabulary suggestions must be in English.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            naturalRewrite: {
              type: Type.STRING,
              description:
                "A natural, accurate English version of the learner's response suitable for their target CEFR level.",
            },
            grammarNotesVi: {
              type: Type.STRING,
              description:
                "Clear Vietnamese explanation of grammar or word-choice improvements.",
            },
            pronunciationFocusVi: {
              type: Type.STRING,
              description:
                "Vietnamese guidance on key sounds, final consonants, or word stress to watch in this sentence.",
            },
            vocabularySuggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "2-3 useful English words or phrases related to the response.",
            },
            encouragementVi: {
              type: Type.STRING,
              description: "A short, supportive closing note in Vietnamese.",
            },
          },
          required: [
            "naturalRewrite",
            "grammarNotesVi",
            "pronunciationFocusVi",
            "vocabularySuggestions",
            "encouragementVi",
          ],
        },
      },
    })
  );

  const raw = (response.text ?? "{}").trim();
  return JSON.parse(raw) as SpeakingFeedbackResult;
}

export async function generateConversationTurn(
  payload: ConversationTurnRequest
): Promise<ConversationTurnResult> {
  const ai = createGeminiClient();
  const isStart = payload.mode === "start";

  const recentHistory = payload.history.slice(-12);
  const historyText = recentHistory
    .map((item) => `${item.speaker === "ai" ? payload.aiRole : "Learner"}: ${item.text}`)
    .join("\n");

  const contents = isStart
    ? [
        `Action: Start a new English speaking conversation.`,
        `Topic: ${payload.scenarioTitle}${payload.topicKey ? ` (${payload.topicKey})` : ""}`,
        `Target CEFR Level: ${payload.cefrLevel}`,
        `AI Role: ${payload.aiRole}`,
        `Requirement: Greet briefly and ask ONE clear opening question in English matched to CEFR ${payload.cefrLevel}.`,
      ].join("\n")
    : [
        `Topic: ${payload.scenarioTitle}${payload.topicKey ? ` (${payload.topicKey})` : ""}`,
        `Target CEFR Level: ${payload.cefrLevel}`,
        `AI Role: ${payload.aiRole}`,
        historyText ? `Conversation history:\n${historyText}` : "",
        `Latest learner message: ${payload.learnerMessage}`,
      ]
        .filter(Boolean)
        .join("\n\n");

  const systemInstruction = [
    "You are an encouraging, patient English speaking coach helping Vietnamese learners practice spoken English from CEFR A1 to C2.",
    "STRICT CONVERSATION RULES:",
    "1. Calibrate vocabulary, sentence length, and complexity strictly to the requested CEFR level (A1 very simple short sentences; A2 basic everyday; B1 clear conversational; B2 fluent detailed; C1 nuanced/idiomatic; C2 sophisticated/academic).",
    "2. In `replyEn`, respond naturally in English (1-3 concise sentences) and ask ONLY ONE clear question at a time so the learner can answer easily. Never ask multiple questions in one turn.",
    "3. Do NOT fabricate audio transcription or numeric pronunciation scores.",
    "4. Provide `translationVi` as an accurate, natural Vietnamese translation of `replyEn`.",
    "5. When the learner sends a message, check for grammar, tense, article, preposition, or phrasing mistakes. Set `hasGrammarCorrection` to true if there is an error or awkward phrasing to polish politely, and provide `correctedSentenceEn`. If the learner's English is already natural and correct, set `hasGrammarCorrection` to false and `correctedSentenceEn` to their clean sentence or empty string.",
    "6. In `grammarExplanationVi`, politely explain any correction in clear Vietnamese (or give positive Vietnamese feedback if no mistake was found; if starting a new conversation, give a short Vietnamese tip on how to answer).",
    "7. In `naturalExpressions`, suggest 2-3 more natural English expressions or collocations relevant to the topic and CEFR level, each formatted as 'English expression — Nghĩa tiếng Việt'.",
    "8. In `encouragementVi`, write one short supportive sentence in Vietnamese.",
  ].join("\n");

  const response = await withGeminiRetry(() =>
    ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replyEn: {
              type: Type.STRING,
              description:
                "Natural English response calibrated to the CEFR level, ending with exactly ONE question.",
            },
            translationVi: {
              type: Type.STRING,
              description: "Accurate Vietnamese translation of replyEn.",
            },
            hasGrammarCorrection: {
              type: Type.BOOLEAN,
              description: "True if the learner sentence had a grammar or word-choice mistake.",
            },
            correctedSentenceEn: {
              type: Type.STRING,
              description:
                "Polite corrected English sentence for the learner, or empty string if starting a conversation.",
            },
            grammarExplanationVi: {
              type: Type.STRING,
              description:
                "Polite Vietnamese explanation of corrections or positive feedback.",
            },
            naturalExpressions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                "2-3 more natural English expressions with brief Vietnamese meanings.",
            },
            encouragementVi: {
              type: Type.STRING,
              description: "Short supportive Vietnamese closing remark.",
            },
          },
          required: [
            "replyEn",
            "translationVi",
            "hasGrammarCorrection",
            "correctedSentenceEn",
            "grammarExplanationVi",
            "naturalExpressions",
            "encouragementVi",
          ],
        },
      },
    })
  );

  const raw = (response.text ?? "{}").trim();
  return JSON.parse(raw) as ConversationTurnResult;
}
