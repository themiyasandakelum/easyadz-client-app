"use client";

import { useRef, useState } from "react";

const MAX_IMAGES = 6;
const MIN_IMAGES = 3;

export interface ImageSlot {
  id: string;
  file?: File;
  preview: string;
}

interface MultipleImageUploadProps {
  value: ImageSlot[];
  onChange: (slots: ImageSlot[]) => void;
  mainImageIndex?: number;
  onMainImageChange?: (index: number) => void;
  minImages?: number;
  onError?: (message: string) => void;
  disabled?: boolean;
}

export function MultipleImageUpload({
  value,
  onChange,
  mainImageIndex = 0,
  onMainImageChange,
  minImages = MIN_IMAGES,
  onError,
  disabled,
}: MultipleImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showError(message: string) {
    setToast(message);
    onError?.(message);
    setTimeout(() => setToast(null), 4000);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    const current = value.length;
    const available = MAX_IMAGES - current;
    const toAdd = Array.from(files).slice(0, available);
    if (files.length > available) {
      showError(`Maximum ${MAX_IMAGES} images allowed`);
    }
    const newSlots: ImageSlot[] = toAdd.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`,
      file,
      preview: URL.createObjectURL(file),
    }));
    onChange([...value, ...newSlots]);
    e.target.value = "";
  }

  function handleRemove(id: string) {
    const idx = value.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const slot = value[idx];
    if (slot?.preview?.startsWith("blob:")) URL.revokeObjectURL(slot.preview);
    const next = value.filter((s) => s.id !== id);
    onChange(next);
    if (onMainImageChange) {
      if (mainImageIndex === idx) {
        onMainImageChange(0);
      } else if (mainImageIndex > idx) {
        onMainImageChange(Math.max(0, mainImageIndex - 1));
      }
    }
  }

  function handleSetMain(idx: number) {
    if (onMainImageChange) onMainImageChange(idx);
  }

  function handleAddClick() {
    if (value.length >= MAX_IMAGES) return;
    inputRef.current?.click();
  }

  const slots = value;
  const emptySlots = MAX_IMAGES - slots.length;
  const mainIdx = Math.min(mainImageIndex, slots.length - 1);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">
        Photos (min {minImages}, max {MAX_IMAGES})
        {slots.length > 0 && (
          <span className="ml-2 text-gray-500 font-normal">
            – Tap &quot;Main&quot; to set display image
          </span>
        )}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 scrollbar-thin">
        {slots.map((slot, idx) => (
          <div
            key={slot.id}
            className="relative shrink-0 w-24 h-24 rounded-xl border-2 overflow-hidden"
            style={{
              borderColor: idx === mainIdx ? "var(--color-primary-500, #0d9488)" : "#e5e7eb",
            }}
          >
            <img
              src={slot.preview}
              alt=""
              className="w-full h-full object-cover"
            />
            {idx === mainIdx && (
              <span className="absolute top-1 left-1 rounded bg-primary-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                Main
              </span>
            )}
            {!disabled && (
              <>
                {onMainImageChange && idx !== mainIdx && (
                  <button
                    type="button"
                    onClick={() => handleSetMain(idx)}
                    className="absolute top-1 left-1 rounded bg-gray-700/80 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-gray-800"
                  >
                    Set Main
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(slot.id)}
                  className="absolute top-1 right-1 rounded-full bg-red-500 text-white w-6 h-6 flex items-center justify-center text-xs font-bold shadow hover:bg-red-600"
                  aria-label="Remove image"
                >
                  ×
                </button>
              </>
            )}
          </div>
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <button
            key={`empty-${i}`}
            type="button"
            onClick={handleAddClick}
            disabled={disabled}
            className="shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-3xl text-gray-400 hover:border-primary-400 hover:bg-primary-50/50 hover:text-primary-500 disabled:opacity-50 disabled:pointer-events-none transition"
            aria-label="Add image"
          >
            +
          </button>
        ))}
      </div>
      {slots.length > 0 && slots.length < minImages && (
        <p className="text-sm text-amber-600">
          Add at least {minImages - slots.length} more photo{minImages - slots.length > 1 ? "s" : ""}.
        </p>
      )}
      {toast && (
        <div
          role="alert"
          className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
