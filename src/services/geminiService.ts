/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { STRATEGY_SCHEMA, MESSAGE_SCHEMA, INSIGHTS_SCHEMA, Language } from "../types";

const getSystemInstruction = (language: Language) => {
  const langPrompt = language === Language.HI 
    ? "Always respond in Hinglish (Hindi written in English letters). Do not use Devanagari script. Keep it simple and easy to understand for Indian makeup artists."
    : "Always respond in professional English.";

  return `You are GlamourGrowth AI — an intelligent business growth assistant designed exclusively for Indian freelance makeup artists.
Your mission is to help Indian makeup artists increase bookings, improve pricing confidence, manage client communication professionally, and grow monthly income.
Focus ONLY on Indian market context. Use Indian pricing psychology. Avoid global or western festival references.
Do not provide generic marketing advice. Be practical and revenue-focused. Use simple, confident, supportive tone.
Sound like a smart business coach, not a chatbot.
${langPrompt}
Never produce markdown. Never produce explanations outside the required JSON structure.
Always produce valid, parsable JSON. Keep responses concise but strategic.`;
};

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }

  async generateFestivalStrategy(festival: string, currentIncome: number, language: Language = Language.EN) {
    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a revenue strategy for ${festival}. My current monthly income is ₹${currentIncome}.`,
      config: {
        systemInstruction: getSystemInstruction(language),
        responseMimeType: "application/json",
        responseSchema: STRATEGY_SCHEMA as any,
      },
    });

    return JSON.parse(response.text || "{}");
  }

  async generateFollowUpMessages(clientContext: string, language: Language = Language.EN) {
    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 3 smart follow-up messages for this client context: ${clientContext}. Focus on conversion and Indian pricing psychology.`,
      config: {
        systemInstruction: getSystemInstruction(language),
        responseMimeType: "application/json",
        responseSchema: MESSAGE_SCHEMA as any,
      },
    });

    return JSON.parse(response.text || "{}");
  }

  async generateBusinessInsights(incomeData: any[], language: Language = Language.EN) {
    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this income data and provide growth insights: ${JSON.stringify(incomeData)}. Focus on Indian market trends and revenue maximization.`,
      config: {
        systemInstruction: getSystemInstruction(language),
        responseMimeType: "application/json",
        responseSchema: INSIGHTS_SCHEMA as any,
      },
    });

    return JSON.parse(response.text || "{}");
  }

  async generateMakeupTryOn(imageBase64: string, occasion: string) {
    const prompt = `You are a professional Indian bridal makeup artist and AI image editor.

Task:
Apply realistic makeup on the provided face image while preserving the identity, 
facial structure, skin tone, lighting, and expression.

Occasion: ${occasion}

Requirements:
- Makeup must look natural and professionally applied
- Do NOT change the person’s face
- Maintain the original background and lighting
- Apply realistic cosmetics like foundation, blush, contour, eyeliner, lipstick, and highlight
- Adapt the makeup style based on the occasion

Occasion guidelines:

Wedding:
heavy bridal glam, bold eyeshadow, defined eyeliner, red or maroon lipstick, glowing skin

Pre-Wedding:
soft glam, peach tones, elegant eyeshadow, glossy lips

Party:
bold eyes, shimmer eyeshadow, highlighter, dramatic lipstick

Festival:
bright colors, vibrant eyeliner, glowing skin

Natural:
minimal makeup, soft blush, nude lipstick

Output:
Generate a variation of the makeup look applied to the same face.

Important:
Preserve identity and realism. The result should look like the same person wearing real makeup.`;

    const generateVariation = async () => {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: [
          {
            inlineData: {
              data: imageBase64.split(',')[1] || imageBase64,
              mimeType: "image/png",
            },
          },
          { text: prompt },
        ],
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    };

    // Generate 3 variations in parallel
    const variations = await Promise.all([
      generateVariation(),
      generateVariation(),
      generateVariation(),
    ]);

    return variations.filter(v => v !== null) as string[];
  }
}

export const geminiService = new GeminiService();
