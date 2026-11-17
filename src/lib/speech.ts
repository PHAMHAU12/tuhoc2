export interface SpeakOptions {
  accent?: "US" | "UK";
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

export function isSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

export function stopEnglishSpeech(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore browser synthesis cancel errors
    }
  }
}

export function speakEnglishText(
  text: string,
  options?: SpeakOptions
): boolean {
  if (!isSpeechSynthesisSupported() || !text.trim()) {
    options?.onError?.();
    return false;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = options?.accent === "UK" ? "en-GB" : "en-US";
    const safeRate =
      typeof options?.rate === "number" && Number.isFinite(options.rate)
        ? Math.max(0.5, Math.min(1.5, options.rate))
        : 1.0;
    utterance.rate = safeRate;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((voice) =>
        voice.lang.toLowerCase().startsWith(utterance.lang.toLowerCase())
      ) ??
      voices.find((voice) => voice.lang.toLowerCase().startsWith("en"));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    if (options?.onStart) utterance.onstart = options.onStart;
    if (options?.onEnd) utterance.onend = options.onEnd;
    if (options?.onError) utterance.onerror = () => options.onError?.();

    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    options?.onError?.();
    return false;
  }
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionInstanceLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructorLike = new () => SpeechRecognitionInstanceLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructorLike | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructorLike;
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

export interface SpeechRecognitionController {
  stop: () => void;
}

export function startBrowserSpeechRecognition(params: {
  accent?: "US" | "UK";
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (messageVi: string) => void;
  onEnd: () => void;
}): SpeechRecognitionController | null {
  const RecognitionCtor = getSpeechRecognitionConstructor();
  if (!RecognitionCtor) {
    params.onError(
      "Trình duyệt hiện tại không hỗ trợ nhận diện giọng nói (Web Speech API). Bạn có thể nhập câu trả lời bằng bàn phím."
    );
    return null;
  }

  try {
    const recognition = new RecognitionCtor();
    recognition.lang = params.accent === "UK" ? "en-GB" : "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalChunk += `${transcript} `;
        } else {
          interimChunk += transcript;
        }
      }

      if (interimChunk.trim()) {
        params.onInterim(interimChunk.trim());
      }
      if (finalChunk.trim()) {
        params.onFinal(finalChunk.trim());
      }
    };

    recognition.onerror = (event) => {
      const code = event.error;
      if (code === "not-allowed" || code === "service-not-allowed") {
        params.onError(
          "Trình duyệt đã từ chối quyền truy cập Micro. Vui lòng cấp quyền Micro hoặc gõ văn bản."
        );
      } else if (code === "no-speech") {
        params.onError(
          "Chưa nghe thấy giọng nói rõ ràng. Vui lòng thử nói lại gần micro hơn."
        );
      } else if (code === "audio-capture") {
        params.onError(
          "Không tìm thấy thiết bị Micro khả dụng trên máy của bạn."
        );
      } else if (code === "network") {
        params.onError(
          "Dịch vụ nhận diện giọng nói của trình duyệt gặp lỗi kết nối mạng."
        );
      } else if (code !== "aborted") {
        params.onError(`Không thể nhận diện giọng nói (${code}).`);
      }
    };

    recognition.onend = () => {
      params.onEnd();
    };

    recognition.start();
    return {
      stop: () => {
        try {
          recognition.stop();
        } catch {
          try {
            recognition.abort();
          } catch {
            // Ignore
          }
        }
      },
    };
  } catch {
    params.onError(
      "Không thể khởi động Micro trên trình duyệt này. Bạn vẫn có thể luyện tập bằng nhập văn bản."
    );
    return null;
  }
}
