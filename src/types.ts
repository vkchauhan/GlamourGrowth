/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Type } from "@google/genai";

export enum AppTab {
  DASHBOARD = "dashboard",
  STRATEGY = "strategy",
  MESSAGES = "messages",
  INSIGHTS = "insights",
  TRY_ON = "try_on",
  INSTAGRAM_CREATOR = "instagram_creator",
}

export enum Language {
  EN = "en",
  HI = "hi",
}

export interface IncomeEntry {
  id: string;
  date: string;
  amount: number;
  category: string; // e.g., "Bridal", "Party", "Festival", "Pre-wedding"
  clientName: string;
}

export const FESTIVALS = [
  "Karwa Chauth",
  "Diwali",
  "Wedding Season (Nov-Feb)",
  "Eid",
  "Navratri",
  "Engagement Season",
  "Pre-Wedding Shoots",
];

export const STRATEGY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    overview: { type: Type.STRING },
    pricingStrategy: { type: Type.STRING },
    marketingIdeas: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    revenueGoal: { type: Type.STRING },
  },
  required: ["title", "overview", "pricingStrategy", "marketingIdeas", "revenueGoal"],
};

export const MESSAGE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    messages: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          tone: { type: Type.STRING },
          content: { type: Type.STRING },
        },
        required: ["tone", "content"],
      },
    },
  },
  required: ["messages"],
};

export const INSIGHTS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    recommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    nextSteps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ["summary", "recommendations", "nextSteps"],
};

export const INSTAGRAM_POST_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    caption: { type: Type.STRING },
    hashtags: { type: Type.STRING },
    reelScript: { type: Type.STRING },
    storyText: { type: Type.STRING },
    cta: { type: Type.STRING },
  },
  required: ["caption", "hashtags", "reelScript", "storyText", "cta"],
};
