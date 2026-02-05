"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/** Redirects /dashboard/post-ad/edit/[id] to /dashboard/post-ad?edit=[id] */
export default function EditAdRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  useEffect(() => {
    if (id) {
      router.replace(`/dashboard/post-ad?edit=${id}`);
    } else {
      router.replace("/dashboard/post-ad");
    }
  }, [id, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary-50 to-white">
      <div className="text-primary-700 font-medium">Redirecting…</div>
    </div>
  );
}
