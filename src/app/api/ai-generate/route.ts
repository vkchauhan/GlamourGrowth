import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { Redis } from "@upstash/redis";

/**
 * AI GATEWAY FOR GLAMOUR GROWTH
 * 
 * This route handles all AI generation requests for the application.
 * It provides:
 * 1. Secure Gemini AI integration (API key stays on server)
 * 2. Redis caching via Upstash (reduces latency and costs)
 * 3. Robust error handling (always returns JSON)
 * 4. Support for both text and image-based prompts
 * 
 * EXAMPLE REQUEST PAYLOAD:
 * {
 *   "prompt": "Generate a bridal makeup Instagram caption",
 *   "contentType": "instagram",
 *   "city": "Mumbai",
 *   "metadata": { "systemInstruction": "..." },
 *   "schema": { ... }
 * }
 * 
 * EXAMPLE SUCCESS RESPONSE:
 * {
 *   "success": true,
 *   "data": { "caption": "...", "hashtags": [...] },
 *   "cached": false
 * }
 * 
 * EXAMPLE ERROR RESPONSE:
 * {
 *   "success": false,
 *   "error": "AI servers are currently busy"
 * }
 */

// Initialize Redis client for caching
// Environment variables: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// Initialize Gemini AI client
// Environment variable: GEMINI_API_KEY
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    // 1. Parse and validate request body
    const body = await req.json();
    const { prompt, contentType, city, metadata, imageBase64, schema } = body;

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: "Prompt is required" },
        { status: 400 }
      );
    }

    // 2. Cache Key Generation
    // We create a unique key based on the prompt content and context
    const promptHash = Buffer.from(prompt).toString("base64").substring(0, 16);
    const cacheKey = `glamour:${contentType || "gen"}:${city || "india"}:${promptHash}`.toLowerCase();

    // 3. Check Redis Cache (Optional based on env availability)
    if (process.env.UPSTASH_REDIS_REST_URL) {
      try {
        const cachedResult = await redis.get(cacheKey);
        if (cachedResult) {
          console.log(`[AI Gateway] Cache Hit: ${cacheKey}`);
          return NextResponse.json({
            success: true,
            data: cachedResult,
            cached: true,
          });
        }
      } catch (redisError) {
        console.error("[AI Gateway] Redis lookup error:", redisError);
        // Fall through to AI generation if cache fails
      }
    }

    // 4. Call Gemini AI API
    console.log(`[AI Gateway] Requesting Gemini: ${prompt.substring(0, 50)}...`);
    
    // We use the latest Gemini 3 Flash model for speed and efficiency
    const model = genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: imageBase64 
        ? { parts: [{ inlineData: { data: imageBase64, mimeType: "image/jpeg" } }, { text: prompt }] }
        : prompt,
      config: {
        systemInstruction: metadata?.systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const response = await model;
    const aiContent = response.text;

    if (!aiContent) {
      throw new Error("Gemini returned an empty response");
    }

    // Parse the AI content (Gemini returns a string, we want the JSON object)
    let parsedData;
    try {
      parsedData = JSON.parse(aiContent);
    } catch (e) {
      // Fallback if the response isn't valid JSON despite the config
      parsedData = aiContent;
    }

    // 5. Store in Redis Cache (24 hour expiration)
    if (process.env.UPSTASH_REDIS_REST_URL) {
      try {
        await redis.set(cacheKey, parsedData, { ex: 86400 });
        console.log(`[AI Gateway] Cache Set: ${cacheKey}`);
      } catch (redisError) {
        console.error("[AI Gateway] Redis storage error:", redisError);
      }
    }

    // 6. Return Success Response
    return NextResponse.json({
      success: true,
      data: parsedData,
      cached: false,
    });

  } catch (error: any) {
    console.error("[AI Gateway] Critical Error:", error);

    // Determine the best error message and status code
    // Handle Gemini 503 (Service Unavailable) specifically
    const isBusy = error?.message?.includes("503") || error?.status === 503;
    const statusCode = isBusy ? 503 : 500;
    const errorMessage = isBusy 
      ? "AI servers are currently under high load. Please try again in a few moments."
      : error.message || "An unexpected error occurred during AI generation.";

    // ALWAYS return JSON, never HTML or plain text
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}
