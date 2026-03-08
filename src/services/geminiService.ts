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
    const base64Data = imageBase64.split(',')[1] || imageBase64;
    const prompt = `Apply realistic Indian ${occasion} makeup on the provided face image, professional makeup artist style, natural skin texture, soft lighting, beauty photography. Preserve the facial identity and structure exactly, only modify the makeup.`;

    try {
      // Primary: AI Horde for true img2img (identity preservation)
      // We use AI Horde as primary for this specific feature because it supports source_image and denoising_strength
      const hordeResponse = await fetch("https://aihorde.net/api/v2/generate/async", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": "0000000000",
          "Client-Agent": "GlamourGrowth:1.0:v.chauhan144@gmail.com"
        },
        body: JSON.stringify({
          prompt: prompt,
          source_image: base64Data,
          source_processing: "img2img",
          params: {
            denoising_strength: 0.4,
            width: 512,
            height: 512,
            steps: 20,
            n: 3
          },
          models: ["stable_diffusion"]
        })
      });

      if (!hordeResponse.ok) {
        const errorText = await hordeResponse.text();
        throw new Error(`AI Horde request failed: ${hordeResponse.status} - ${errorText}`);
      }

      const { id } = await hordeResponse.json();
      
      // Polling for completion
      let attempts = 0;
      const maxAttempts = 45; // 90 seconds max
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const statusRes = await fetch(`https://aihorde.net/api/v2/generate/status/${id}`);
        
        if (!statusRes.ok) throw new Error("Failed to check AI Horde status");
        
        const statusData = await statusRes.json();
        if (statusData.done && statusData.generations) {
          return statusData.generations.map((g: any) => g.img);
        }
        
        if (statusData.faulted) throw new Error("AI Horde generation faulted");
        
        attempts++;
      }
      
      throw new Error("AI Horde generation timed out");
    } catch (error) {
      console.warn("AI Horde img2img failed, falling back to Pollinations (random face):", error);

      // Fallback: Pollinations AI (Text-to-Image, random face)
      // This ensures the user still gets results even if identity preservation fails
      const pollinationsPrompt = `Realistic Indian ${occasion} makeup look, professional makeup artist style, HD beauty photography, natural skin texture, soft lighting`;
      const pollinationsBase = `https://image.pollinations.ai/prompt/${encodeURIComponent(pollinationsPrompt)}`;

      return [
        `${pollinationsBase}?width=1024&height=1365&nologo=true&seed=${Math.floor(Math.random() * 100000)}`,
        `${pollinationsBase}%20portrait?width=1024&height=1365&nologo=true&seed=${Math.floor(Math.random() * 100000)}`,
        `${pollinationsBase}%20studio%20lighting?width=1024&height=1365&nologo=true&seed=${Math.floor(Math.random() * 100000)}`
      ];
    }
  }
}

export const geminiService = new GeminiService();
