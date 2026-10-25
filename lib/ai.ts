import Anthropic from "@anthropic-ai/sdk";

export const AI_MODEL = "claude-sonnet-4-6";

export function aiEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export function aiDisabledResponse() {
  return Response.json(
    {
      ok: false,
      error:
        "AI features are not configured. Add ANTHROPIC_API_KEY to your environment to enable them — everything else works without it.",
    },
    { status: 501 }
  );
}

export function anthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

// Extracts the first JSON object/array from a model reply (tolerates prose or fences).
export function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start === -1) throw new Error("no JSON in model reply");
  return JSON.parse(candidate.slice(start)) as T;
}
