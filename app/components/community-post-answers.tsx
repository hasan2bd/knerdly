"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CommunityAnswerModerationButton from "./community-answer-moderation-button";
import CommunityReportButton from "./community-report-button";

type CommunityAnswer = {
  id: string;
  community_post_id: string;
  author_id: string;
  content: string;
  is_accepted: boolean;
  created_at: string;
  updated_at: string;
};

type CommunityAnswerAuthor = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type CommunityPostAnswersProps = {
  communityId: string;
  postId: string;
  answers: CommunityAnswer[];
  authors: CommunityAnswerAuthor[];
  isMember: boolean;
  currentUserId: string;
  questionAuthorId: string;
  isCommunityManager: boolean;
};

export default function CommunityPostAnswers({
  communityId,
  postId,
  answers,
  authors,
  isMember,
  currentUserId,
  questionAuthorId,
  isCommunityManager,
}: CommunityPostAnswersProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [deletingId, setDeletingId] =
    useState<string | null>(null);
  const [editingId, setEditingId] =
    useState<string | null>(null);
  const [editingContent, setEditingContent] =
    useState("");
  const [isUpdating, setIsUpdating] =
    useState(false);
  const [acceptingId, setAcceptingId] =
    useState<string | null>(null);
  const [error, setError] = useState("");

  const [now, setNow] = useState<number | null>(
    null
  );

  useEffect(() => {
    const updateNow = () => {
      setNow(Date.now());
    };

    updateNow();

    const interval = window.setInterval(
      updateNow,
      60_000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const authorMap = useMemo(
    () =>
      new Map(
        authors.map((author) => [
          author.id,
          author,
        ])
      ),
    [authors]
  );

  const isQuestionAuthor =
    currentUserId === questionAuthorId;

  function getAuthor(authorId: string) {
    return authorMap.get(authorId);
  }

  function getInitials(
    author?: CommunityAnswerAuthor
  ) {
    const name =
      author?.display_name ||
      author?.username ||
      "Student";

    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) =>
        part.charAt(0).toUpperCase()
      )
      .join("");
  }

  function formatTime(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    if (now === null) {
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    }

    const seconds = Math.max(
      0,
      Math.floor(
        (now - date.getTime()) / 1000
      )
    );

    if (seconds < 60) {
      return "Just now";
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
      return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
      return `${hours}h`;
    }

    const days = Math.floor(hours / 24);

    if (days < 7) {
      return `${days}d`;
    }

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }

  async function submitAnswer() {
    const trimmedContent = content.trim();

    if (!trimmedContent || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        "/api/communities/answers",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            communityPostId: postId,
            content: trimmedContent,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(
          result.message ||
            "Could not publish your answer."
        );
        setIsSubmitting(false);
        return;
      }

      setContent("");
      setIsSubmitting(false);

      router.refresh();
    } catch (error) {
      console.error(
        "Community answer error:",
        error
      );

      setError(
        "Something went wrong. Please try again."
      );

      setIsSubmitting(false);
    }
  }

  function startEditing(answer: CommunityAnswer) {
    setEditingId(answer.id);
    setEditingContent(answer.content);
    setError("");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingContent("");
    setError("");
  }

  async function updateAnswer() {
    const trimmedContent =
      editingContent.trim();

    if (
      !editingId ||
      !trimmedContent ||
      isUpdating
    ) {
      return;
    }

    setIsUpdating(true);
    setError("");

    try {
      const response = await fetch(
        "/api/communities/answers",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            answerId: editingId,
            content: trimmedContent,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(
          result.message ||
            "Could not update your answer."
        );
        setIsUpdating(false);
        return;
      }

      setEditingId(null);
      setEditingContent("");
      setIsUpdating(false);

      router.refresh();
    } catch (error) {
      console.error(
        "Community answer update error:",
        error
      );

      setError(
        "Something went wrong. Please try again."
      );

      setIsUpdating(false);
    }
  }

  async function deleteAnswer(
    answerId: string
  ) {
    if (deletingId) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this answer?"
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(answerId);
    setError("");

    try {
      const response = await fetch(
        "/api/communities/answers",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            answerId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(
          result.message ||
            "Could not delete your answer."
        );
        setDeletingId(null);
        return;
      }

      if (editingId === answerId) {
        cancelEditing();
      }

      setDeletingId(null);

      router.refresh();
    } catch (error) {
      console.error(
        "Community answer deletion error:",
        error
      );

      setError(
        "Something went wrong. Please try again."
      );

      setDeletingId(null);
    }
  }

  async function acceptAnswer(
    answerId: string
  ) {
    if (
      acceptingId ||
      !isQuestionAuthor
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Accept this answer? Any previously accepted answer will be replaced."
    );

    if (!confirmed) {
      return;
    }

    setAcceptingId(answerId);
    setError("");

    try {
      const response = await fetch(
        "/api/communities/answers/accept",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            answerId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(
          result.message ||
            "Could not accept this answer."
        );
        setAcceptingId(null);
        return;
      }

      setAcceptingId(null);

      router.refresh();
    } catch (error) {
      console.error(
        "Community answer acceptance error:",
        error
      );

      setError(
        "Something went wrong. Please try again."
      );

      setAcceptingId(null);
    }
  }

  function renderAvatar(
    author?: CommunityAnswerAuthor
  ) {
    if (author?.avatar_url) {
      return (
        <img
          src={author.avatar_url}
          alt=""
          className="h-10 w-10 shrink-0 rounded-full object-cover"
        />
      );
    }

    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8eee9] text-[10px] font-bold text-[#31564a]">
        {getInitials(author)}
      </div>
    );
  }

  return (
    <section className="mt-5 border-t border-[#e5ebe7] pt-4">
      <button
        type="button"
        onClick={() =>
          setIsOpen((value) => !value)
        }
        className="flex min-h-10 items-center gap-2 text-xs font-semibold text-[#557067] transition hover:text-[#17352d]"
      >
        <span
          className={`transition-transform ${
            isOpen ? "rotate-90" : ""
          }`}
          aria-hidden="true"
        >
          →
        </span>

        {isOpen
          ? "Hide answers"
          : answers.length === 0
            ? "Answer this question"
            : `${answers.length} ${
                answers.length === 1
                  ? "answer"
                  : "answers"
              }`}
      </button>

      {isOpen && (
        <>
          {answers.length > 0 ? (
            <div className="mt-2 space-y-4">
              {answers.map((answer) => {
                const author = getAuthor(
                  answer.author_id
                );

                const isOwn =
                  answer.author_id ===
                  currentUserId;

                const isEditing =
                  editingId === answer.id;

                const isAccepting =
                  acceptingId === answer.id;

                return (
                  <article
                    key={answer.id}
                    className={`rounded-2xl border p-4 ${
                      answer.is_accepted
                        ? "border-[#c9d9c9] bg-[#f4f8f4]"
                        : "border-[#e2e8e4] bg-[#fafbfa]"
                    }`}
                  >
                    {answer.is_accepted && (
                      <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#4d765f]">
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-[#dce9df]"
                          aria-hidden="true"
                        >
                          ✓
                        </span>

                        Accepted answer
                      </div>
                    )}

                    <div className="flex gap-3">
                      {renderAvatar(author)}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-xs font-semibold text-[#17352d]">
                            {author?.display_name ||
                              author?.username ||
                              "Student"}
                          </span>

                          <span className="text-[10px] text-[#9aa69f]">
                            {formatTime(
                              answer.created_at
                            )}
                          </span>
                        </div>

                        {isEditing ? (
                          <div className="mt-3">
                            <textarea
                              value={
                                editingContent
                              }
                              onChange={(event) =>
                                setEditingContent(
                                  event.target
                                    .value
                                )
                              }
                              maxLength={2000}
                              rows={4}
                              className="w-full resize-none rounded-xl border border-[#d6e0d9] bg-white px-3 py-2 text-sm leading-6 text-[#263a33] outline-none focus:border-[#9bb0a5] focus:ring-2 focus:ring-[#dce7e0]"
                            />

                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[10px] text-[#9aa69f]">
                                {
                                  editingContent.length
                                }
                                /2000
                              </span>

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={
                                    cancelEditing
                                  }
                                  className="min-h-9 rounded-full border border-[#dfe6e1] px-4 text-[11px] font-semibold text-[#557067] transition hover:border-[#b8c6bd] hover:text-[#17352d]"
                                >
                                  Cancel
                                </button>

                                <button
                                  type="button"
                                  onClick={
                                    updateAnswer
                                  }
                                  disabled={
                                    isUpdating ||
                                    !editingContent.trim()
                                  }
                                  className="min-h-9 rounded-full bg-[#17352d] px-4 text-[11px] font-semibold text-white transition hover:bg-[#285247] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isUpdating
                                    ? "Saving..."
                                    : "Save answer"}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#43544d]">
                            {answer.content}
                          </p>
                        )}

                        {!isEditing && (
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <CommunityReportButton
                              communityId={
                                communityId
                              }
                              answerId={answer.id}
                            />

                            {isQuestionAuthor &&
                              !answer.is_accepted && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    acceptAnswer(
                                      answer.id
                                    )
                                  }
                                  disabled={Boolean(
                                    acceptingId
                                  )}
                                  className="min-h-9 rounded-full border border-[#c9d9c9] bg-[#f4f8f4] px-4 text-[11px] font-semibold text-[#4d765f] transition hover:border-[#9fb6a7] hover:bg-[#eaf2eb] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isAccepting
                                    ? "Accepting..."
                                    : "Accept answer"}
                                </button>
                              )}

                            {isOwn && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    startEditing(
                                      answer
                                    )
                                  }
                                  className="text-[11px] font-semibold text-[#557067] transition hover:text-[#17352d]"
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteAnswer(
                                      answer.id
                                    )
                                  }
                                  disabled={
                                    deletingId ===
                                    answer.id
                                  }
                                  className="text-[11px] font-semibold text-[#9b5a51] transition hover:text-[#7e3e36] disabled:opacity-50"
                                >
                                  {deletingId ===
                                  answer.id
                                    ? "Deleting..."
                                    : "Delete"}
                                </button>
                              </>
                            )}

                            {isCommunityManager && (
                              <CommunityAnswerModerationButton
                                answerId={
                                  answer.id
                                }
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-[#f6f8f6] px-4 py-6 text-center">
              <p className="text-sm font-medium text-[#43544d]">
                No answers yet.
              </p>

              <p className="mt-1 text-xs leading-5 text-[#84928c]">
                Share what you know and help another
                student move forward.
              </p>
            </div>
          )}

          {isMember && (
            <div className="mt-5 rounded-2xl border border-[#dce4de] bg-white p-3">
              <textarea
                value={content}
                onChange={(event) =>
                  setContent(event.target.value)
                }
                maxLength={2000}
                rows={3}
                placeholder="Write a helpful answer..."
                className="w-full resize-none bg-transparent text-sm leading-6 text-[#263a33] outline-none placeholder:text-[#9aa69f]"
              />

              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-[10px] text-[#9aa69f]">
                  {content.length}/2000
                </span>

                <button
                  type="button"
                  onClick={submitAnswer}
                  disabled={
                    isSubmitting ||
                    !content.trim()
                  }
                  className="min-h-10 rounded-full bg-[#17352d] px-5 text-xs font-semibold text-white transition hover:bg-[#285247] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Posting..."
                    : "Post answer"}
                </button>
              </div>
            </div>
          )}

          {!isMember && (
            <p className="mt-5 rounded-2xl bg-[#f6f8f6] px-4 py-3 text-center text-xs leading-5 text-[#718078]">
              Join this community to answer this
              question.
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="mt-3 text-xs leading-5 text-[#a24d42]"
            >
              {error}
            </p>
          )}
        </>
      )}
    </section>
  );
}
