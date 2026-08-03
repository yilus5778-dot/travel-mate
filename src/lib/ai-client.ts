/**
 * AI 接口的前端封装。所有请求打到同源 /api/ai/*,
 * 失败时由调用方回落到本地规则实现(app-model.ts)。
 */

import type { ItineraryItem } from "./app-model";

export type AiIntentResult = {
  destination: string | null;
  destinationPreference: string | null;
  departureCity: string | null;
  peopleCount: number | null;
  durationDays: number | null;
  dateText: string | null;
  dateStatus: "undecided" | "approximate" | "confirmed";
  looksLikeItinerary: boolean;
};

type AiItineraryItemPayload = {
  day: number | null;
  time: string | null;
  title: string;
  detail: string | null;
  duration: string | null;
  transportToNext: string | null;
  reason: string | null;
};

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || `请求失败(${response.status})`);
  }
  return payload as T;
}

export async function fetchAiIntent(text: string): Promise<AiIntentResult> {
  const payload = await post<{ intent: AiIntentResult }>("/api/ai/intent", { text });
  return payload.intent;
}

export async function fetchAiOrganize(text: string): Promise<{
  destination: string | null;
  items: ItineraryItem[];
}> {
  const payload = await post<{ destination: string | null; items: AiItineraryItemPayload[] }>(
    "/api/ai/organize",
    { text },
  );
  return { destination: payload.destination, items: toItineraryItems(payload.items) };
}

export async function fetchAiPlan(input: {
  destination: string;
  durationDays: number;
  peopleCount?: number | null;
  budget?: number | null;
  departureCity?: string | null;
  dateText?: string | null;
  destinationPreference?: string | null;
}): Promise<{ destination: string | null; items: ItineraryItem[] }> {
  const payload = await post<{ destination: string | null; items: AiItineraryItemPayload[] }>(
    "/api/ai/plan",
    input,
  );
  return { destination: payload.destination, items: toItineraryItems(payload.items) };
}

export async function fetchAiRecognition(imageDataUrls: string[]): Promise<string[]> {
  const payload = await post<{ texts: string[] }>("/api/ai/recognize", {
    images: imageDataUrls,
  });
  return payload.texts;
}

export async function fetchLinkContent(url: string): Promise<string> {
  const payload = await post<{ text: string }>("/api/ai/fetch-link", { url });
  return payload.text;
}

function toItineraryItems(items: AiItineraryItemPayload[]): ItineraryItem[] {
  return items
    .filter((item) => item.title)
    .map((item, index) => ({
      id: `ai_${Date.now()}_${index}`,
      day: item.day,
      time: item.time,
      title: item.title,
      detail: item.detail,
      duration: item.duration,
      transportToNext: item.transportToNext,
      reason: item.reason,
      evidence: "suggested" as const,
      confirmed: false,
      source: "ai" as const,
    }));
}
