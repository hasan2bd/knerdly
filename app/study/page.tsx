"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "../../supabase/client";

type Course = {
  id: string;
  user_id: string;
  course_code: string;
  course_name: string;
  instructor: string | null;
  semester: string | null;
  color: string;
  created_at: string;
};

type Resource = {
  id: string;
  user_id: string;
  course_id: string;
  title: string;
  description: string | null;
  resource_type:
    | "note"
    | "lecture"
    | "reading"
    | "link"
    | "assignment"
    | "other";
  content: string | null;
  resource_url: string | null;
  created_at: string;
};

type ResourceType = Resource["resource_type"];

const resourceTypes: {
  value: ResourceType;
  label: string;
}[] = [
  { value: "note", label: "Note" },
  { value: "lecture", label: "Lecture" },
  { value: "reading", label: "Reading" },
  { value: "link", label: "Link" },
  { value: "assignment", label: "Assignment" },
  { value: "other", label: "Other" },
];

const courseColors = [
  "green",
  "blue",
  "gold",
  "purple",
  "red",
];

const colorClasses: Record<
  string,
  {
    dot: string;
    badge: string;
    border: string;
  }
> = {
  green: {
    dot: "bg-[#17352d]",
    badge: "bg-[#edf2eb] text-[#557067]",
    border: "border-[#dce4de]",
  },
  blue: {
    dot: "bg-[#355c7d]",
    badge: "bg-[#edf3f7] text-[#355c7d]",
    border: "border-[#d8e3eb]",
  },
  gold: {
    dot: "bg-[#a17a32]",
    badge: "bg-[#f7f1e5] text-[#8a682b]",
    border: "border-[#eadfc8]",
  },
  purple: {
    dot: "bg-[#66527a]",
    badge: "bg-[#f1edf5] text-[#66527a]",
    border: "border-[#dfd7e7]",
  },
  red: {
    dot: "bg-[#9a5147]",
    badge: "bg-[#f7eded] text-[#9a5147]",
    border: "border-[#ead8d5]",
  },
};

const emptyResourceForm = {
  title: "",
  description: "",
  resource_type: "note" as ResourceType,
  content: "",
  resource_url: "",
};

