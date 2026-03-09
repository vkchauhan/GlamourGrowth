import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Redis
const redis = new Redis({
  url: process.env.REDIS_URL || "",
  token: process.env.REDIS_TOKEN || "",
});

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Exponential Backoff Retry Helper
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  let lastError: any;
  const retrySchedule = [1000, 2000, 4000, 8000, 16000];

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isRetryable = error?.message?.includes('503') || 
                          error?.message?.includes('high demand') ||
                          error?.status === 503 ||
                          error?.code === 503;
      
      if (isRetryable && i < maxRetries - 1) {
        const delay = retrySchedule[i];
        console.warn(`Gemini API busy (503). Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// AI Gateway Endpoint
app.post("/api/ai-generate", async (req, res) => {
  try {
    const { contentType, city, prompt, metadata, imageBase64, language, schema } = req.body;

    // 1. Generate Cache Key
    // key: type_city_promptHash
    const promptHash = Buffer.from(prompt || "").toString('base64').substring(0, 16);
    const cacheKey = `${contentType || 'gen'}_${city || 'india'}_${promptHash}`.toLowerCase();

    // 2. Check Redis Cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`Cache hit for key: ${cacheKey}`);
        return res.json({
          success: true,
          data: cached,
          cached: true
        });
      }
    } catch (redisError) {
      console.warn("Redis lookup failed, proceeding to AI:", redisError);
    }

    // 3. Call Gemini API with Retry
    const result = await withRetry(async () => {
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: imageBase64 ? [
          {
            parts: [
              { inlineData: { data: imageBase64, mimeType: "image/jpeg" } },
              { text: prompt }
            ]
          }
        ] : prompt,
        config: {
          systemInstruction: metadata?.systemInstruction,
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });
      const response = await model;
      return JSON.parse(response.text || "{}");
    });

    // 4. Store in Cache (24 hours)
    try {
      await redis.set(cacheKey, result, { ex: 24 * 60 * 60 });
      console.log(`Cached result for key: ${cacheKey}`);
    } catch (redisError) {
      console.warn("Redis storage failed:", redisError);
    }

    // 5. Return Response
    res.json({
      success: true,
      data: result,
      cached: false
    });

  } catch (error: any) {
    console.error("AI Gateway Error:", error);
    const isBusy = error?.message?.includes('503') || 
                  error?.message?.includes('high demand') ||
                  error?.status === 503 ||
                  error?.code === 503;

    if (isBusy) {
      res.status(503).json({
        success: false,
        message: "AI servers are busy. Please try again shortly."
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Internal server error during AI generation."
      });
    }
  }
});

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite();
