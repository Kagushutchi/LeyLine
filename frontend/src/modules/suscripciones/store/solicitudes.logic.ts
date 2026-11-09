/** Only stable backend error codes allow an ambiguous attempt to be discarded. */
export type SubmissionFailure = 'price-changed' | 'already-subscribed' | 'in-progress' | 'conflict' | 'rejected' | 'uncertain';
export type DraftBlock = 'conflict' | 'rejected';
export function blockForFailure(failure: SubmissionFailure): DraftBlock | undefined {
  return failure === 'conflict' || failure === 'rejected' ? failure : undefined;
}
export function classifySubmissionFailure(error: unknown): SubmissionFailure {
  const response = (error as { response?: { status?: number; data?: { code?: string } } })?.response;
  if (!response) return 'uncertain';
  if (response.status === 409 && response.data?.code === 'PRICE_CHANGED') return 'price-changed';
  if (response.status === 409 && response.data?.code === 'ALREADY_SUBSCRIBED') return 'already-subscribed';
  if (response.status === 409 && response.data?.code === 'REQUEST_IN_PROGRESS') return 'in-progress';
  if (response.status === 409) return 'conflict';
  if (response.status && response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) return 'rejected';
  return 'uncertain';
}
