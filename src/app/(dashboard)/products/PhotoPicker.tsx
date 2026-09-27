"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, RotateCcw } from "lucide-react";
import { MAX_UPLOAD_BYTES } from "@/constants";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface PhotoPickerProps {
  /** Form field name the file is submitted under. */
  name: string;
  /** Photo already saved on the product, shown until a new one is chosen. */
  currentUrl?: string;
  /** Server-side validation message, if any. */
  error?: string;
}

/**
 * Photo upload area: click or drag a photo in, see a preview right away.
 * The real <input type="file"> is visually hidden inside the label, so it
 * still submits with the form and stays keyboard-accessible.
 */
export function PhotoPicker({ name, currentUrl, error }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // Free the preview's object URL when it's replaced or the dialog closes.
  const previewRef = useRef<string | null>(null);
  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  function showPreview(url: string | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = url;
    setPreview(url);
  }

  function clearSelection() {
    if (inputRef.current) inputRef.current.value = "";
    showPreview(null);
    setFileLabel(null);
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      clearSelection();
      setLocalError("Use a JPG, PNG, WebP or GIF image.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      clearSelection();
      setLocalError("That photo is over 5 MB. Try a smaller one.");
      return;
    }
    setLocalError(null);
    showPreview(URL.createObjectURL(file));
    setFileLabel(`${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`);
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (!inputRef.current || !event.dataTransfer.files.length) return;
    // Put the dropped file on the real input so it submits with the form.
    inputRef.current.files = event.dataTransfer.files;
    handleFiles(event.dataTransfer.files);
  }

  const shown = preview ?? currentUrl ?? null;
  const message = localError ?? error;

  return (
    <div className="flex flex-col gap-1.5 sm:col-span-2">
      <span className="text-[13px] font-semibold text-brand-dark">Photo</span>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={[
          "group flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed p-3 transition-colors",
          "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-brand",
          message
            ? "border-destructive/60 bg-destructive/5"
            : dragging
              ? "border-brand bg-brand-light"
              : "border-brand-line bg-brand-bg hover:border-brand hover:bg-brand-light",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          name={name}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="sr-only"
          aria-invalid={message ? true : undefined}
          aria-describedby={`${name}-hint${message ? ` ${name}-error` : ""}`}
          onChange={(e) => handleFiles(e.target.files)}
        />

        <span className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-brand-line bg-white text-brand">
          {shown ? (
            <Image src={shown} alt="Product photo preview" fill className="object-cover" sizes="80px" unoptimized />
          ) : (
            <ImagePlus size={26} aria-hidden="true" />
          )}
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[14px] font-semibold text-brand-dark">
            {preview ? "New photo selected" : shown ? "Current photo" : "Click to upload or drag a photo here"}
          </span>
          <span id={`${name}-hint`} className="truncate text-[12px] text-brand-muted">
            {fileLabel ?? "JPG, PNG, WebP or GIF · up to 5 MB"}
          </span>
          <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[13px] font-semibold text-white transition-colors group-hover:bg-[#4a3cc7]">
            <ImagePlus size={14} aria-hidden="true" />
            {shown ? "Change photo" : "Choose photo"}
          </span>
        </span>
      </label>

      {preview && (
        <button
          type="button"
          onClick={clearSelection}
          className="inline-flex w-fit items-center gap-1 text-[12px] font-semibold text-brand hover:underline"
        >
          <RotateCcw size={12} aria-hidden="true" />
          {currentUrl ? "Undo — keep the current photo" : "Remove photo"}
        </button>
      )}

      {message && (
        <span id={`${name}-error`} role="alert" className="text-[12px] text-destructive">
          {message}
        </span>
      )}
    </div>
  );
}
