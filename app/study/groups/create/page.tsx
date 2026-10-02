"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "../../../../supabase/client";

const subjects = [
  "General",
  "English",
  "Literature",
  "Theory",
  "Philosophy",
  "Business",
  "Computer Science",
  "Mathematics",
  "Science",
  "Language",
  "Other",
];

export default function CreateStudyGroupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] =
    useState("");
  const [subject, setSubject] = useState("General");
  const [courseCode, setCourseCode] =
    useState("");
  const [privacy, setPrivacy] = useState<
    "public" | "private"
  >("public");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const trimmedName = name.trim();
    const trimmedDescription =
      description.trim();
    const trimmedCourseCode =
      courseCode.trim();

    if (!trimmedName) {
      setError("Please enter a group name.");
      return;
    }

    if (trimmedName.length < 3) {
      setError(
        "The group name must be at least 3 characters."
      );
      return;
    }

    if (trimmedName.length > 80) {
      setError(
        "The group name must be 80 characters or fewer."
      );
      return;
    }

    if (trimmedDescription.length > 500) {
      setError(
        "The description must be 500 characters or fewer."
      );
      return;
    }

    if (trimmedCourseCode.length > 30) {
      setError(
        "The course code must be 30 characters or fewer."
      );
      return;
    }

    setSaving(true);

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error: insertError } =
      await supabase
        .from("study_groups")
        .insert({
          user_id: user.id,
          name: trimmedName,
          description:
            trimmedDescription || null,
          subject:
            subject === "Other"
              ? null
              : subject,
          course_code:
            trimmedCourseCode || null,
          privacy,
        })
        .select("id")
        .single();

    if (insertError) {
      console.error(
        "Study group creation error:",
        insertError
      );

      setError(insertError.message);
      setSaving(false);
      return;
    }

    if (!data?.id) {
      setError(
        "The study group was created, but its ID could not be retrieved."
      );
      setSaving(false);
      return;
    }

    router.push(`/study/groups/${data.id}`);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#17352d]">
      {/* Header */}
      <header className="border-b border-[#dfe6e1] bg-[#f7f8f5]">
        <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 lg:px-8">
          <Link
            href="/study/groups"
            className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#557067] transition hover:text-[#17352d]"
          >
            <span aria-hidden="true">←</span>
            Back to study groups
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {/* Heading */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a17a32]">
            Collaborative learning
          </p>

          <h1 className="mt-2 font-[var(--font-playfair)] text-3xl font-semibold tracking-tight sm:text-4xl">
            Create a study group
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#718078] sm:text-base">
            Create a focused space where students can study,
            discuss course material, and prepare together.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-[#dfe6e1] bg-white p-5 sm:p-8"
        >
          {error && (
            <div
              role="alert"
              className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
            >
              {error}
            </div>
          )}

          {/* Group name */}
          <div>
            <label
              htmlFor="group-name"
              className="text-sm font-semibold text-[#17352d]"
            >
              Group name
            </label>

            <input
              id="group-name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="e.g. ENG-307 Theory Study Circle"
              maxLength={80}
              required
              className="mt-2 min-h-12 w-full rounded-2xl border border-[#d8e1db] bg-white px-4 text-sm text-[#17352d] outline-none transition placeholder:text-[#a2ada7] focus:border-[#557067] focus:ring-2 focus:ring-[#edf2ee]"
            />

            <p className="mt-2 text-xs text-[#8a9891]">
              {name.length}/80 characters
            </p>
          </div>

          {/* Description */}
          <div className="mt-6">
            <label
              htmlFor="group-description"
              className="text-sm font-semibold text-[#17352d]"
            >
              Description
            </label>

            <textarea
              id="group-description"
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder="What will students study or discuss in this group?"
              maxLength={500}
              rows={5}
              className="mt-2 w-full resize-y rounded-2xl border border-[#d8e1db] bg-white px-4 py-3 text-sm leading-6 text-[#17352d] outline-none transition placeholder:text-[#a2ada7] focus:border-[#557067] focus:ring-2 focus:ring-[#edf2ee]"
            />

            <p className="mt-2 text-xs text-[#8a9891]">
              {description.length}/500 characters
            </p>
          </div>

          {/* Subject + course */}
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="group-subject"
                className="text-sm font-semibold text-[#17352d]"
              >
                Subject
              </label>

              <select
                id="group-subject"
                value={subject}
                onChange={(event) =>
                  setSubject(event.target.value)
                }
                className="mt-2 min-h-12 w-full rounded-2xl border border-[#d8e1db] bg-white px-4 text-sm text-[#17352d] outline-none transition focus:border-[#557067] focus:ring-2 focus:ring-[#edf2ee]"
              >
                {subjects.map(
                  (subjectOption) => (
                    <option
                      key={subjectOption}
                      value={subjectOption}
                    >
                      {subjectOption}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="course-code"
                className="text-sm font-semibold text-[#17352d]"
              >
                Course code
                <span className="ml-1 font-normal text-[#9aa59f]">
                  optional
                </span>
              </label>

              <input
                id="course-code"
                type="text"
                value={courseCode}
                onChange={(event) =>
                  setCourseCode(
                    event.target.value
                  )
                }
                placeholder="e.g. ENG-307"
                maxLength={30}
                className="mt-2 min-h-12 w-full rounded-2xl border border-[#d8e1db] bg-white px-4 text-sm uppercase text-[#17352d] outline-none transition placeholder:normal-case placeholder:text-[#a2ada7] focus:border-[#557067] focus:ring-2 focus:ring-[#edf2ee]"
              />
            </div>
          </div>

          {/* Privacy */}
          <div className="mt-6">
            <p className="text-sm font-semibold text-[#17352d]">
              Privacy
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  privacy === "public"
                    ? "border-[#557067] bg-[#edf2ee]"
                    : "border-[#dfe6e1] bg-white hover:border-[#c6d1ca]"
                }`}
              >
                <input
                  type="radio"
                  name="privacy"
                  value="public"
                  checked={privacy === "public"}
                  onChange={() =>
                    setPrivacy("public")
                  }
                  className="sr-only"
                />

                <span className="block text-sm font-semibold">
                  Public
                </span>

                <span className="mt-1 block text-xs leading-5 text-[#718078]">
                  Any student can discover and join
                  this group.
                </span>
              </label>

              <label
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  privacy === "private"
                    ? "border-[#557067] bg-[#edf2ee]"
                    : "border-[#dfe6e1] bg-white hover:border-[#c6d1ca]"
                }`}
              >
                <input
                  type="radio"
                  name="privacy"
                  value="private"
                  checked={privacy === "private"}
                  onChange={() =>
                    setPrivacy("private")
                  }
                  className="sr-only"
                />

                <span className="block text-sm font-semibold">
                  Private
                </span>

                <span className="mt-1 block text-xs leading-5 text-[#718078]">
                  Only invited or approved students
                  should access this group.
                </span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/study/groups"
              className="flex min-h-12 items-center justify-center rounded-full border border-[#d8e1db] px-6 text-sm font-semibold text-[#557067] transition hover:border-[#b8c6bd] hover:text-[#17352d]"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="min-h-12 rounded-full bg-[#17352d] px-7 text-sm font-semibold text-white transition hover:bg-[#285247] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Creating..."
                : "Create study group"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