export default function StudyPage() {
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState<string | null>(null);

  const [courses, setCourses] = useState<Course[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [courseFormOpen, setCourseFormOpen] =
    useState(false);

  const [courseSaving, setCourseSaving] =
    useState(false);

  const [courseError, setCourseError] =
    useState("");

  const [courseForm, setCourseForm] = useState({
    course_code: "",
    course_name: "",
    instructor: "",
    semester: "",
    color: "green",
  });

  const [resourceCourse, setResourceCourse] =
    useState<Course | null>(null);

  const [resourceForm, setResourceForm] =
    useState(emptyResourceForm);

  const [resourceSaving, setResourceSaving] =
    useState(false);

  const [resourceError, setResourceError] =
    useState("");

  const [resourceDeleting, setResourceDeleting] =
    useState<string | null>(null);

  const [courseDeleting, setCourseDeleting] =
    useState<string | null>(null);

  useEffect(() => {
    loadStudyData();
  }, []);

  async function loadStudyData() {
    setLoading(true);
    setPageError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setUserId(user.id);

    const [
      { data: courseData, error: courseError },
      { data: resourceData, error: resourceError },
    ] = await Promise.all([
      supabase
        .from("study_courses")
        .select(
          "id, user_id, course_code, course_name, instructor, semester, color, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("study_resources")
        .select(
          "id, user_id, course_id, title, description, resource_type, content, resource_url, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        }),
    ]);

    if (courseError) {
      setPageError(courseError.message);
      setLoading(false);
      return;
    }

    if (resourceError) {
      setPageError(resourceError.message);
      setLoading(false);
      return;
    }

    setCourses((courseData || []) as Course[]);
    setResources((resourceData || []) as Resource[]);
    setLoading(false);
  }

  async function handleCourseSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!userId) {
      setCourseError("You must be logged in.");
      return;
    }

    const courseCode =
      courseForm.course_code.trim();

    const courseName =
      courseForm.course_name.trim();

    if (!courseCode || !courseName) {
      setCourseError(
        "Course code and course name are required."
      );
      return;
    }

    setCourseSaving(true);
    setCourseError("");

    const { data, error } = await supabase
      .from("study_courses")
      .insert({
        user_id: userId,
        course_code: courseCode,
        course_name: courseName,
        instructor:
          courseForm.instructor.trim() || null,
        semester:
          courseForm.semester.trim() || null,
        color: courseForm.color,
      })
      .select(
        "id, user_id, course_code, course_name, instructor, semester, color, created_at"
      )
      .single();

    if (error) {
      setCourseError(error.message);
      setCourseSaving(false);
      return;
    }

    setCourses((current) => [
      data as Course,
      ...current,
    ]);

    setCourseForm({
      course_code: "",
      course_name: "",
      instructor: "",
      semester: "",
      color: "green",
    });

    setCourseSaving(false);
    setCourseFormOpen(false);
  }

  function openResourceModal(course: Course) {
    setResourceCourse(course);
    setResourceForm({
      ...emptyResourceForm,
    });
    setResourceError("");
  }

  function closeResourceModal() {
    if (resourceSaving) {
      return;
    }

    setResourceCourse(null);
    setResourceForm({
      ...emptyResourceForm,
    });
    setResourceError("");
  }

  async function handleResourceSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!userId) {
      setResourceError(
        "Your session has expired. Please log in again."
      );
      return;
    }

    if (!resourceCourse) {
      setResourceError(
        "No course was selected for this resource."
      );
      return;
    }

    const title =
      resourceForm.title.trim();

    const description =
      resourceForm.description.trim();

    const content =
      resourceForm.content.trim();

    const resourceUrl =
      resourceForm.resource_url.trim();

    if (!title) {
      setResourceError(
        "Please enter a resource title."
      );
      return;
    }

    if (
      resourceForm.resource_type === "link" &&
      !resourceUrl
    ) {
      setResourceError(
        "Please enter a URL for this link resource."
      );
      return;
    }

    setResourceSaving(true);
    setResourceError("");

    const payload = {
      user_id: userId,
      course_id: resourceCourse.id,
      title,
      description: description || null,
      resource_type: resourceForm.resource_type,
      content:
        resourceForm.resource_type === "link"
          ? null
          : content || null,
      resource_url:
        resourceForm.resource_type === "link"
          ? resourceUrl
          : null,
    };

    const { data, error } = await supabase
      .from("study_resources")
      .insert(payload)
      .select(
        "id, user_id, course_id, title, description, resource_type, content, resource_url, created_at"
      )
      .single();

    if (error) {
      console.error(
        "Study resource insert error:",
        error
      );

      setResourceError(error.message);
      setResourceSaving(false);
      return;
    }

    if (!data) {
      setResourceError(
        "The resource could not be saved."
      );
      setResourceSaving(false);
      return;
    }

    setResources((current) => [
      data as Resource,
      ...current,
    ]);

    setResourceSaving(false);

    setResourceCourse(null);

    setResourceForm({
      ...emptyResourceForm,
    });
  }

  async function deleteResource(
    resourceId: string
  ) {
    setResourceDeleting(resourceId);
    setPageError("");

    const { error } = await supabase
      .from("study_resources")
      .delete()
      .eq("id", resourceId);

    if (error) {
      setPageError(error.message);
      setResourceDeleting(null);
      return;
    }

    setResources((current) =>
      current.filter(
        (resource) =>
          resource.id !== resourceId
      )
    );

    setResourceDeleting(null);
  }

  async function deleteCourse(
    courseId: string
  ) {
    const confirmed = window.confirm(
      "Delete this course? Its study resources will also be deleted."
    );

    if (!confirmed) {
      return;
    }

    setCourseDeleting(courseId);
    setPageError("");

    const { error } = await supabase
      .from("study_courses")
      .delete()
      .eq("id", courseId);

    if (error) {
      setPageError(error.message);
      setCourseDeleting(null);
      return;
    }

    setCourses((current) =>
      current.filter(
        (course) => course.id !== courseId
      )
    );

    setResources((current) =>
      current.filter(
        (resource) =>
          resource.course_id !== courseId
      )
    );

    setCourseDeleting(null);
  }

  function getCourseResources(
    courseId: string
  ) {
    return resources.filter(
      (resource) =>
        resource.course_id === courseId
    );
  }

  function getResourceTypeLabel(
    type: ResourceType
  ) {
    return (
      resourceTypes.find(
        (item) => item.value === type
      )?.label || type
    );
  }

  function formatDate(date: string) {
    return new Intl.DateTimeFormat(
      "en",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    ).format(new Date(date));
  }

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#17352d]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#dfe6e1] bg-[#f7f8f5]/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div>
            <Link
              href="/home"
              className="text-xl font-bold tracking-[-0.04em] sm:text-2xl"
            >
              Knerdly
            </Link>

            <p className="hidden text-xs text-[#8a9891] sm:block">
              Your study space
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/study/groups"
              className="min-h-10 rounded-full border border-[#d8e0da] bg-white px-3 py-2 text-xs font-semibold text-[#557067] transition hover:border-[#17352d] hover:text-[#17352d] sm:px-4 sm:text-sm"
            >
              Study Groups
            </Link>

            <Link
              href="/home"
              className="rounded-full bg-[#17352d] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#285247] sm:text-sm"
            >
              Back to home
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {/* Heading */}
        <section className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a17a32]">
            Study
          </p>

          <h1 className="mt-2 font-[var(--font-playfair)] text-3xl font-semibold tracking-tight sm:text-4xl">
            Organize your learning.
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#718078] sm:text-base">
            Keep your courses, notes, readings, lectures,
            assignments, and useful links in one focused
            academic workspace.
          </p>
        </section>

        {/* Study Groups */}
        <section className="mb-8 overflow-hidden rounded-3xl border border-[#dfe6e1] bg-[#17352d] text-white">
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d8b978]">
                Collaborative learning
              </p>

              <h2 className="mt-2 font-[var(--font-playfair)] text-2xl font-semibold sm:text-3xl">
                Study with people who share your goals.
              </h2>

              <p className="mt-3 text-sm leading-6 text-white/70">
                Discover study groups, join course-focused discussions,
                or create your own space for collaborative learning.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:w-auto sm:min-w-44">
              <Link
                href="/study/groups"
                className="flex min-h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-[#17352d] transition hover:bg-[#f0f3ef]"
              >
                Browse study groups
              </Link>

              <Link
                href="/study/groups/create"
                className="flex min-h-11 items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Create a study group
              </Link>
            </div>
          </div>
        </section>

        {/* Error */}
        {pageError && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {pageError}
          </div>
        )}

        {/* Stats */}
        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-[#dfe6e1] bg-white p-4">
            <p className="text-2xl font-semibold">
              {courses.length}
            </p>
            <p className="mt-1 text-xs text-[#718078]">
              Courses
            </p>
          </div>

          <div className="rounded-2xl border border-[#dfe6e1] bg-white p-4">
            <p className="text-2xl font-semibold">
              {resources.length}
            </p>
            <p className="mt-1 text-xs text-[#718078]">
              Resources
            </p>
          </div>

          <div className="rounded-2xl border border-[#dfe6e1] bg-white p-4">
            <p className="text-2xl font-semibold">
              {
                resources.filter(
                  (resource) =>
                    resource.resource_type === "note"
                ).length
              }
            </p>
            <p className="mt-1 text-xs text-[#718078]">
              Notes
            </p>
          </div>

          <div className="rounded-2xl border border-[#dfe6e1] bg-white p-4">
            <p className="text-2xl font-semibold">
              {
                resources.filter(
                  (resource) =>
                    resource.resource_type === "reading"
                ).length
              }
            </p>
            <p className="mt-1 text-xs text-[#718078]">
              Readings
            </p>
          </div>
        </section>

        {/* Course section */}
        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a17a32]">
                Courses
              </p>

              <h2 className="mt-1 font-[var(--font-playfair)] text-2xl font-semibold">
                My courses
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                setCourseFormOpen(
                  (current) => !current
                );
                setCourseError("");
              }}
              className="min-h-10 rounded-full bg-[#17352d] px-4 text-xs font-semibold text-white transition hover:bg-[#285247]"
            >
              {courseFormOpen
                ? "Close"
                : "+ Add course"}
            </button>
          </div>

          {/* Add course */}
          {courseFormOpen && (
            <form
              onSubmit={handleCourseSubmit}
              className="mb-6 rounded-3xl border border-[#dfe6e1] bg-white p-5 sm:p-6"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold text-[#557067]">
                    Course code
                  </span>

                  <input
                    type="text"
                    value={courseForm.course_code}
                    onChange={(event) =>
                      setCourseForm(
                        (current) => ({
                          ...current,
                          course_code:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="ENG-303"
                    required
                    className="mt-2 min-h-11 w-full rounded-xl border border-[#d8e0da] bg-white px-3 text-sm outline-none transition focus:border-[#17352d]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold text-[#557067]">
                    Course name
                  </span>

                  <input
                    type="text"
                    value={courseForm.course_name}
                    onChange={(event) =>
                      setCourseForm(
                        (current) => ({
                          ...current,
                          course_name:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="American Literature"
                    required
                    className="mt-2 min-h-11 w-full rounded-xl border border-[#d8e0da] bg-white px-3 text-sm outline-none transition focus:border-[#17352d]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold text-[#557067]">
                    Instructor
                  </span>

                  <input
                    type="text"
                    value={courseForm.instructor}
                    onChange={(event) =>
                      setCourseForm(
                        (current) => ({
                          ...current,
                          instructor:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="Instructor name"
                    className="mt-2 min-h-11 w-full rounded-xl border border-[#d8e0da] bg-white px-3 text-sm outline-none transition focus:border-[#17352d]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold text-[#557067]">
                    Semester
                  </span>

                  <input
                    type="text"
                    value={courseForm.semester}
                    onChange={(event) =>
                      setCourseForm(
                        (current) => ({
                          ...current,
                          semester:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="Fall 2026"
                    className="mt-2 min-h-11 w-full rounded-xl border border-[#d8e0da] bg-white px-3 text-sm outline-none transition focus:border-[#17352d]"
                  />
                </label>
              </div>

              <div className="mt-4">
                <span className="text-xs font-semibold text-[#557067]">
                  Course color
                </span>

                <div className="mt-2 flex flex-wrap gap-2">
                  {courseColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() =>
                        setCourseForm(
                          (current) => ({
                            ...current,
                            color,
                          })
                        )
                      }
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                        courseForm.color === color
                          ? "border-[#17352d]"
                          : "border-transparent"
                      }`}
                      aria-label={`Use ${color} color`}
                    >
                      <span
                        className={`h-5 w-5 rounded-full ${
                          colorClasses[color].dot
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {courseError && (
                <p
                  role="alert"
                  className="mt-4 text-xs text-red-700"
                >
                  {courseError}
                </p>
              )}

              <button
                type="submit"
                disabled={courseSaving}
                className="mt-5 min-h-11 rounded-full bg-[#17352d] px-6 text-sm font-semibold text-white transition hover:bg-[#285247] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {courseSaving
                  ? "Saving..."
                  : "Save course"}
              </button>
            </form>
          )}

          {/* Loading */}
          {loading ? (
            <div className="rounded-3xl border border-[#dfe6e1] bg-white p-10 text-center">
              <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-[#e8ede9]" />

              <p className="mt-4 text-sm text-[#718078]">
                Loading your study space...
              </p>
            </div>
          ) : courses.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#ccd7d0] bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#edf2ee] text-[#557067]">
                📚
              </div>

              <h3 className="mt-5 font-[var(--font-playfair)] text-2xl font-semibold">
                Add your first course.
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#718078]">
                Start by adding one of your current courses.
                You can then attach notes, readings, lectures,
                links, and assignments.
              </p>

              <button
                type="button"
                onClick={() => {
                  setCourseFormOpen(true);
                  setCourseError("");
                }}
                className="mt-6 min-h-11 rounded-full bg-[#17352d] px-6 text-sm font-semibold text-white"
              >
                Add course
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {courses.map((course) => {
                const courseResources =
                  getCourseResources(course.id);

                const colors =
                  colorClasses[
                    course.color
                  ] || colorClasses.green;

                return (
                  <article
                    key={course.id}
                    className={`overflow-hidden rounded-3xl border bg-white ${colors.border}`}
                  >
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 gap-3">
                          <span
                            className={`mt-1 h-3 w-3 shrink-0 rounded-full ${colors.dot}`}
                          />

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${colors.badge}`}
                              >
                                {course.course_code}
                              </span>

                              {course.semester && (
                                <span className="text-xs text-[#8a9891]">
                                  {course.semester}
                                </span>
                              )}
                            </div>

                            <h3 className="mt-2 font-[var(--font-playfair)] text-xl font-semibold">
                              {course.course_name}
                            </h3>

                            {course.instructor && (
                              <p className="mt-1 text-xs text-[#718078]">
                                {course.instructor}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openResourceModal(
                                course
                              )
                            }
                            className="min-h-10 rounded-full bg-[#17352d] px-4 text-xs font-semibold text-white transition hover:bg-[#285247]"
                          >
                            + Add resource
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteCourse(
                                course.id
                              )
                            }
                            disabled={
                              courseDeleting ===
                              course.id
                            }
                            className="min-h-10 rounded-full border border-[#e1d5d2] px-4 text-xs font-semibold text-[#9a5147] transition hover:bg-[#faf1ef] disabled:opacity-50"
                          >
                            {courseDeleting ===
                            course.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </div>

                      {/* Resources */}
                      <div className="mt-5 border-t border-[#edf0ed] pt-5">
                        {courseResources.length ===
                        0 ? (
                          <p className="rounded-2xl bg-[#f7f8f5] px-4 py-4 text-center text-xs text-[#8a9891]">
                            No resources yet. Add a
                            note, reading, lecture, link,
                            or assignment.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {courseResources.map(
                              (resource) => (
                                <div
                                  key={resource.id}
                                  className="rounded-2xl border border-[#e5eae6] bg-[#fafbf9] p-4"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-[#edf2ee] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#557067]">
                                          {getResourceTypeLabel(
                                            resource.resource_type
                                          )}
                                        </span>

                                        <span className="text-[10px] text-[#9aa59f]">
                                          {formatDate(
                                            resource.created_at
                                          )}
                                        </span>
                                      </div>

                                      {resource.resource_type ===
                                        "link" &&
                                      resource.resource_url ? (
                                        <a
                                          href={
                                            resource.resource_url
                                          }
                                          target="_blank"
                                          rel="noreferrer"
                                          className="mt-2 block truncate text-sm font-semibold text-[#17352d] underline-offset-4 hover:underline"
                                        >
                                          {
                                            resource.title
                                          }
                                        </a>
                                      ) : (
                                        <h4 className="mt-2 truncate text-sm font-semibold">
                                          {
                                            resource.title
                                          }
                                        </h4>
                                      )}

                                      {resource.description && (
                                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#718078]">
                                          {
                                            resource.description
                                          }
                                        </p>
                                      )}

                                      {resource.content && (
                                        <p className="mt-2 line-clamp-3 whitespace-pre-line text-xs leading-5 text-[#66766f]">
                                          {
                                            resource.content
                                          }
                                        </p>
                                      )}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        deleteResource(
                                          resource.id
                                        )
                                      }
                                      disabled={
                                        resourceDeleting ===
                                        resource.id
                                      }
                                      className="shrink-0 text-xs font-semibold text-[#9a5147] hover:underline disabled:opacity-50"
                                    >
                                      {resourceDeleting ===
                                      resource.id
                                        ? "..."
                                        : "Delete"}
                                    </button>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Resource modal */}
      {resourceCourse && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#17352d]/30 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="resource-modal-title"
        >
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a17a32]">
                  Add resource
                </p>

                <h2
                  id="resource-modal-title"
                  className="mt-1 font-[var(--font-playfair)] text-2xl font-semibold"
                >
                  {resourceCourse.course_code}
                </h2>

                <p className="mt-1 text-sm text-[#718078]">
                  {resourceCourse.course_name}
                </p>
              </div>

              <button
                type="button"
                onClick={closeResourceModal}
                disabled={resourceSaving}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#dce4de] text-[#718078] transition hover:border-[#17352d] hover:text-[#17352d] disabled:opacity-50"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleResourceSubmit}
              className="mt-6 space-y-5"
            >
              <label className="block">
                <span className="text-sm font-semibold">
                  Title
                </span>

                <input
                  type="text"
                  value={resourceForm.title}
                  onChange={(event) =>
                    setResourceForm(
                      (current) => ({
                        ...current,
                        title:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="e.g. Frost poem notes"
                  required
                  autoFocus
                  className="mt-2 min-h-11 w-full rounded-xl border border-[#d8e0da] px-3 text-sm outline-none transition focus:border-[#17352d]"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold">
                  Resource type
                </span>

                <select
                  value={
                    resourceForm.resource_type
                  }
                  onChange={(event) =>
                    setResourceForm(
                      (current) => ({
                        ...current,
                        resource_type:
                          event.target
                            .value as ResourceType,
                      })
                    )
                  }
                  className="mt-2 min-h-11 w-full rounded-xl border border-[#d8e0da] bg-white px-3 text-sm outline-none focus:border-[#17352d]"
                >
                  {resourceTypes.map(
                    (type) => (
                      <option
                        key={type.value}
                        value={type.value}
                      >
                        {type.label}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold">
                  Description
                </span>

                <input
                  type="text"
                  value={
                    resourceForm.description
                  }
                  onChange={(event) =>
                    setResourceForm(
                      (current) => ({
                        ...current,
                        description:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Short description"
                  className="mt-2 min-h-11 w-full rounded-xl border border-[#d8e0da] px-3 text-sm outline-none focus:border-[#17352d]"
                />
              </label>

              {resourceForm.resource_type ===
              "link" ? (
                <label className="block">
                  <span className="text-sm font-semibold">
                    URL
                  </span>

                  <input
                    type="url"
                    value={
                      resourceForm.resource_url
                    }
                    onChange={(event) =>
                      setResourceForm(
                        (current) => ({
                          ...current,
                          resource_url:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="https://example.com"
                    required
                    className="mt-2 min-h-11 w-full rounded-xl border border-[#d8e0da] px-3 text-sm outline-none focus:border-[#17352d]"
                  />
                </label>
              ) : (
                <label className="block">
                  <span className="text-sm font-semibold">
                    Content
                  </span>

                  <textarea
                    value={
                      resourceForm.content
                    }
                    onChange={(event) =>
                      setResourceForm(
                        (current) => ({
                          ...current,
                          content:
                            event.target.value,
                        })
                      )
                    }
                    rows={6}
                    placeholder="Write your notes or paste the resource content..."
                    className="mt-2 w-full resize-y rounded-xl border border-[#d8e0da] px-3 py-3 text-sm leading-6 outline-none focus:border-[#17352d]"
                  />
                </label>
              )}

              {resourceError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs leading-5 text-red-700"
                >
                  {resourceError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeResourceModal}
                  disabled={resourceSaving}
                  className="min-h-11 rounded-full border border-[#d8e0da] px-5 text-sm font-semibold text-[#557067] transition hover:border-[#17352d] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={resourceSaving}
                  className="min-h-11 rounded-full bg-[#17352d] px-6 text-sm font-semibold text-white transition hover:bg-[#285247] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resourceSaving
                    ? "Saving..."
                    : "Save resource"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
