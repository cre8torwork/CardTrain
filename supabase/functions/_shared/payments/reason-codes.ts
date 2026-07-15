// Maps a CyberSource reason code to the cardholder-facing confirmation message
// mandated by the GPAP Connectivity Test Plan. GPAP reviews this wording; do not
// leak sensitive detail (e.g. "Insufficient Fund") on any outcome.
//
// Mapping (GPAP Connectivity Test Plan, 2026-07-15):
//   100                                  -> success
//   201,203,204,205,208,210,211 (issuer) -> "contact your bank"
//   150 and every other decline          -> "try again"

export type ConfirmationCategory = 'success' | 'issuer' | 'retry';

export interface Confirmation {
  category: ConfirmationCategory;
  message: string;
}

/** Issuer-related decline codes that GPAP maps to the "contact your bank" wording. */
export const ISSUER_DECLINE_CODES: ReadonlySet<number> = new Set([
  201, 203, 204, 205, 208, 210, 211,
]);

function categoryFor(reasonCode: number): ConfirmationCategory {
  if (reasonCode === 100) return 'success';
  if (ISSUER_DECLINE_CODES.has(reasonCode)) return 'issuer';
  return 'retry';
}

const MESSAGES: Record<ConfirmationCategory, string> = {
  success: 'Transaction successful.',
  issuer: 'Transaction rejected, please contact your bank…',
  retry: 'Transaction unsuccessful, please try again...',
};

/** The category + full confirmation-page message for a reason code. */
export function confirmationFor(reasonCode: number, referenceNumber: string): Confirmation {
  const category = categoryFor(reasonCode);
  return {
    category,
    message: `${MESSAGES[category]} (Reference Number: ${referenceNumber})`,
  };
}
