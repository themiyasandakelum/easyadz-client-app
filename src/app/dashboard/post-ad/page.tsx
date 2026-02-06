"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { getIdToken } from "@/lib/auth";
import { DashboardScaffold } from "../components/DashboardScaffold";
import { MultipleImageUpload, type ImageSlot } from "../components/MultipleImageUpload";
import { applyEasyAdzWatermark } from "@/lib/watermark-image";
import {
  POST_AD_CATEGORIES,
  FUEL_TYPES,
  PROPERTY_TYPES,
  type ListingCategory,
} from "@/lib/listings-types";
import type { SmartPostResponse } from "@/app/api/smart-post/route";
import { useConfig } from "@/contexts/ConfigContext";

export default function PostAdPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditMode = Boolean(editId);
  const { enable_ad_pricing, price_featured_ad } = useConfig();

  const [category, setCategory] = useState<ListingCategory | "">("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [imageSlots, setImageSlots] = useState<ImageSlot[]>([]);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [smartPostLoading, setSmartPostLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [loadedAttributes, setLoadedAttributes] = useState<Record<string, string> | null>(null);
  const [isFeatured, setIsFeatured] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace("/signin");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch(`/api/listings/${editId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        let attrs = data.attributes;
        if (typeof attrs === "string") {
          try {
            attrs = JSON.parse(attrs);
          } catch {
            attrs = {};
          }
        }
        attrs = (attrs as Record<string, string>) || {};
        setCategory(data.category || "");
        setTitle(data.title || "");
        setPrice(data.price != null ? String(data.price) : "");
        setLocation(data.location || "");
        setIsFeatured(!!data.is_featured);
        setDescription(typeof data.description === "string" ? data.description : "");
        setAttributes(attrs);
        const imgs = data.images;
        const urlList = Array.isArray(imgs) ? imgs : [];
        if (urlList.length > 0) {
          setImageSlots(
            urlList.map((url: string, i: number) => ({
              id: `existing-${i}-${url.slice(-12)}`,
              preview: url,
            }))
          );
        }
      } catch {
        if (!cancelled) setError("Failed to load listing.");
      }
    })();
    return () => { cancelled = true; };
  }, [editId]);

  useEffect(() => {
    if (!isEditMode) setAttributes({});
  }, [category, isEditMode]);

  useEffect(() => {
    if (loadedAttributes != null && isEditMode) {
      setAttributes(loadedAttributes);
      setLoadedAttributes(null);
    }
  }, [loadedAttributes, isEditMode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!category || !title.trim()) {
      setError("Category and title are required.");
      return;
    }
    setSaving(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      const priceNum = parseFloat(price.trim());
      if (isNaN(priceNum) || priceNum < 0) {
        throw new Error("Price must be 0 or greater.");
      }
      const attrsFiltered = Object.fromEntries(
        Object.entries(attributes).filter(([, v]) => v != null && String(v).trim() !== "")
      );
      const attrs = Object.keys(attrsFiltered).length > 0 ? attrsFiltered : null;

      if (isEditMode && editId) {
        const res = await fetch(`/api/listings/${editId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: title.trim(),
            price: priceNum,
            description: description.trim(),
            location: location.trim() || null,
            attributes: attrs,
            is_featured: isFeatured,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to update ad.");
        }
        if (imageSlots.length > 0) {
          const orderedSlots = [...imageSlots];
          if (mainImageIndex > 0) {
            const [main] = orderedSlots.splice(mainImageIndex, 1);
            orderedSlots.unshift(main);
          }
          const existingUrls: string[] = [];
          const newFiles: File[] = [];
          for (const slot of orderedSlots) {
            if (slot.file) {
              newFiles.push(slot.file);
            } else if (slot.preview && (slot.preview.startsWith("http://") || slot.preview.startsWith("https://"))) {
              existingUrls.push(slot.preview);
            }
          }
          if (newFiles.length > 0) {
            const formData = new FormData();
            formData.append("existing_urls", JSON.stringify(existingUrls));
            for (let i = 0; i < newFiles.length; i++) {
              const blob = await applyEasyAdzWatermark(newFiles[i]);
              formData.append("images", blob, `img_${i + 1}.jpg`);
            }
            const uploadRes = await fetch(`/api/listings/${editId}/images`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            });
            if (!uploadRes.ok) {
              const data = await uploadRes.json().catch(() => ({}));
              throw new Error(data.error ?? "Failed to upload images.");
            }
          } else if (existingUrls.length > 0) {
            await fetch(`/api/listings/${editId}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ images: existingUrls }),
            });
          }
        }
        router.push("/dashboard/my-ads");
        return;
      }

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          title: title.trim(),
          price: priceNum,
          description: description.trim(),
          location: location.trim() || null,
          attributes: attrs,
          images: [],
          is_featured: isFeatured,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to post ad.");
      }
      const listing = await res.json();
      const listingId = listing.id;
      const orderedSlots = [...imageSlots];
      if (mainImageIndex > 0) {
        const [main] = orderedSlots.splice(mainImageIndex, 1);
        orderedSlots.unshift(main);
      }
      const formData = new FormData();
      for (let i = 0; i < orderedSlots.length; i++) {
        const blob = await applyEasyAdzWatermark(orderedSlots[i].file);
        formData.append("images", blob, `img_${i + 1}.jpg`);
      }
      const uploadRes = await fetch(`/api/listings/${listingId}/images`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to upload images.");
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post ad.");
    } finally {
      setSaving(false);
    }
  }

  function setAttr(key: string, value: string) {
    setAttributes((prev) => (value ? { ...prev, [key]: value } : { ...prev, [key]: "" }));
  }

  async function handleSmartPost() {
    if (imageSlots.length === 0) {
      setError("Upload at least one photo to use AI Smart Post.");
      return;
    }
    const slot = imageSlots[0];
    let imageToSend: File;
    if (slot.file) {
      imageToSend = slot.file;
    } else if (slot.preview?.startsWith("http")) {
      const res = await fetch(slot.preview);
      const blob = await res.blob();
      imageToSend = new File([blob], "image.jpg", { type: blob.type || "image/jpeg" });
    } else {
      setError("Upload at least one photo to use AI Smart Post.");
      return;
    }
    setError(null);
    setSmartPostLoading(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      const formData = new FormData();
      formData.append("image", imageToSend);
      const res = await fetch("/api/smart-post", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "AI analysis failed.");
      }
      const data: SmartPostResponse = await res.json();
      setCategory(data.category as ListingCategory);
      setTitle(data.title);
      setDescription(data.description ?? "");
      if (data.attributes && Object.keys(data.attributes).length > 0) {
        setAttributes((prev) => ({ ...prev, ...data.attributes }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI Smart Post failed.");
    } finally {
      setSmartPostLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary-50 to-white">
        <div className="text-primary-700 font-medium">Loading…</div>
      </div>
    );
  }

  return (
    <DashboardScaffold>
      <div className="mx-auto max-w-2xl px-4 py-6">
            <Link
              href={isEditMode ? "/dashboard/my-ads" : "/dashboard"}
              className="mb-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              ← Back to {isEditMode ? "My Ads" : "dashboard"}
            </Link>
            <h1 className="text-lg font-bold text-primary-800 mb-4">
              {isEditMode ? "Edit Ad" : "Post an Ad"}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ListingCategory)}
                  required
                  disabled={isEditMode}
                  className={`w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none ${isEditMode ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`}
                  title={isEditMode ? "Category cannot be changed when editing" : undefined}
                >
                  <option value="">Select category</option>
                  {POST_AD_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.icon} {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Toyota Aqua 2015"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                />
              </div>

              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                  Price <span className="text-red-500">*</span>
                </label>
                <input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                />
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Colombo"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                />
              </div>

              <MultipleImageUpload
                value={imageSlots}
                onChange={setImageSlots}
                mainImageIndex={mainImageIndex}
                onMainImageChange={setMainImageIndex}
                minImages={isEditMode ? 0 : 3}
                disabled={saving}
              />

              {imageSlots.length > 0 && (
                <button
                  type="button"
                  onClick={handleSmartPost}
                  disabled={smartPostLoading || saving}
                  className="flex items-center gap-2 rounded-lg border border-primary-300 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {smartPostLoading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                      AI analyzing…
                    </>
                  ) : (
                    <>
                      <span aria-hidden>✨</span>
                      AI Smart Post – auto-fill from photo
                    </>
                  )}
                </button>
              )}

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={imageSlots.length > 0 ? "Use AI Smart Post to auto-fill from your photo" : "Describe your item"}
                  rows={4}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none resize-none"
                />
              </div>

              {/* Dynamic fields by category */}
              {category === "vehicle" && (
                <div className="rounded-xl border border-primary-100 bg-white p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-800">Vehicle details</h3>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Brand / Make</label>
                    <input
                      type="text"
                      value={attributes.make ?? ""}
                      onChange={(e) => setAttr("make", e.target.value)}
                      placeholder="e.g. Toyota"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Model Year</label>
                    <input
                      type="text"
                      value={attributes.model_year ?? ""}
                      onChange={(e) => setAttr("model_year", e.target.value)}
                      placeholder="e.g. 2015"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Fuel Type</label>
                    <select
                      value={attributes.fuel_type ?? ""}
                      onChange={(e) => setAttr("fuel_type", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                    >
                      <option value="">Select</option>
                      {FUEL_TYPES.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Mileage</label>
                    <input
                      type="text"
                      value={attributes.mileage ?? ""}
                      onChange={(e) => setAttr("mileage", e.target.value)}
                      placeholder="e.g. 50000 km"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}

              {category === "property" && (
                <div className="rounded-xl border border-primary-100 bg-white p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-800">Property details</h3>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Property Type</label>
                    <select
                      value={attributes.type ?? ""}
                      onChange={(e) => setAttr("type", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                    >
                      <option value="">Select</option>
                      {PROPERTY_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Bed Rooms</label>
                    <input
                      type="text"
                      value={attributes.bed_rooms ?? ""}
                      onChange={(e) => setAttr("bed_rooms", e.target.value)}
                      placeholder="e.g. 3"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Land Size (Perches)</label>
                    <input
                      type="text"
                      value={attributes.land_perches ?? ""}
                      onChange={(e) => setAttr("land_perches", e.target.value)}
                      placeholder="e.g. 10"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Address</label>
                    <input
                      type="text"
                      value={attributes.address ?? ""}
                      onChange={(e) => setAttr("address", e.target.value)}
                      placeholder="e.g. Kandy Rd, Colombo"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}

              {category === "electronic" && (
                <div className="rounded-xl border border-primary-100 bg-white p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-800">Electronics details</h3>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Brand</label>
                    <input
                      type="text"
                      value={attributes.brand ?? ""}
                      onChange={(e) => setAttr("brand", e.target.value)}
                      placeholder="e.g. Apple, Samsung"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Model</label>
                    <input
                      type="text"
                      value={attributes.model ?? ""}
                      onChange={(e) => setAttr("model", e.target.value)}
                      placeholder="e.g. iPhone 14"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Warranty</label>
                    <input
                      type="text"
                      value={attributes.warranty ?? ""}
                      onChange={(e) => setAttr("warranty", e.target.value)}
                      placeholder="e.g. 1 year"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}

              {category === "matrimonial" && (
                <div className="rounded-xl border border-primary-100 bg-white p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-800">Matrimonial details</h3>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Profession</label>
                    <input
                      type="text"
                      value={attributes.profession ?? ""}
                      onChange={(e) => setAttr("profession", e.target.value)}
                      placeholder="e.g. Doctor, Engineer"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Age</label>
                    <input
                      type="text"
                      value={attributes.age ?? ""}
                      onChange={(e) => setAttr("age", e.target.value)}
                      placeholder="e.g. 29"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Featured listing option */}
              <div className="rounded-xl border border-primary-100 bg-white p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-800">
                    Feature this ad (top placement)
                  </span>
                </label>
                {!isEditMode && (
                  <p className="mt-2 text-sm text-gray-600">
                    {enable_ad_pricing && isFeatured ? (
                      <span>
                        Cost: <strong className="text-primary-700">LKR {price_featured_ad.toLocaleString()}</strong>
                      </span>
                    ) : (
                      <span className="text-green-600 font-medium">Cost: FREE</span>
                    )}
                  </p>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-primary-600 py-3 text-white font-medium hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving
                  ? isEditMode
                    ? "Saving…"
                    : "Posting…"
                  : isEditMode
                    ? "Save changes"
                    : enable_ad_pricing && isFeatured
                      ? "Pay and Post"
                      : "Post Ad"}
              </button>
            </form>
      </div>
    </DashboardScaffold>
  );
}
