"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const categories = [
  "General",
  "University",
  "Department",
  "Subject",
  "Study Group",
  "Technology",
  "Literature",
  "Business",
  "Career",
  "Language",
];

export default function CreateCommunityPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    setError("");

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (trimmedName.length < 3 || trimmedName.length > 80) {
      setError(
        "Community name must be between 3 and 80 characters."
      );
      return;
    }

    if (trimmedDescription.length > 500) {
      setError(
        "Community description cannot exceed 500 characters."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/communities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          description: trimmedDescription,
          category,
          privacy,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(
          result.message || "Could not create the community."
        );
        setIsSubmitting(false);
        return;
      }

      router.push(`/communities/${result.community.slug}`);
      router.refresh();
    } catch (error) {
      console.error("Create community error:", error);

      setError(
        "Something went wrong. Please try again."
      );
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#17352d]">
      {/* Header */}
      <header className="border-b border-[#dfe6e1] bg-[#f7f8f5]">
        <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
          <Link
            href="/communities"
            className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#557067] transition hover:text-[#17352d]"
          >
            <span aria-hidden="true">←</span>
            Back to communities
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {/* Intro */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a17a32]">
            Build a learning space
          </p>

          <h1 className="mt-3 font-[var(--font-playfair)] text-3xl font-semibold tracking-tight text-[#17352d] sm:text-4xl">
            Create a community
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#718078] sm:text-base">
            Create a focused space where students can discuss ideas,
            exchange resources, ask questions, and learn together.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-[#dfe6e1] bg-white p-5 sm:p-8"
        >
          {/* Community name */}
          <div>
            <label
              htmlFor="community-name"
              className="text-sm font-semibold text-[#17352d]"
            >
              Community name
            </label>

            <p className="mt-1 text-xs leading-5 text-[#8a9891]">
              Choose a clear name that students can easily recognize.
            </p>

            <input
              id="community-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              placeholder="e.g. GUB English Literature"
              disabled={isSubmitting}
              className="mt-3 min-h-12 w-full rounded-2xl border border-[#dfe6e1] bg-[#fbfcfa] px-4 text-sm text-[#17352d] outline-none transition placeholder:text-[#a4afa9] focus:border-[#557067] focus:ring-2 focus:ring-[#17352d]/10 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <div className="mt-2 flex justify-end">
              <span className="text-[11px] text-[#8a9891]">
                {name.length}/80
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="mt-7">
            <label
              htmlFor="community-description"
              className="text-sm font-semibold text-[#17352d]"
            >
              Description
              <span className="ml-2 font-normal text-[#9aa69f]">
                Optional
              </span>
            </label>

            <p className="mt-1 text-xs leading-5 text-[#8a9891]">
              Tell potential members what this community is about.
            </p>

            <textarea
              id="community-description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              maxLength={500}
              rows={5}
              placeholder="What will students discuss or learn here?"
              disabled={isSubmitting}
              className="mt-3 w-full resize-none rounded-2xl border border-[#dfe6e1] bg-[#fbfcfa] px-4 py-3 text-sm leading-6 text-[#17352d] outline-none transition placeholder:text-[#a4afa9] focus:border-[#557067] focus:ring-2 focus:ring-[#17352d]/10 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <div className="mt-2 flex justify-end">
              <span className="text-[11px] text-[#8a9891]">
                {description.length}/500
              </span>
            </div>
          </div>

          {/* Category */}
          <div className="mt-7">
            <label
              htmlFor="community-category"
              className="text-sm font-semibold text-[#17352d]"
            >
              Category
            </label>

            <p className="mt-1 text-xs leading-5 text-[#8a9891]">
              Help students discover your community.
            </p>

            <select
              id="community-category"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
              disabled={isSubmitting}
              className="mt-3 min-h-12 w-full rounded-2xl border border-[#dfe6e1] bg-[#fbfcfa] px-4 text-sm text-[#17352d] outline-none transition focus:border-[#557067] focus:ring-2 focus:ring-[#17352d]/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* Privacy */}
          <fieldset className="mt-7">
            <legend className="text-sm font-semibold text-[#17352d]">
              Privacy
            </legend>

            <p className="mt-1 text-xs leading-5 text-[#8a9891]">
              Choose who can access this community.
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {/* Public */}
              <button
                type="button"
                onClick={() => setPrivacy("public")}
                disabled={isSubmitting}
                className={`min-h-28 rounded-2xl border p-4 text-left transition ${
                  privacy === "public"
                    ? "border-[#557067] bg-[#edf2ee]"
                    : "border-[#dfe6e1] bg-[#fbfcfa] hover:border-[#b8c6bd]"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#17352d]">
                      Public
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#718078]">
                      Anyone can discover the community and view its
                      discussions.
                    </p>
                  </div>

                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      privacy === "public"
                        ? "border-[#17352d] bg-[#17352d]"
                        : "border-[#b8c6bd]"
                    }`}
                  >
                    {privacy === "public" && (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </span>
                </div>
              </button>

              {/* Private */}
              <button
                type="button"
                onClick={() => setPrivacy("private")}
                disabled={isSubmitting}
                className={`min-h-28 rounded-2xl border p-4 text-left transition ${
                  privacy === "private"
                    ? "border-[#557067] bg-[#edf2ee]"
                    : "border-[#dfe6e1] bg-[#fbfcfa] hover:border-[#b8c6bd]"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#17352d]">
                      Private
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#718078]">
                      Only members can access the community and its
                      discussions.
                    </p>
                  </div>

                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      privacy === "private"
                        ? "border-[#17352d] bg-[#17352d]"
                        : "border-[#b8c6bd]"
                    }`}
                  >
                    {privacy === "private" && (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </span>
                </div>
              </button>
            </div>
          </fieldset>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="mt-7 rounded-2xl border border-[#ead3cf] bg-[#fff7f5] px-4 py-3 text-sm leading-6 text-[#a24d42]"
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/communities"
              className="flex min-h-12 items-center justify-center rounded-full border border-[#dfe6e1] px-6 text-sm font-semibold text-[#557067] transition hover:border-[#b8c6bd] hover:text-[#17352d]"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex min-h-12 items-center justify-center rounded-full bg-[#17352d] px-7 text-sm font-semibold text-white transition hover:bg-[#285247] active:bg-[#285247] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? "Creating community..."
                : "Create community"}
            </button>
          </div>
        </form>

        {/* Note */}
        <p className="mt-5 text-center text-xs leading-5 text-[#8a9891]">
          You will automatically become the owner of the community you
          create.
        </p>
      </div>
    </main>
  );
}
