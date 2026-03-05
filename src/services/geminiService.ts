/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { STRATEGY_SCHEMA, MESSAGE_SCHEMA, INSIGHTS_SCHEMA } from "../types";

const SYSTEM_INSTRUCTION = `You are GlamourGrowth AI — an intelligent business growth assistant designed exclusively for Indian freelance makeup artists.
Your mission is to help Indian makeup artists increase bookings, improve pricing confidence, manage client communication professionally, and grow monthly income.
Focus ONLY on Indian market context. Use Indian pricing psychology. Avoid global or western festival references.
Do not provide generic marketing advice. Be practical and revenue-focused. Use simple, confident, supportive tone.
Sound like a smart business coach, not a chatbot.
Never produce markdown. Never produce explanations outside the required JSON structure.
Always produce valid, parsable JSON. Keep responses concise but strategic.`;

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }

  async generateFestivalStrategy(festival: string, currentIncome: number) {
    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a revenue strategy for ${festival}. My current monthly income is ₹${currentIncome}.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: STRATEGY_SCHEMA as any,
      },
    });

    return JSON.parse(response.text || "{}");
  }

  async generateFollowUpMessages(clientContext: string) {
    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 3 smart follow-up messages for this client context: ${clientContext}. Focus on conversion and Indian pricing psychology.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: MESSAGE_SCHEMA as any,
      },
    });

    return JSON.parse(response.text || "{}");
  }

  async generateBusinessInsights(incomeData: any[]) {
    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this income data and provide growth insights: ${JSON.stringify(incomeData)}. Focus on Indian market trends and revenue maximization.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: INSIGHTS_SCHEMA as any,
      },
    });

    return JSON.parse(response.text || "{}");
  }
}

export const geminiService = new GeminiService();
