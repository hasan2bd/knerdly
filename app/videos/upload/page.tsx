"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../supabase/client";

const categories = [
  "General",
  "Education",
  "Lecture",
  "Tutorial",
  "Technology",
  "Literature",
  "Career",
  "Study",
  "Entertainment",
];

const MAX_VIDEO_SIZE = 500 * 1024 * 1024;

export default function VideoUploadPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");
  const [category, setCategory] =
    useState("General");
  const [visibility, setVisibility] =
    useState("public");

  const [videoFile, setVideoFile] =
    useState<File | null>(null);

  const [duration, setDuration] =
    useState<number | null>(null);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  function handleVideoChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    setError("");
    setSuccess("");
    setDuration(null);

    if (!file) {
      setVideoFile(null);
      return;
    }

    if (!file.type.startsWith("video/")) {
      setError(
        "Please select a valid video file."
      );
      event.target.value = "";
      setVideoFile(null);
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      setError(
        "The video must be smaller than 500 MB."
      );
      event.target.value = "";
      setVideoFile(null);
      return;
    }

    setVideoFile(file);

    const video = document.createElement("video");
    const objectUrl =
      URL.createObjectURL(file);

    video.preload = "metadata";
    video.src = objectUrl;

    video.onloadedmetadata = () => {
      if (Number.isFinite(video.duration)) {
        setDuration(video.duration);
      }

      URL.revokeObjectURL(objectUrl);
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
    };
  }

  function formatDuration(
    seconds: number | null
  ) {
    if (
      seconds === null ||
      !Number.isFinite(seconds)
    ) {
      return "";
    }

    const totalSeconds = Math.round(seconds);
    const minutes = Math.floor(
      totalSeconds / 60
    );
    const remainingSeconds =
      totalSeconds % 60;

    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }

  function getExtension(file: File) {
    const extension =
      file.name.split(".").pop()?.toLowerCase();

    if (
      extension &&
      /^[a-z0-9]+$/.test(extension)
    ) {
      return extension;
    }

    return "mp4";
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const trimmedTitle = title.trim();
    const trimmedDescription =
      description.trim();

    if (!trimmedTitle) {
      setError(
        "Please enter a title for your video."
      );
      return;
    }

    if (trimmedTitle.length > 120) {
      setError(
        "The title must be 120 characters or fewer."
      );
      return;
    }

    if (trimmedDescription.length > 5000) {
      setError(
        "The description must be 5000 characters or fewer."
      );
      return;
    }

    if (!videoFile) {
      setError(
        "Please select a video to upload."
      );
      return;
    }

    if (videoFile.size > MAX_VIDEO_SIZE) {
      setError(
        "The video must be smaller than 500 MB."
      );
      return;
    }

    setUploading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        router.push("/login");
        return;
      }

      const extension =
        getExtension(videoFile);

      const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const filePath = `${user.id}/${fileName}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from("videos")
        .upload(
          filePath,
          videoFile,
          {
            cacheControl: "3600",
            upsert: false,
            contentType:
              videoFile.type ||
              "video/mp4",
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: publicUrlData,
      } = supabase.storage
        .from("videos")
        .getPublicUrl(filePath);

      const videoUrl =
        publicUrlData.publicUrl;

      const {
        data: video,
        error: insertError,
      } = await supabase
        .from("videos")
        .insert({
          user_id: user.id,
          title: trimmedTitle,
          description:
            trimmedDescription || null,
          video_url: videoUrl,
          thumbnail_url: null,
          category,
          visibility,
          duration_seconds:
            duration !== null
              ? Math.round(duration)
              : null,
        })
        .select("id")
        .single();

      if (insertError) {
        await supabase.storage
          .from("videos")
          .remove([filePath]);

        throw insertError;
      }

      if (!video) {
        throw new Error(
          "The video was uploaded but could not be saved."
        );
      }

      setSuccess(
        "Video published successfully."
      );

      router.push(
        `/videos/${video.id}`
      );
      router.refresh();
    } catch (err) {
      console.error(
        "Video upload error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while uploading the video."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#17352d]">
      <header className="border-b border-[#dfe6e1] bg-[#f7f8f5]">
        <div className="mx-auto flex min-h-16 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/videos"
            className="text-sm font-semibold text-[#557067] transition hover:text-[#17352d]"
          >
            ← Videos
          </Link>

          <Link
            href="/home"
            className="text-lg font-bold tracking-[-0.04em]"
          >
            Knerdly
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a17a32]">
            Video studio
          </p>

          <h1 className="mt-2 font-[var(--font-playfair)] text-3xl font-semibold tracking-tight sm:text-4xl">
            Publish a video
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#718078] sm:text-base">
            Share lectures, tutorials, study materials,
            academic discussions, or other useful videos
            with the Knerdly community.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-[#cfe0d5] bg-[#edf5ef] px-4 py-3 text-sm leading-6 text-[#285247]"
          >
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Video file */}
          <section className="rounded-3xl border border-[#dfe6e1] bg-white p-5 sm:p-7">
            <div>
              <h2 className="text-lg font-semibold">
                Video file
              </h2>

              <p className="mt-1 text-sm text-[#718078]">
                MP4, WebM, MOV and other browser-supported
                video formats up to 500 MB.
              </p>
            </div>

            <label className="mt-5 flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#ccd8d0] bg-[#f7f8f5] px-5 py-8 text-center transition hover:border-[#9db1a5]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-10 w-10 text-[#557067]"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m15 10-4.5 3L15 16v-6Z"
                />
                <rect
                  width="18"
                  height="14"
                  x="3"
                  y="5"
                  rx="2"
                />
              </svg>

              <span className="mt-4 text-sm font-semibold text-[#17352d]">
                {videoFile
                  ? videoFile.name
                  : "Choose a video file"}
              </span>

              {videoFile && (
                <span className="mt-2 text-xs text-[#718078]">
                  {(
                    videoFile.size /
                    (1024 * 1024)
                  ).toFixed(1)}{" "}
                  MB
                  {duration !== null &&
                    ` · ${formatDuration(duration)}`}
                </span>
              )}

              {!videoFile && (
                <span className="mt-2 text-xs text-[#8a9891]">
                  Click to browse your computer
                </span>
              )}

              <input
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                className="sr-only"
              />
            </label>
          </section>

          {/* Details */}
          <section className="rounded-3xl border border-[#dfe6e1] bg-white p-5 sm:p-7">
            <h2 className="text-lg font-semibold">
              Video details
            </h2>

            <div className="mt-5 space-y-5">
              <div>
                <label
                  htmlFor="title"
                  className="text-sm font-semibold"
                >
                  Title
                </label>

                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  maxLength={120}
                  placeholder="Give your video a clear title"
                  className="mt-2 min-h-12 w-full rounded-2xl border border-[#d8e1db] bg-white px-4 text-sm outline-none transition placeholder:text-[#a0aaa5] focus:border-[#557067] focus:ring-2 focus:ring-[#edf2ee]"
                />

                <p className="mt-1 text-right text-xs text-[#8a9891]">
                  {title.length}/120
                </p>
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="text-sm font-semibold"
                >
                  Description
                </label>

                <textarea
                  id="description"
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  maxLength={5000}
                  rows={6}
                  placeholder="Explain what viewers will learn or find in this video..."
                  className="mt-2 w-full resize-y rounded-2xl border border-[#d8e1db] bg-white px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-[#a0aaa5] focus:border-[#557067] focus:ring-2 focus:ring-[#edf2ee]"
                />

                <p className="mt-1 text-right text-xs text-[#8a9891]">
                  {description.length}/5000
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="category"
                    className="text-sm font-semibold"
                  >
                    Category
                  </label>

                  <select
                    id="category"
                    value={category}
                    onChange={(event) =>
                      setCategory(
                        event.target.value
                      )
                    }
                    className="mt-2 min-h-12 w-full rounded-2xl border border-[#d8e1db] bg-white px-4 text-sm outline-none focus:border-[#557067] focus:ring-2 focus:ring-[#edf2ee]"
                  >
                    {categories.map(
                      (item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="visibility"
                    className="text-sm font-semibold"
                  >
                    Visibility
                  </label>

                  <select
                    id="visibility"
                    value={visibility}
                    onChange={(event) =>
                      setVisibility(
                        event.target.value
                      )
                    }
                    className="mt-2 min-h-12 w-full rounded-2xl border border-[#d8e1db] bg-white px-4 text-sm outline-none focus:border-[#557067] focus:ring-2 focus:ring-[#edf2ee]"
                  >
                    <option value="public">
                      Public
                    </option>

                    <option value="unlisted">
                      Unlisted
                    </option>

                    <option value="private">
                      Private
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Publish */}
          <section className="flex flex-col gap-4 rounded-3xl border border-[#dfe6e1] bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div>
              <h2 className="font-semibold">
                Ready to publish?
              </h2>

              <p className="mt-1 text-sm text-[#718078]">
                Your video will be uploaded to your
                Knerdly video library.
              </p>
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="min-h-12 rounded-full bg-[#17352d] px-7 text-sm font-semibold text-white transition hover:bg-[#285247] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading
                ? "Uploading..."
                : "Publish video"}
            </button>
          </section>
        </form>
      </div>
    </main>
  );
}