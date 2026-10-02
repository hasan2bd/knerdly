"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createClient } from "../../../supabase/client";

const MAX_FILE_SIZE = 250 * 1024 * 1024;
const MAX_CAPTION_LENGTH = 220;

export default function ReelUploadPage() {
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<
    "public" | "unlisted" | "private"
  >("public");

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [duration, setDuration] = useState<number | null>(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    setError("");
    setDuration(null);

    if (!selectedFile) {
      setFile(null);
      setPreviewUrl("");
      return;
    }

    if (!selectedFile.type.startsWith("video/")) {
      setError("Please select a valid video file.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("Reels must be 250MB or smaller.");
      event.target.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);

    const video = document.createElement("video");

    video.preload = "metadata";

    video.onloadedmetadata = () => {
      const detectedDuration = video.duration;

      URL.revokeObjectURL(objectUrl);

      if (
        !Number.isFinite(detectedDuration) ||
        detectedDuration <= 0
      ) {
        setError("Could not determine the video duration.");
        return;
      }

      if (detectedDuration > 180) {
        setError("Reels must be 3 minutes or shorter.");
        setFile(null);
        setPreviewUrl("");
        return;
      }

      setDuration(Math.round(detectedDuration));
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setError("The selected video could not be read.");
      setFile(null);
      setPreviewUrl("");
    };

    video.src = objectUrl;

    setFile(selectedFile);
    setPreviewUrl(objectUrl);
  }

  function formatDuration(seconds: number | null) {
    if (seconds === null) {
      return "";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!file) {
      setError("Please choose a video for your Reel.");
      return;
    }

    if (duration === null) {
      setError("Please wait until the video duration is detected.");
      return;
    }

    if (duration > 180) {
      setError("Reels must be 3 minutes or shorter.");
      return;
    }

    setUploading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const extension =
      file.name.split(".").pop()?.toLowerCase() || "mp4";

    const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const storagePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("reels")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("reels")
      .getPublicUrl(storagePath);

    const { data: reel, error: reelError } = await supabase
      .from("reels")
      .insert({
        user_id: user.id,
        caption: caption.trim() || null,
        video_url: publicUrl,
        duration_seconds: duration,
        visibility,
      })
      .select("id")
      .single();

    if (reelError) {
      await supabase.storage
        .from("reels")
        .remove([storagePath]);

      setError(reelError.message);
      setUploading(false);
      return;
    }

    router.push(`/reels/${reel.id}`);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#17352d]">
      <header className="border-b border-[#dfe6e1] bg-[#f7f8f5]">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/reels"
            className="text-sm font-semibold text-[#557067] transition hover:text-[#17352d]"
          >
            ← Back to Reels
          </Link>

          <Link
            href="/home"
            className="text-lg font-bold tracking-[-0.04em] text-[#17352d]"
          >
            Knerdly
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a17a32]">
            Short video
          </p>

          <h1 className="mt-2 font-[var(--font-playfair)] text-3xl font-semibold tracking-tight sm:text-4xl">
            Create a Reel
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718078] sm:text-base">
            Share a short idea, study tip, campus moment, explanation,
            or something worth discovering.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-3xl border border-[#dfe6e1] bg-white"
        >
          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            {/* Video picker */}
            <div className="border-b border-[#dfe6e1] p-5 sm:p-8 lg:border-b-0 lg:border-r">
              <label className="block text-sm font-semibold text-[#17352d]">
                Reel video
              </label>

              <p className="mt-1 text-xs leading-5 text-[#8a9891]">
                MP4, WebM, MOV, or another browser-supported video format.
                Maximum 250MB and 3 minutes.
              </p>

              <label
                htmlFor="reel-video"
                className="mt-5 block cursor-pointer"
              >
                <div className="relative aspect-[9/16] max-h-[520px] overflow-hidden rounded-3xl border border-dashed border-[#cbd7d0] bg-[#f7f8f5]">
                  {previewUrl ? (
                    <video
                      src={previewUrl}
                      controls
                      playsInline
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e9efeb] text-[#557067]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          className="h-7 w-7"
                          aria-hidden="true"
                        >
                          <rect
                            width="16"
                            height="20"
                            x="4"
                            y="2"
                            rx="2"
                          />

                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m10 8 5 4-5 4V8Z"
                          />
                        </svg>
                      </div>

                      <p className="mt-4 text-sm font-semibold">
                        Choose a video
                      </p>

                      <p className="mt-1 text-xs text-[#8a9891]">
                        Vertical video works best
                      </p>
                    </div>
                  )}
                </div>
              </label>

              <input
                id="reel-video"
                name="video"
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="sr-only"
              />

              {file && (
                <div className="mt-4 rounded-2xl border border-[#dfe6e1] bg-[#f7f8f5] px-4 py-3">
                  <p className="truncate text-sm font-medium text-[#17352d]">
                    {file.name}
                  </p>

                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#718078]">
                    <span>
                      {(file.size / (1024 * 1024)).toFixed(1)} MB
                    </span>

                    {duration !== null && (
                      <span>
                        {formatDuration(duration)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="p-5 sm:p-8">
              <div>
                <label
                  htmlFor="caption"
                  className="text-sm font-semibold text-[#17352d]"
                >
                  Caption
                </label>

                <p className="mt-1 text-xs text-[#8a9891]">
                  Keep it short and useful.
                </p>

                <textarea
                  id="caption"
                  value={caption}
                  onChange={(event) =>
                    setCaption(
                      event.target.value.slice(
                        0,
                        MAX_CAPTION_LENGTH
                      )
                    )
                  }
                  placeholder="What is this Reel about?"
                  rows={6}
                  maxLength={MAX_CAPTION_LENGTH}
                  className="mt-3 w-full resize-none rounded-2xl border border-[#d7e0da] bg-[#fbfcfa] px-4 py-3 text-sm leading-6 text-[#17352d] outline-none transition placeholder:text-[#a1aca6] focus:border-[#557067] focus:ring-2 focus:ring-[#557067]/10"
                />

                <div className="mt-2 text-right text-xs text-[#8a9891]">
                  {caption.length}/{MAX_CAPTION_LENGTH}
                </div>
              </div>

              <div className="mt-7">
                <label
                  htmlFor="visibility"
                  className="text-sm font-semibold text-[#17352d]"
                >
                  Visibility
                </label>

                <p className="mt-1 text-xs text-[#8a9891]">
                  Choose who can access your Reel.
                </p>

                <select
                  id="visibility"
                  value={visibility}
                  onChange={(event) =>
                    setVisibility(
                      event.target.value as
                        | "public"
                        | "unlisted"
                        | "private"
                    )
                  }
                  className="mt-3 min-h-11 w-full rounded-2xl border border-[#d7e0da] bg-[#fbfcfa] px-4 text-sm text-[#17352d] outline-none focus:border-[#557067] focus:ring-2 focus:ring-[#557067]/10"
                >
                  <option value="public">
                    Public — anyone can discover it
                  </option>

                  <option value="unlisted">
                    Unlisted — accessible by direct link
                  </option>

                  <option value="private">
                    Private — only you
                  </option>
                </select>
              </div>

              <div className="mt-7 rounded-2xl border border-[#e2e8e4] bg-[#f7f8f5] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a17a32]">
                  Before publishing
                </p>

                <ul className="mt-3 space-y-2 text-xs leading-5 text-[#718078]">
                  <li>• Keep the video at or below 3 minutes.</li>
                  <li>• Vertical framing is recommended.</li>
                  <li>• Make sure you have permission to share the content.</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="mt-8 flex min-h-12 w-full items-center justify-center rounded-full bg-[#17352d] px-6 text-sm font-semibold text-white transition hover:bg-[#285247] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? "Publishing Reel..." : "Publish Reel"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}