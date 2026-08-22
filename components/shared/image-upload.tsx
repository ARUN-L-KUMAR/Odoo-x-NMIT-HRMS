"use client";

import { useState, useRef } from "react";
import { UploadCloud, Loader2, X, Image as ImageIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  label?: string;
  shape?: "square" | "circle";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  folder = "HRMS",
  label = "Upload Image",
  shape = "square",
  size = "md",
  className = "",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type & size
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Upload server error (${res.status})`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || `Upload failed (${res.status})`);
      }

      onChange(data.data.url);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Upload failed. Please try again.");
    } finally {

      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const sizeClasses = {
    sm: "h-14 w-14",
    md: "h-20 w-20",
    lg: "h-28 w-28",
  }[size];

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />

      <div className="flex items-center gap-4">
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          className={`relative group cursor-pointer border-2 border-dashed border-muted-foreground/30 hover:border-primary/60 transition-all flex items-center justify-center overflow-hidden bg-muted/20 ${sizeClasses} ${
            shape === "circle" ? "rounded-full" : "rounded-xl"
          }`}
        >
          {value ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="Uploaded"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <UploadCloud className="h-5 w-5 text-white" />
              </div>
            </>
          ) : uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <div className="flex flex-col items-center justify-center p-2 text-center text-muted-foreground group-hover:text-primary transition-colors">
              <UploadCloud className="h-5 w-5" />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="h-8 text-xs gap-1.5"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="h-3.5 w-3.5" />
                  {value ? "Change Photo" : label}
                </>
              )}
            </Button>

            {value && !uploading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="h-8 text-xs text-destructive hover:text-destructive px-2"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            PNG, JPG, or WEBP up to 5MB (Stored in Cloudinary / HRMS)
          </p>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
