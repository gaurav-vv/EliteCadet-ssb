import { GENERAL_RESPONSE_V1 } from "./general-response.js";
import { PSYCHOLOGY_RUBRICS } from "./psychology.js";
import type { Rubric } from "./types.js";

const ALL: Rubric[] = [GENERAL_RESPONSE_V1, ...PSYCHOLOGY_RUBRICS];

export function getRubric(id: string, version: number): Rubric | undefined {
  return ALL.find((r) => r.id === id && r.version === version);
}

export function listRubrics(): readonly Rubric[] {
  return ALL;
}
