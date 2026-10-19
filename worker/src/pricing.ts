// USD per million tokens, Claude API first-party rates (checked 2026-10-19;
// update when pricing changes). Cache writes are billed at 1.25x input.
// Unknown models report no cost rather than a guessed one.

interface Price {
  input: number;
  output: number;
  cacheRead: number;
}

const PRICES: Record<string, Price> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-opus-4-8": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
};

export interface TokenUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

/** Cost in millionths of a US dollar, or null when the model's price is unknown. */
export function costMicroUsd(u: TokenUsage): number | null {
  const p = PRICES[u.model];
  if (!p) return null;
  const usd = (u.inputTokens * p.input + u.cacheWriteTokens * p.input * 1.25 + u.cacheReadTokens * p.cacheRead + u.outputTokens * p.output) / 1_000_000;
  return Math.round(usd * 1_000_000);
}
