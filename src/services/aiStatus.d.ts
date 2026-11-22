import type { AiStatus } from "./shramAi"

export function getAiStatusPresentation(
  status: AiStatus | null,
  unavailable?: boolean,
): { label: string; tone: string }
