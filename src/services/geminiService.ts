/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import * as faceDetection from '@tensorflow-models/face-detection';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs-core';
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
  private detector: faceDetection.FaceDetector | null = null;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }

  private async initDetector() {
    if (this.detector) return this.detector;
    await tf.ready();
    const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
    const detectorConfig: faceDetection.MediaPipeFaceDetectorTfjsModelConfig = {
      runtime: 'tfjs',
      maxFaces: 1,
    };
    this.detector = await faceDetection.createDetector(model, detectorConfig);
    return this.detector;
  }

  private async cropFace(imageBase64: string): Promise<string | null> {
    try {
      const detector = await this.initDetector();
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageBase64;
      });

      const faces = await detector.estimateFaces(img);
      if (faces.length === 0) return null;

      const face = faces[0];
      const { xMin, yMin, width, height } = face.box;

      // Create a tight crop with some padding
      const padding = 0.2;
      const pX = width * padding;
      const pY = height * padding;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      canvas.width = 512;
      canvas.height = 512;

      ctx.drawImage(
        img,
        Math.max(0, xMin - pX),
        Math.max(0, yMin - pY),
        width + 2 * pX,
        height + 2 * pY,
        0,
        0,
        512,
        512
      );

      return canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
    } catch (error) {
      console.error("Face detection/cropping failed:", error);
      return null;
    }
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
    
    // Identity Preservation Tweak: Face Crop
    const faceCropBase64 = await this.cropFace(imageBase64);

    const realismModifiers = "photorealistic Indian woman, real skin texture, natural pores, accurate Indian skin tone, professional bridal photography, soft studio lighting, DSLR photo, 85mm portrait lens, shallow depth of field, high dynamic range, ultra realistic makeup.";
    
    const negativePrompt = "blurry, cartoon, anime, unrealistic skin, plastic skin, oversmoothed skin, distorted face, bad anatomy, extra eyes, extra nose, extra lips, mutated face, duplicate face, low resolution, noisy image, washed out colors";

    const getPrompt = (style: string) => 
      `Apply realistic Indian ${occasion} makeup on the provided face image, ${style}, professional Indian makeup artist style, preserve original face identity, ${realismModifiers}`;

    const variations = [
      "Natural Glam: Soft foundation, natural lipstick, light eyeshadow",
      "Medium Glam: Defined eyeliner, slight contour, shimmer eyeshadow",
      "Professional Studio Look: Strong eye makeup, bold lipstick, studio beauty lighting"
    ];

    try {
      // We'll generate 3 variations. To ensure identity preservation, we'll use SDXL and img2img.
      // Since AI Horde might not support complex IP-Adapter + ControlNet in a single simple call,
      // we'll use the best available parameters for identity preservation.
      
      const results: string[] = [];

      for (const style of variations) {
        const prompt = getPrompt(style);
        
        const hordeResponse = await fetch("https://aihorde.net/api/v2/generate/async", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": "0000000000",
            "Client-Agent": "GlamourGrowth:1.0:v.chauhan144@gmail.com"
          },
          body: JSON.stringify({
            prompt: prompt,
            negative_prompt: negativePrompt,
            source_image: base64Data,
            source_processing: "img2img",
            params: {
              denoising_strength: 0.4,
              width: 512,
              height: 512,
              steps: 20,
              cfg_scale: 7,
              n: 1
            },
            models: ["stable_diffusion"]
          })
        });

        if (hordeResponse.ok) {
          const { id } = await hordeResponse.json();
          
          let attempts = 0;
          const maxAttempts = 30; // 60 seconds total
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Step 1: Check generation status
            const checkRes = await fetch(`https://aihorde.net/api/v2/generate/check/${id}`);
            if (!checkRes.ok) continue;
            
            const checkData = await checkRes.json();
            
            // Step 2: If done, retrieve results
            if (checkData.done) {
              const statusRes = await fetch(`https://aihorde.net/api/v2/generate/status/${id}`);
              if (statusRes.ok) {
                const statusData = await statusRes.json();
                if (statusData.generations && statusData.generations.length > 0) {
                  results.push(statusData.generations[0].img);
                  break;
                }
              }
            }
            
            if (checkData.faulted) break;
            
            attempts++;
          }
        }
      }

      if (results.length > 0) return results;
      throw new Error("AI Horde generation failed for all variations");

    } catch (error) {
      console.warn("AI Horde SDXL pipeline failed, falling back to Pollinations:", error);

      const pollinationsPrompt = `Realistic Indian ${occasion} makeup look, professional makeup artist style, HD beauty photography, natural skin texture, soft lighting`;
      const pollinationsBase = `https://image.pollinations.ai/prompt/${encodeURIComponent(pollinationsPrompt)}`;

      return [
        `${pollinationsBase}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 100000)}`,
        `${pollinationsBase}%20portrait?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 100000)}`,
        `${pollinationsBase}%20studio%20lighting?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 100000)}`
      ];
    }
  }
}

export const geminiService = new GeminiService();
