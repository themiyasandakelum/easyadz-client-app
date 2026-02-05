"use client";

export type VerificationStatusType = "verified" | "pending" | "unverified";

interface VerificationStatusProps {
  /** @deprecated Use status instead. Kept for backward compatibility. */
  isVerified?: boolean;
  /** Explicit status. When provided, overrides isVerified. */
  status?: VerificationStatusType;
  showNotice?: boolean;
  /** When true, show notice under name (e.g. on profile detail page). Default false for cards. */
  className?: string;
}

/**
 * Reusable verification status badge.
 * - verified: blue checkmark badge (Facebook-style)
 * - pending: amber "Pending" badge
 * - unverified: gray "Unverified" badge
 * - If !verified && showNotice: shows red text "⚠️ Profile Not Verified".
 */
export function VerificationStatus({
  isVerified,
  status,
  showNotice = false,
  className = "",
}: VerificationStatusProps) {
  const resolvedStatus: VerificationStatusType =
    status ?? (isVerified ? "verified" : "unverified");

  if (showNotice && resolvedStatus !== "verified") {
    return (
      <p className={`text-sm font-medium text-red-600 ${className}`}>
        ⚠️ Profile Not Verified
      </p>
    );
  }

  if (resolvedStatus === "verified") {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-[#1877F2] text-white w-[18px] h-[18px] ${className}`}
        title="Verified"
        aria-label="Verified"
      >
        <svg
          className="h-[60%] w-[60%]"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M20.707 5.293a1 1 0 010 1.414l-11 11a1 1 0 01-1.414 0l-5-5a1 1 0 011.414-1.414L9 15.586 19.293 5.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    );
  }

  if (resolvedStatus === "pending") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 ${className}`}
        title="Verification pending"
        aria-label="Verification pending"
      >
        <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
        Pending
      </span>
    );
  }

  if (resolvedStatus === "unverified") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 ${className}`}
        title="Not verified"
        aria-label="Not verified"
      >
        Unverified
      </span>
    );
  }

  return null;
}
