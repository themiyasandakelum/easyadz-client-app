"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardScaffold } from "../components/DashboardScaffold";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { getIdToken } from "@/lib/auth";

type VerificationStatus = "none" | "pending" | "verified";

export default function VerificationPage() {
  const router = useRouter();
  const idInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [status, setStatus] = useState<VerificationStatus>("none");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/signin");
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/verification", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStatus(data.verification_status ?? data.status ?? "none");
        }
      } catch (err: unknown) {
        const code = err && typeof err === "object" && "code" in err ? (err as { code?: string }).code : "";
        if (code === "auth/network-request-failed") {
          setError("Unable to connect. Please check your internet connection and try again.");
        }
        setStatus("none");
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  function handleIdChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (idPreview) URL.revokeObjectURL(idPreview);
    if (file) {
      setIdFile(file);
      setIdPreview(URL.createObjectURL(file));
    } else {
      setIdFile(null);
      setIdPreview(null);
    }
    setError(null);
  }

  function handleSelfieChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    if (file) {
      setSelfieFile(file);
      setSelfiePreview(URL.createObjectURL(file));
    } else {
      setSelfieFile(null);
      setSelfiePreview(null);
    }
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!idFile || !selfieFile) {
      setError("Please upload both your ID photo and a selfie.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await getIdToken();
      if (!token) {
        setError("Please sign in again.");
        setSubmitting(false);
        return;
      }

      const formData = new FormData();
      formData.append("id_image", idFile);
      formData.append("selfie", selfieFile);

      const res = await fetch("/api/verification", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setStatus("pending");
        setSuccess("Verification submitted! An admin will review shortly.");
        setIdFile(null);
        setSelfieFile(null);
        if (idPreview) URL.revokeObjectURL(idPreview);
        if (selfiePreview) URL.revokeObjectURL(selfiePreview);
        setIdPreview(null);
        setSelfiePreview(null);
        idInputRef.current?.form?.reset();
        selfieInputRef.current?.form?.reset();
      } else {
        setError(data.error || "Verification failed. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <DashboardScaffold>
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      </DashboardScaffold>
    );
  }

  return (
    <DashboardScaffold
      headerContent={
        <h1 className="text-lg font-semibold text-gray-900">Identity Verification</h1>
      }
    >
      <div className="mx-auto max-w-2xl px-4 py-6">
        {status === "verified" && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
            <p className="font-medium">You are verified.</p>
            <p className="text-sm text-green-700">
              Your identity has been verified. You can now enjoy full access to the platform.
            </p>
          </div>
        )}

        {status === "pending" && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
            <p className="font-medium">Verification pending</p>
            <p className="text-sm text-amber-700">
              Your documents are under review. We will notify you once approved.
            </p>
          </div>
        )}

        {status === "none" && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">
                Step 1: ID Photo
              </h2>
              <p className="mb-4 text-sm text-gray-600">
                Upload a clear photo of your Driving License or NIC. Ensure your face is
                visible and the document is readable.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-8 transition hover:border-primary-400 hover:bg-primary-50/50">
                  <input
                    ref={idInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleIdChange}
                    className="hidden"
                  />
                  {idPreview ? (
                    <img
                      src={idPreview}
                      alt="ID preview"
                      className="h-32 w-auto max-w-full rounded object-contain"
                    />
                  ) : (
                    <svg
                      className="h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"
                      />
                    </svg>
                  )}
                  <span className="mt-2 text-sm text-gray-600">
                    {idFile ? idFile.name : "Choose ID photo"}
                  </span>
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">
                Step 2: Live Selfie
              </h2>
              <p className="mb-4 text-sm text-gray-600">
                Take a selfie in good lighting. Your face should match the photo on your
                ID.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-8 transition hover:border-primary-400 hover:bg-primary-50/50">
                  <input
                    ref={selfieInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleSelfieChange}
                    className="hidden"
                  />
                  {selfiePreview ? (
                    <img
                      src={selfiePreview}
                      alt="Selfie preview"
                      className="h-32 w-auto max-w-full rounded object-contain"
                    />
                  ) : (
                    <svg
                      className="h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  )}
                  <span className="mt-2 text-sm text-gray-600">
                    {selfieFile ? selfieFile.name : "Choose selfie"}
                  </span>
                </label>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
                {success}
              </div>
            )}

            {status === "none" && (
              <button
                type="submit"
                disabled={submitting || !idFile || !selfieFile}
                className="w-full rounded-xl bg-primary-600 px-6 py-3 font-medium text-white transition hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Verifying..." : "Submit for verification"}
              </button>
            )}
          </form>
        )}
      </div>
    </DashboardScaffold>
  );
}
