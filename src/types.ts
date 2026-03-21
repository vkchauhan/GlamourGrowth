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
  GROWTH = "growth",
  TRY_ON = "try_on",
  REVENUE = "revenue",
}

export enum Language {
  EN = "en",
  HI = "hi",
}

export interface Service {
  service_id: string;
  name: string;
  default_price: number;
  category?: string;
}

export interface BookingService {
  service_id: string;
  name?: string;
  price: number;
}

export interface Booking {
  booking_id?: string;
  client_id?: string;
  client_name: string;
  client_phone?: string;
  date: string;
  services: BookingService[];
  total_amount: number;
  created_at?: string;
}

export interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  createdAt?: any;
}

export interface IncomeEntry {
  id: string;
  client_id?: string;
  date: string;
  amount: number;
  category: string; // e.g., "Bridal", "Party", "Festival", "Pre-wedding"
  clientName: string;
  clientPhone?: string;
  services?: BookingService[];
}

export const OCCASIONS = [
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

export const INSTAGRAM_SCHEMA = {
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

export interface BookingInsights {
  bookings_last_7_days: number;
  bookings_last_30_days: number;
  last_booking_date: string | null;
  most_common_service: string | null;
  repeat_clients_count: number;
  bridal_bookings_last_30_days: number;
  party_makeup_last_30_days: number;
}

export interface DailyGrowthTask {
  task_id: string;
  title_en: string;
  title_hi: string;
  body_en: string;
  body_hi: string;
  trigger_type: 'booking_insight' | 'generic';
  trigger_condition?: string;
  points: number;
}

export interface UserDailyTask {
  id: string;
  user_id: string;
  task_id: string;
  title_en: string;
  title_hi: string;
  body_en: string;
  body_hi: string;
  status: 'pending' | 'completed';
  points: number;
  date: string;
  createdAt: any;
}

export interface AnalyticsEvent {
  id?: string;
  user_id: string;
  event_type: string;
  task_id?: string;
  metadata?: any;
  createdAt: any;
}

export interface SmartNudge {
  id: string;
  type: 'follow_up' | 'review_request' | 'upcoming_reminder';
  title_en: string;
  title_hi: string;
  message_en: string;
  message_hi: string;
  whatsapp_text_en: string;
  whatsapp_text_hi: string;
  client_name: string;
  client_phone?: string;
  date: string;
}
