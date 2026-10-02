"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../supabase/client";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const MAX_COVER_SIZE = 8 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

type ProfileImageState = {
  avatarUrl: string;
  coverUrl: string;
};

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [images, setImages] = useState<ProfileImageState>({
    avatarUrl: "",
    coverUrl: "",
  });

  const [avatarFile, setAvatarFile] =
    useState<File | null>(null);

  const [coverFile, setCoverFile] =
    useState<File | null>(null);

  const [avatarPreview, setAvatarPreview] =
    useState("");

  const [coverPreview, setCoverPreview] =
    useState("");

  const [form, setForm] = useState({
    username: "",
    display_name: "",
    bio: "",
    institution: "",
    department: "",
    program: "",
    academic_level: "",
    identity_mode: "real",
    profile_visibility: "public",
  });

  useEffect(() => {
    async function loadProfile() {
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setForm({
        username: data.username || "",
        display_name:
          data.display_name ||
          user.user_metadata?.display_name ||
          "",
        bio: data.bio || "",
        institution: data.institution || "",
        department: data.department || "",
        program: data.program || "",
        academic_level: data.academic_level || "",
        identity_mode: data.identity_mode || "real",
        profile_visibility:
          data.profile_visibility || "public",
      });

      setImages({
        avatarUrl: data.avatar_url || "",
        coverUrl: data.cover_url || "",
      });

      setAvatarPreview(data.avatar_url || "");
      setCoverPreview(data.cover_url || "");

      setLoading(false);
    }

    loadProfile();
  }, [router, supabase]);

  function updateField(
    field: keyof typeof form,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function validateImage(
    file: File,
    type: "avatar" | "cover"
  ) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return "Please choose a JPG, PNG, or WebP image.";
    }

    const maxSize =
      type === "avatar"
        ? MAX_AVATAR_SIZE
        : MAX_COVER_SIZE;

    if (file.size > maxSize) {
      const limit =
        type === "avatar" ? "5 MB" : "8 MB";

      return `The ${type} image must be smaller than ${limit}.`;
    }

    return "";
  }

  function handleAvatarChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError = validateImage(
      file,
      "avatar"
    );

    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }

    setError("");
    setMessage("");

    setAvatarFile(file);

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
  }

  function handleCoverChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError = validateImage(
      file,
      "cover"
    );

    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }

    setError("");
    setMessage("");

    setCoverFile(file);

    const previewUrl = URL.createObjectURL(file);
    setCoverPreview(previewUrl);
  }

  function getFileExtension(file: File) {
    const extension =
      file.name.split(".").pop()?.toLowerCase();

    if (
      extension === "jpg" ||
      extension === "jpeg"
    ) {
      return "jpg";
    }

    if (extension === "png") {
      return "png";
    }

    return "webp";
  }

  async function uploadImage(
    file: File,
    bucket: "avatars" | "profile-covers",
    userId: string,
    prefix: "avatar" | "cover"
  ) {
    const extension = getFileExtension(file);

    const filePath = `${userId}/${prefix}-${Date.now()}.${extension}`;

    const { error: uploadError } =
      await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrl;
  }

  function getStoragePath(
    publicUrl: string,
    bucket: "avatars" | "profile-covers"
  ) {
    const marker = `/storage/v1/object/public/${bucket}/`;

    const index = publicUrl.indexOf(marker);

    if (index === -1) {
      return null;
    }

    return decodeURIComponent(
      publicUrl.slice(index + marker.length)
    );
  }

  async function deleteOldImage(
    publicUrl: string,
    bucket: "avatars" | "profile-covers"
  ) {
    if (!publicUrl) {
      return;
    }

    const path = getStoragePath(
      publicUrl,
      bucket
    );

    if (!path) {
      return;
    }

    const { error: deleteError } =
      await supabase.storage
        .from(bucket)
        .remove([path]);

    if (deleteError) {
      console.warn(
        `Could not delete old ${bucket} file:`,
        deleteError.message
      );
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const username = form.username
        .trim()
        .toLowerCase();

      if (!username) {
        setError("Please choose a username.");
        setSaving(false);
        return;
      }

      if (!/^[a-z0-9_]{3,30}$/.test(username)) {
        setError(
          "Username must be 3–30 characters and use only letters, numbers, and underscores."
        );
        setSaving(false);
        return;
      }

      let avatarUrl = images.avatarUrl;
      let coverUrl = images.coverUrl;

      /*
       * Upload new images first.
       * The old files are removed only after the profile
       * update succeeds.
       */
      if (avatarFile) {
        avatarUrl = await uploadImage(
          avatarFile,
          "avatars",
          user.id,
          "avatar"
        );
      }

      if (coverFile) {
        coverUrl = await uploadImage(
          coverFile,
          "profile-covers",
          user.id,
          "cover"
        );
      }

      const { error: updateError } =
        await supabase
          .from("profiles")
          .update({
            username,
            display_name:
              form.display_name.trim(),
            bio: form.bio.trim(),
            institution:
              form.institution.trim(),
            department:
              form.department.trim(),
            program: form.program.trim(),
            academic_level:
              form.academic_level,
            identity_mode:
              form.identity_mode,
            profile_visibility:
              form.profile_visibility,
            avatar_url: avatarUrl || null,
            cover_url: coverUrl || null,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", user.id);

      if (updateError) {
        if (updateError.code === "23505") {
          setError(
            "That username is already taken."
          );
        } else {
          setError(updateError.message);
        }

        setSaving(false);
        return;
      }

      /*
       * Remove previous images after the new URLs
       * have been successfully saved.
       */
      if (
        avatarFile &&
        images.avatarUrl &&
        images.avatarUrl !== avatarUrl
      ) {
        await deleteOldImage(
          images.avatarUrl,
          "avatars"
        );
      }

      if (
        coverFile &&
        images.coverUrl &&
        images.coverUrl !== coverUrl
      ) {
        await deleteOldImage(
          images.coverUrl,
          "profile-covers"
        );
      }

      setImages({
        avatarUrl,
        coverUrl,
      });

      setAvatarFile(null);
      setCoverFile(null);

      setMessage(
        "Profile updated successfully."
      );

      setSaving(false);

      setTimeout(() => {
        router.push("/home");
        router.refresh();
      }, 700);
    } catch (uploadError) {
      console.error(
        "Profile update error:",
        uploadError
      );

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Something went wrong while updating your profile."
      );

      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f2] px-6">
        <p className="text-sm text-[#718079]">
          Loading your profile...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-4 py-6 text-[#17352d] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <Link
              href="/home"
              className="text-2xl font-bold tracking-[-0.04em]"
            >
              Knerdly
            </Link>

            <p className="mt-2 text-sm text-[#718079]">
              Build your academic identity.
            </p>
          </div>

          <Link
            href="/home"
            className="shrink-0 rounded-full border border-[#d8e0da] bg-white px-4 py-2 text-sm font-medium text-[#557067] transition hover:border-[#17352d]"
          >
            Cancel
          </Link>
        </div>

        <section className="rounded-3xl border border-[#dce4de] bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b08f4c]">
              Profile
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
              Edit your profile
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[#718079]">
              Tell other students who you are,
              what you study, and how you want
              to appear on Knerdly.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-7"
          >
            {/* Profile images */}
            <div>
              <h2 className="text-lg font-semibold">
                Profile images
              </h2>

              <p className="mt-1 text-sm leading-6 text-[#718079]">
                Add a profile picture and a
                background image to make your
                profile recognizable.
              </p>

              {/* Cover preview */}
              <div className="relative mt-5 overflow-hidden rounded-3xl border border-[#d8e0da] bg-[#edf2eb]">
                <div className="aspect-[3/1] min-h-[150px]">
                  {coverPreview ? (
                    <img
                      src={coverPreview}
                      alt="Profile cover preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#17352d] via-[#285247] to-[#557067]">
                      <div className="text-center text-white/80">
                        <p className="text-sm font-semibold">
                          Your profile cover
                        </p>

                        <p className="mt-1 text-xs">
                          Add a background image
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="absolute bottom-3 right-3">
                  <label className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full bg-white/95 px-4 text-xs font-semibold text-[#17352d] shadow-sm backdrop-blur transition hover:bg-white">
                    {coverFile
                      ? "Change cover"
                      : "Upload cover"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={
                        handleCoverChange
                      }
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              <p className="mt-2 text-xs text-[#8a9892]">
                JPG, PNG, or WebP · Maximum 8 MB
              </p>

              {/* Avatar */}
              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#17352d] text-2xl font-semibold text-white shadow-md ring-1 ring-[#d8e0da]">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Profile picture preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>
                      {form.display_name
                        .trim()
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map(
                          (name) =>
                            name[0]
                        )
                        .join("")
                        .toUpperCase() ||
                        "K"}
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    Profile picture
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#718079]">
                    Use a clear photo or image
                    that represents you.
                  </p>

                  <label className="mt-3 inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full border border-[#d8e0da] bg-white px-4 text-xs font-semibold text-[#557067] transition hover:border-[#17352d] hover:text-[#17352d]">
                    {avatarFile
                      ? "Change picture"
                      : "Upload picture"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={
                        handleAvatarChange
                      }
                      className="sr-only"
                    />
                  </label>

                  <p className="mt-2 text-xs text-[#8a9892]">
                    JPG, PNG, or WebP · Maximum
                    5 MB
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-[#edf0ed]" />

            {/* Basic information */}
            <div>
              <h2 className="text-lg font-semibold">
                Basic information
              </h2>

              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium">
                    Display name
                  </span>

                  <input
                    type="text"
                    value={form.display_name}
                    onChange={(event) =>
                      updateField(
                        "display_name",
                        event.target.value
                      )
                    }
                    placeholder="Your name"
                    className="mt-2 w-full rounded-2xl border border-[#d8e0da] bg-[#fbfcfa] px-4 py-3 text-sm outline-none transition focus:border-[#17352d] focus:ring-2 focus:ring-[#17352d]/10"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium">
                    Username
                  </span>

                  <input
                    type="text"
                    value={form.username}
                    onChange={(event) =>
                      updateField(
                        "username",
                        event.target.value
                          .toLowerCase()
                          .replace(/\s/g, "")
                      )
                    }
                    placeholder="your_username"
                    maxLength={30}
                    className="mt-2 w-full rounded-2xl border border-[#d8e0da] bg-[#fbfcfa] px-4 py-3 text-sm outline-none transition focus:border-[#17352d] focus:ring-2 focus:ring-[#17352d]/10"
                  />

                  <p className="mt-2 text-xs text-[#8a9892]">
                    3–30 characters: letters,
                    numbers, and underscores.
                  </p>
                </label>
              </div>

              <label className="mt-5 block">
                <span className="text-sm font-medium">
                  Bio
                </span>

                <textarea
                  value={form.bio}
                  onChange={(event) =>
                    updateField(
                      "bio",
                      event.target.value
                    )
                  }
                  placeholder="Tell other students a little about yourself..."
                  rows={4}
                  maxLength={500}
                  className="mt-2 w-full resize-none rounded-2xl border border-[#d8e0da] bg-[#fbfcfa] px-4 py-3 text-sm outline-none transition focus:border-[#17352d] focus:ring-2 focus:ring-[#17352d]/10"
                />

                <p className="mt-2 text-right text-xs text-[#8a9892]">
                  {form.bio.length}/500
                </p>
              </label>
            </div>

            <div className="border-t border-[#edf0ed]" />

            {/* Academic information */}
            <div>
              <h2 className="text-lg font-semibold">
                Academic information
              </h2>

              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium">
                    Institution
                  </span>

                  <input
                    type="text"
                    value={form.institution}
                    onChange={(event) =>
                      updateField(
                        "institution",
                        event.target.value
                      )
                    }
                    placeholder="University or college"
                    className="mt-2 w-full rounded-2xl border border-[#d8e0da] bg-[#fbfcfa] px-4 py-3 text-sm outline-none transition focus:border-[#17352d] focus:ring-2 focus:ring-[#17352d]/10"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium">
                    Department
                  </span>

                  <input
                    type="text"
                    value={form.department}
                    onChange={(event) =>
                      updateField(
                        "department",
                        event.target.value
                      )
                    }
                    placeholder="Department"
                    className="mt-2 w-full rounded-2xl border border-[#d8e0da] bg-[#fbfcfa] px-4 py-3 text-sm outline-none transition focus:border-[#17352d] focus:ring-2 focus:ring-[#17352d]/10"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium">
                    Program
                  </span>

                  <input
                    type="text"
                    value={form.program}
                    onChange={(event) =>
                      updateField(
                        "program",
                        event.target.value
                      )
                    }
                    placeholder="e.g. BA in English"
                    className="mt-2 w-full rounded-2xl border border-[#d8e0da] bg-[#fbfcfa] px-4 py-3 text-sm outline-none transition focus:border-[#17352d] focus:ring-2 focus:ring-[#17352d]/10"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium">
                    Academic level
                  </span>

                  <select
                    value={
                      form.academic_level
                    }
                    onChange={(event) =>
                      updateField(
                        "academic_level",
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-2xl border border-[#d8e0da] bg-[#fbfcfa] px-4 py-3 text-sm outline-none transition focus:border-[#17352d] focus:ring-2 focus:ring-[#17352d]/10"
                  >
                    <option value="">
                      Select academic level
                    </option>
                    <option value="Undergraduate">
                      Undergraduate
                    </option>
                    <option value="Graduate">
                      Graduate
                    </option>
                    <option value="Postgraduate">
                      Postgraduate
                    </option>
                    <option value="Doctoral">
                      Doctoral
                    </option>
                    <option value="Other">
                      Other
                    </option>
                  </select>
                </label>
              </div>
            </div>

            <div className="border-t border-[#edf0ed]" />

            {/* Identity */}
            <div>
              <h2 className="text-lg font-semibold">
                Identity
              </h2>

              <p className="mt-1 text-sm leading-6 text-[#718079]">
                Choose how you want to present
                yourself publicly on Knerdly.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label
                  className={`cursor-pointer rounded-2xl border p-4 transition ${
                    form.identity_mode === "real"
                      ? "border-[#17352d] bg-[#edf2eb]"
                      : "border-[#d8e0da] bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="identity_mode"
                    value="real"
                    checked={
                      form.identity_mode ===
                      "real"
                    }
                    onChange={(event) =>
                      updateField(
                        "identity_mode",
                        event.target.value
                      )
                    }
                    className="sr-only"
                  />

                  <span className="block text-sm font-semibold">
                    Real identity
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-[#718079]">
                    Use your actual name and
                    academic identity.
                  </span>
                </label>

                <label
                  className={`cursor-pointer rounded-2xl border p-4 transition ${
                    form.identity_mode ===
                    "pseudonymous"
                      ? "border-[#17352d] bg-[#edf2eb]"
                      : "border-[#d8e0da] bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="identity_mode"
                    value="pseudonymous"
                    checked={
                      form.identity_mode ===
                      "pseudonymous"
                    }
                    onChange={(event) =>
                      updateField(
                        "identity_mode",
                        event.target.value
                      )
                    }
                    className="sr-only"
                  />

                  <span className="block text-sm font-semibold">
                    Pseudonymous
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-[#718079]">
                    Use a public name that is
                    different from your real
                    identity.
                  </span>
                </label>
              </div>
            </div>

            <div className="border-t border-[#edf0ed]" />

            {/* Privacy */}
            <div>
              <h2 className="text-lg font-semibold">
                Profile visibility
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  {
                    value: "public",
                    title: "Public",
                    description:
                      "Anyone can view your profile.",
                  },
                  {
                    value: "friends",
                    title: "Friends",
                    description:
                      "Only your friends can view it.",
                  },
                  {
                    value: "private",
                    title: "Private",
                    description:
                      "Only you can view your profile.",
                  },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      form.profile_visibility ===
                      option.value
                        ? "border-[#17352d] bg-[#edf2eb]"
                        : "border-[#d8e0da] bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="profile_visibility"
                      value={option.value}
                      checked={
                        form.profile_visibility ===
                        option.value
                      }
                      onChange={(event) =>
                        updateField(
                          "profile_visibility",
                          event.target.value
                        )
                      }
                      className="sr-only"
                    />

                    <span className="block text-sm font-semibold">
                      {option.title}
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-[#718079]">
                      {option.description}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Feedback */}
            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {message && (
              <div
                role="status"
                className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
              >
                {message}
              </div>
            )}

            {/* Submit */}
            <div className="flex flex-col-reverse gap-3 border-t border-[#edf0ed] pt-6 sm:flex-row sm:justify-end">
              <Link
                href="/home"
                className="rounded-full border border-[#d8e0da] px-6 py-3 text-center text-sm font-semibold text-[#557067] transition hover:border-[#17352d]"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[#17352d] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#285247] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : "Save profile"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
