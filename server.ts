import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  generateConversationTurn,
  generateSpeakingFeedback,
  isGeminiConfigured,
} from "./server/geminiService.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    const firebaseConfigPath = path.resolve(__dirname, "firebase-applet-config.json");
    let firebaseProjectId = "";
    let firebaseConfigured = false;

    if (fs.existsSync(firebaseConfigPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8")) as {
          projectId?: string;
        };
        firebaseProjectId = parsed.projectId ?? "";
        firebaseConfigured = Boolean(
          firebaseProjectId && firebaseProjectId !== "remixed-project-id"
        );
      } catch {
        firebaseConfigured = false;
      }
    }

    res.json({
      app: "TỰ HỌC TIẾNG ANH - PHẠM HẬU",
      phase: "phase-2-firebase-connected",
      serverReady: true,
      geminiConfigured: isGeminiConfigured(),
      firebasePrepared: true,
      firebaseConnected: firebaseConfigured,
      firebaseProjectId,
      timestamp: new Date().toISOString(),
    });
  });

  app.post("/api/ai/speaking-feedback", async (req, res) => {
    if (!isGeminiConfigured()) {
      res.status(503).json({
        configured: false,
        error:
          "Dịch vụ Gemini API trên máy chủ đã sẵn sàng cấu trúc nhưng chưa được cấu hình khóa API trong môi trường hiện tại.",
      });
      return;
    }

    const { transcript, targetPrompt, cefrLevel, topicTitle } = req.body ?? {};
    if (!transcript || typeof transcript !== "string") {
      res.status(400).json({ error: "Thiếu nội dung câu trả lời để phân tích." });
      return;
    }

    try {
      const feedback = await generateSpeakingFeedback({
        transcript,
        targetPrompt: typeof targetPrompt === "string" ? targetPrompt : "Free speaking practice",
        cefrLevel: typeof cefrLevel === "string" ? cefrLevel : "B1",
        topicTitle: typeof topicTitle === "string" ? topicTitle : undefined,
      });
      res.json({ configured: true, feedback });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể kết nối Gemini API.";
      res.status(502).json({
        configured: true,
        error: `Lỗi gọi Gemini API từ máy chủ: ${message}`,
      });
    }
  });

  app.post("/api/ai/conversation-turn", async (req, res) => {
    if (!isGeminiConfigured()) {
      res.status(503).json({
        configured: false,
        error:
          "Dịch vụ Gemini API trên máy chủ chưa được cấu hình khóa API trong môi trường hiện tại.",
      });
      return;
    }

    const {
      mode,
      topicKey,
      scenarioTitle,
      cefrLevel,
      aiRole,
      history,
      learnerMessage,
    } = req.body ?? {};

    const normalizedMode = mode === "start" ? "start" : "reply";
    const validCefr = ["A1", "A2", "B1", "B2", "C1", "C2"].includes(String(cefrLevel))
      ? String(cefrLevel)
      : "B1";

    if (
      normalizedMode === "reply" &&
      (!learnerMessage || typeof learnerMessage !== "string" || !learnerMessage.trim())
    ) {
      res.status(400).json({ error: "Vui lòng nhập hoặc nói câu trả lời tiếng Anh." });
      return;
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (item) =>
              item &&
              (item.speaker === "ai" || item.speaker === "learner") &&
              typeof item.text === "string" &&
              item.text.trim().length > 0
          )
          .slice(-12)
          .map((item) => ({
            speaker: item.speaker as "ai" | "learner",
            text: item.text.trim().slice(0, 1000),
          }))
      : [];

    try {
      const turn = await generateConversationTurn({
        mode: normalizedMode,
        topicKey: typeof topicKey === "string" ? topicKey.slice(0, 40) : undefined,
        scenarioTitle:
          typeof scenarioTitle === "string" && scenarioTitle.trim()
            ? scenarioTitle.trim().slice(0, 160)
            : "Daily Conversation",
        cefrLevel: validCefr,
        aiRole:
          typeof aiRole === "string" && aiRole.trim()
            ? aiRole.trim().slice(0, 100)
            : "English Speaking Coach",
        history: safeHistory,
        learnerMessage:
          typeof learnerMessage === "string" ? learnerMessage.trim().slice(0, 2000) : "",
      });
      res.json({ configured: true, turn });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể tạo lượt hội thoại.";
      res.status(502).json({
        configured: true,
        error: `Lỗi gọi Gemini API từ máy chủ: ${message}`,
      });
    }
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API endpoint not found." });
  });

  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir, { maxAge: "1h" }));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distDir, "index.html"));
      });
    } else {
      console.warn(
        "Warning: dist/ directory not found in production mode. Run 'npm run build' first."
      );
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TỰ HỌC TIẾNG ANH - PHẠM HẬU server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
