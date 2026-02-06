"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { getIdToken } from "@/lib/auth";
import { DashboardScaffold } from "../../../components/DashboardScaffold";
import { addRecentView } from "@/lib/recent-views";

interface Listing {
  id: string;
  seller_id?: string;
  category: string;
  title: string;
  price: number | null;
  location: string | null;
  description: string | null;
  attributes: Record<string, string> | null;
  images: string[] | null;
  is_featured: boolean;
  created_at: string;
}

interface SellerContact {
  phone: string | null;
  name: string | null;
}

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [listing, setListing] = useState<Listing | null>(null);
  const [contact, setContact] = useState<SellerContact | null>(null);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setMyProfileId(null);
        return;
      }
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const p = await res.json();
          setMyProfileId(p.id ?? null);
        } else {
          setMyProfileId(null);
        }
      } catch {
        setMyProfileId(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await getIdToken();
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const [listingRes, contactRes] = await Promise.all([
          fetch(`/api/listings/${id}`, { headers }),
          fetch(`/api/listings/${id}/contact`, { headers }),
        ]);
        if (listingRes.ok && !cancelled) {
          const data = await listingRes.json();
          setListing(data);
        } else if (!listingRes.ok) {
          setListing(null);
        }
        if (contactRes.ok && !cancelled) {
          const contactData = await contactRes.json();
          setContact({ phone: contactData.phone ?? null, name: contactData.name ?? null });
        }
      } catch {
        if (!cancelled) setListing(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    setSlideIndex(0);
  }, [id]);

  useEffect(() => {
    if (listing && id) {
      const imgs = listing.images;
      const image = Array.isArray(imgs) ? imgs[0] : null;
      const subtitle =
        listing.price != null
          ? `Rs. ${Number(listing.price).toLocaleString()}`
          : listing.location ?? undefined;
      addRecentView({
        type: "listing",
        id,
        title: listing.title,
        image: typeof image === "string" ? image : null,
        subtitle,
        href: `/dashboard/marketplace/listing/${id}`,
      });
    }
  }, [listing, id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-primary-700 font-medium">Loading…</div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4">
        <p className="text-gray-600">Listing not found.</p>
        <Link href="/dashboard/marketplace" className="text-primary-600 font-medium">Back to Marketplace</Link>
      </div>
    );
  }

  let rawAttrs = listing.attributes;
  if (typeof rawAttrs === "string") {
    try {
      rawAttrs = JSON.parse(rawAttrs) as Record<string, string>;
    } catch {
      rawAttrs = null;
    }
  }
  const attrs =
    rawAttrs && typeof rawAttrs === "object" && !Array.isArray(rawAttrs)
      ? rawAttrs
      : {};
  const attrEntries = Object.entries(attrs).filter(
    ([k]) => !/^\d+$/.test(k) && k !== "description"
  ) as [string, string][];
  const rawImages = listing.images;
  const images: string[] = Array.isArray(rawImages)
    ? rawImages.filter((u): u is string => typeof u === "string")
    : typeof rawImages === "string"
      ? (() => {
          try {
            const p = JSON.parse(rawImages);
            return Array.isArray(p) ? p.filter((u: unknown): u is string => typeof u === "string") : [];
          } catch {
            return [];
          }
        })()
      : [];
  const currentImage = images[slideIndex];

  return (
    <DashboardScaffold>
      <div className="mx-auto max-w-2xl px-4 py-6">
            <Link href="/dashboard/marketplace" className="mb-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-700">
              ← Marketplace
            </Link>
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
              <div className="relative aspect-[4/3] bg-gray-100">
                {currentImage ? (
                  <img src={currentImage} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <span className="text-6xl text-gray-300">📦</span>
                  </div>
                )}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setSlideIndex((i) => (i === 0 ? images.length - 1 : i - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition"
                      aria-label="Previous image"
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlideIndex((i) => (i === images.length - 1 ? 0 : i + 1))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition"
                      aria-label="Next image"
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSlideIndex(i)}
                          className={`h-2 rounded-full transition ${
                            i === slideIndex ? "w-6 bg-white" : "w-2 bg-white/60 hover:bg-white/80"
                          }`}
                          aria-label={`Go to image ${i + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 p-2 overflow-x-auto bg-gray-50 border-t border-gray-100">
                  {images.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSlideIndex(i)}
                      className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                        i === slideIndex ? "border-primary-500 ring-2 ring-primary-200" : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div className="p-4">
                <h1 className="text-lg font-bold text-gray-900">{listing.title}</h1>
                {listing.price != null && (
                  <p className="text-lg font-semibold text-green-700 mt-1">Rs. {Number(listing.price).toLocaleString()}</p>
                )}
                {listing.location && <p className="text-sm text-gray-600 mt-1">{listing.location}</p>}
                {listing.description && (
                  <p className="mt-3 text-gray-700 whitespace-pre-wrap">{listing.description}</p>
                )}
                {attrEntries.length > 0 && (
                  <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    {attrEntries.map(([k, v]) =>
                      v ? (
                        <div key={k}>
                          <dt className="text-gray-500 capitalize">{k.replace(/_/g, " ")}</dt>
                          <dd className="font-medium text-gray-900">{String(v)}</dd>
                        </div>
                      ) : null
                    )}
                  </dl>
                )}
                <div className="mt-4 flex flex-col gap-3">
                {messageError && (
                  <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">{messageError}</p>
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                {listing.seller_id && myProfileId === listing.seller_id ? (
                  <span className="flex items-center justify-center gap-2 rounded-xl bg-gray-200 px-4 py-3 text-sm font-medium text-gray-600 cursor-not-allowed">
                    Your listing
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      setMessageError(null);
                      setMessageLoading(true);
                      try {
                        const token = await getIdToken();
                        if (!token) {
                          router.replace("/signin");
                          return;
                        }
                        const res = await fetch("/api/chat/initiate", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ listingId: id }),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          setMessageError(data.error ?? "Failed to start chat.");
                          return;
                        }
                        router.push(`/dashboard/messages/${data.roomId}?listingId=${id}`);
                      } catch {
                        setMessageError("Failed to start chat.");
                      } finally {
                        setMessageLoading(false);
                      }
                    }}
                    disabled={messageLoading}
                    className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                  >
                    {messageLoading ? "Starting…" : "💬 Message seller"}
                  </button>
                )}
                {messageError && (
                  <p className="text-sm text-amber-600 -mt-2">{messageError}</p>
                )}
                {contact?.phone && (
                  <a
                    href={`tel:${contact.phone.replace(/\s/g, "")}`}
                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-primary-600 px-4 py-3 text-sm font-medium text-primary-700 hover:bg-primary-50"
                  >
                    📞 Call {contact.name ? contact.name : "seller"}
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  🚩 Report Ad
                </button>
                </div>
                {reportOpen && (
                  <div className="mt-4 p-4 rounded-xl border border-gray-200 bg-gray-50">
                    {reportSuccess ? (
                      <p className="text-sm text-green-700">Thank you. Your report has been submitted.</p>
                    ) : (
                      <>
                        <h3 className="text-sm font-semibold text-gray-800 mb-2">Report this ad</h3>
                        <select
                          value={reportReason}
                          onChange={(e) => setReportReason(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-2"
                        >
                          <option value="">Select reason</option>
                          <option value="Scam or fraud">Scam or fraud</option>
                          <option value="Inappropriate content">Inappropriate content</option>
                          <option value="Misleading information">Misleading information</option>
                          <option value="Spam">Spam</option>
                          <option value="Other">Other</option>
                        </select>
                        <textarea
                          value={reportDetails}
                          onChange={(e) => setReportDetails(e.target.value)}
                          placeholder="Additional details (optional)"
                          rows={2}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-2"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              setReportSubmitting(true);
                              try {
                                const token = await getIdToken();
                                if (!token) {
                                  router.replace("/signin");
                                  return;
                                }
                                const res = await fetch("/api/reports", {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({
                                    listingId: id,
                                    reason: reportReason || "Reported by user",
                                    details: reportDetails,
                                  }),
                                });
                                if (res.ok) {
                                  setReportSuccess(true);
                                  setReportOpen(false);
                                }
                              } finally {
                                setReportSubmitting(false);
                              }
                            }}
                            disabled={reportSubmitting}
                            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                          >
                            {reportSubmitting ? "Submitting…" : "Submit Report"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReportOpen(false);
                              setReportReason("");
                              setReportDetails("");
                            }}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                </div>
              </div>
            </div>
      </div>
    </DashboardScaffold>
  );
}
