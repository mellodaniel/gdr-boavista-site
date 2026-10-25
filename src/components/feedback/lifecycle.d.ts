export const FEEDBACK_DURATION_MS: number;
export function isTransientFeedback(value: unknown): boolean;
export function watchFeedback(value: unknown, dismiss: () => void, target?: Document): () => void;
