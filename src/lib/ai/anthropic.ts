import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function aiClient(): Anthropic {
  if (_client) return _client;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export function aiAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Default model for short, factual commentary. Sonnet 4.6 is the sweet spot
 * — Opus would be overkill for 2-3 sentence headlines synthesis at this volume.
 */
export const AI_MODEL = "claude-sonnet-4-6" as const;
