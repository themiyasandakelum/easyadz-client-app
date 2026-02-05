"use client";

import Link from "next/link";
import { VerificationStatus, type VerificationStatusType } from "./VerificationStatus";

export interface MatrimonialProfileCardProps {
  id: string;
  name: string;
  age: number | null;
  profession: string | null;
  job_title?: string | null;
  location?: string | null;
  country?: string | null;
  region_district?: string | null;
  ethnicity?: string | null;
  religion?: string | null;
  education_level?: string | null;
  avatar_url?: string | null;
  photo_blurred?: boolean;
  is_verified?: boolean;
  verification_status?: VerificationStatusType;
  /** Optional compatibility score (e.g. for AI matches) */
  compatibility?: number;
  /** Optional custom action (e.g. Accept/Decline for pending requests) */
  action?: React.ReactNode;
  }

export function MatrimonialProfileCard({
  id,
  name,
  age,
  profession,
  job_title,
  location,
  country,
  region_district,
  ethnicity,
  religion,
  education_level,
  avatar_url,
  photo_blurred,
  is_verified,
  verification_status,
  compatibility,
  action,
}: MatrimonialProfileCardProps) {
  const imgUrl = avatar_url;
  const blurred = photo_blurred;
  const locationStr = location ?? region_district ?? country ?? "—";

  const profileContent = (
    <>
      <div className="shrink-0">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt=""
            className={`h-14 w-14 rounded-full object-cover ring-2 ring-gray-100 ${blurred ? "blur-sm" : ""}`}
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400 text-2xl ring-2 ring-gray-100">
            👤
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{name}</p>
          <VerificationStatus
            status={
              verification_status ??
              (is_verified ? "verified" : "unverified")
            }
          />
          {compatibility != null && (
            <span className="shrink-0 rounded-lg bg-primary-600 px-2 py-0.5 text-xs font-bold text-white">
              {compatibility}%
            </span>
          )}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-gray-700">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-400">🎂</span>
            <span className="truncate">{age != null ? `${age} years` : "—"}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-400">🧑</span>
            <span className="truncate">{ethnicity ?? "—"}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-400">📍</span>
            <span className="truncate">{locationStr}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-400">🛐</span>
            <span className="truncate">{religion ?? "—"}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-400">💼</span>
            <span className="truncate">{job_title ?? profession ?? "—"}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-400">🎓</span>
            <span className="truncate">{education_level ?? "—"}</span>
          </div>
        </div>
      </div>
      {!action && (
        <div className="shrink-0">
          <span className="text-sm font-semibold text-primary-700 hover:text-primary-800">
            More details →
          </span>
        </div>
      )}
    </>
  );

  const baseClass =
    "flex items-center gap-4 overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md";

  if (action) {
    return (
      <div className={baseClass}>
        <Link href={`/dashboard/profile/${id}`} className="flex min-w-0 flex-1 items-center gap-4">
          {profileContent}
        </Link>
        <div className="shrink-0">{action}</div>
      </div>
    );
  }

  return (
    <Link href={`/dashboard/profile/${id}`} className={baseClass}>
      {profileContent}
    </Link>
  );
}
