"use client";

import {
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "../../supabase/client";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

type Conversation = {
  id: string;
  is_group: boolean;
  created_at: string;
  updated_at: string;
  members: Profile[];
  latestMessage: Message | null;
  lastReadAt: string | null;
};

type FriendsResponse = {
  friends?: Profile[];
  error?: string;
};

function MessagesPageContent() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();

  const targetUserId = searchParams.get("user");

  const [currentUserId, setCurrentUserId] = useState("");

  const [conversations, setConversations] = useState<
    Conversation[]
  >([]);

  const [messages, setMessages] = useState<Message[]>([]);

  const [friends, setFriends] = useState<Profile[]>([]);

  const [selectedConversationId, setSelectedConversationId] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(false);

  const [openingTargetConversation, setOpeningTargetConversation] =
    useState(false);

  const [sending, setSending] = useState(false);

  const [messageText, setMessageText] = useState("");

  const [error, setError] = useState("");
  const [messageError, setMessageError] = useState("");

  const [showFriends, setShowFriends] = useState(false);

  const [handledTargetUserId, setHandledTargetUserId] =
    useState<string | null>(null);

  useEffect(() => {
    loadMessagesPage();
  }, []);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    loadConversationMessages(selectedConversationId);
  }, [selectedConversationId]);

  useEffect(() => {
    if (
      loading ||
      !currentUserId ||
      !targetUserId ||
      handledTargetUserId === targetUserId
    ) {
      return;
    }

    openTargetConversation(targetUserId);
  }, [
    loading,
    currentUserId,
    targetUserId,
    handledTargetUserId,
    conversations,
  ]);

  async function loadMessagesPage(
    selectConversationId?: string
  ) {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setCurrentUserId(user.id);

    const response = await fetch("/api/messages");

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Unable to load messages.");
      setLoading(false);
      return;
    }

    const loadedConversations =
      (data.conversations || []) as Conversation[];

    setConversations(loadedConversations);

    if (selectConversationId) {
      const conversationExists =
        loadedConversations.some(
          (conversation) =>
            conversation.id === selectConversationId
        );

      if (conversationExists) {
        setSelectedConversationId(selectConversationId);
      }
    } else if (!targetUserId && loadedConversations.length > 0) {
      setSelectedConversationId(
        loadedConversations[0].id
      );
    }

    setLoading(false);
  }

  async function loadConversationMessages(
    conversationId: string
  ) {
    setMessagesLoading(true);
    setMessageError("");

    const response = await fetch(
      `/api/messages?conversationId=${encodeURIComponent(
        conversationId
      )}`
    );

    const data = await response.json();

    if (!response.ok) {
      setMessageError(
        data.error || "Unable to load conversation."
      );
      setMessagesLoading(false);
      return;
    }

    setMessages((data.messages || []) as Message[]);
    setMessagesLoading(false);
  }

  async function loadFriends() {
    setFriendsLoading(true);
    setError("");

    const response = await fetch("/api/friendships");

    const data =
      (await response.json()) as FriendsResponse;

    if (!response.ok) {
      setError(
        data.error || "Unable to load your friends."
      );
      setFriendsLoading(false);
      return;
    }

    setFriends(data.friends || []);
    setFriendsLoading(false);
  }

  async function openTargetConversation(
    targetId: string
  ) {
    if (
      !targetId ||
      targetId === currentUserId ||
      openingTargetConversation
    ) {
      return;
    }

    setOpeningTargetConversation(true);
    setError("");

    try {
      /*
       * First check whether the conversation is already
       * present in the loaded conversation list.
       */
      const existingConversation =
        conversations.find(
          (conversation) =>
            !conversation.is_group &&
            conversation.members.some(
              (member) => member.id === targetId
            )
        );

      if (existingConversation) {
        setSelectedConversationId(
          existingConversation.id
        );
        setHandledTargetUserId(targetId);
        return;
      }

      /*
       * No existing conversation was found, so ask the
       * server to create one. The API already validates
       * that the target user is an accepted friend and
       * prevents duplicate direct conversations.
       */
      const response = await fetch(
        "/api/messages/conversations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            targetUserId: targetId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Unable to open this conversation."
        );
        setHandledTargetUserId(targetId);
        return;
      }

      const conversationId =
        data.conversationId as string;

      /*
       * Reload the conversation list so the newly created
       * conversation has its profile information available.
       */
      await loadMessagesPage(conversationId);

      setSelectedConversationId(conversationId);
      setHandledTargetUserId(targetId);
    } catch (requestError) {
      console.error(
        "Open target conversation error:",
        requestError
      );

      setError(
        "Unable to open this conversation. Please try again."
      );

      setHandledTargetUserId(targetId);
    } finally {
      setOpeningTargetConversation(false);
    }
  }

  async function openNewConversation(
    targetUserId: string
  ) {
    setError("");

    const response = await fetch(
      "/api/messages/conversations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUserId,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setError(
        data.error || "Unable to start conversation."
      );
      return;
    }

    setShowFriends(false);

    await loadMessagesPage(
      data.conversationId
    );

    setSelectedConversationId(
      data.conversationId
    );
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();

    const content = messageText.trim();

    if (!content || !selectedConversationId) {
      return;
    }

    setSending(true);
    setMessageError("");

    const response = await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversationId: selectedConversationId,
        content,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessageError(
        data.error || "Unable to send message."
      );
      setSending(false);
      return;
    }

    setMessages((current) => [
      ...current,
      data.message as Message,
    ]);

    setMessageText("");
    setSending(false);

    await loadMessagesPage(
      selectedConversationId
    );
  }

  function getConversationProfile(
    conversation: Conversation
  ) {
    return conversation.members[0] || null;
  }

  function getInitials(profile?: Profile | null) {
    if (!profile?.display_name) {
      return "K";
    }

    return (
      profile.display_name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((name) => name[0])
        .join("")
        .toUpperCase() || "K"
    );
  }

  function formatTime(timestamp: string) {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatConversationTime(timestamp: string) {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const now = new Date();

    const sameDay =
      date.toDateString() === now.toDateString();

    if (sameDay) {
      return formatTime(timestamp);
    }

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  }

  const selectedConversation = conversations.find(
    (conversation) =>
      conversation.id === selectedConversationId
  );

  const selectedProfile = selectedConversation
    ? getConversationProfile(selectedConversation)
    : null;

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#17352d]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#dfe6e1] bg-[#f7f8f5]/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            href="/home"
            className="text-xl font-bold tracking-[-0.04em] sm:text-2xl"
          >
            Knerdly
          </Link>

          <Link
            href="/home"
            className="rounded-full border border-[#d8e0da] bg-white px-4 py-2 text-xs font-semibold text-[#557067] transition hover:border-[#17352d] sm:text-sm"
          >
            Home
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        {/* Page heading */}
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a17a32]">
            Connections
          </p>

          <h1 className="mt-1 font-[var(--font-playfair)] text-3xl font-semibold tracking-tight">
            Messages
          </h1>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Messages workspace */}
        <section className="overflow-hidden rounded-3xl border border-[#dfe6e1] bg-white">
          {loading ? (
            <div className="flex min-h-[520px] items-center justify-center p-8">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-[#edf2ee]" />

                <p className="mt-4 text-sm text-[#718078]">
                  Loading messages...
                </p>
              </div>
            </div>
          ) : (
            <div className="grid min-h-[620px] lg:grid-cols-[320px_minmax(0,1fr)]">
              {/* Conversation sidebar */}
              <aside
                className={`border-b border-[#e3e8e4] lg:border-b-0 lg:border-r ${
                  selectedConversationId
                    ? "hidden lg:block"
                    : "block"
                }`}
              >
                <div className="border-b border-[#e3e8e4] p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">
                        Conversations
                      </h2>

                      <p className="mt-1 text-xs text-[#8a9891]">
                        {conversations.length}{" "}
                        {conversations.length === 1
                          ? "conversation"
                          : "conversations"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowFriends((current) => !current);

                        if (!showFriends) {
                          loadFriends();
                        }
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[#17352d] text-lg font-medium text-white transition hover:bg-[#285247]"
                      aria-label="Start new conversation"
                      title="New message"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Friend picker */}
                {showFriends && (
                  <div className="border-b border-[#e3e8e4] bg-[#f7f8f5] p-4">
                    <div className="mb-3">
                      <p className="text-sm font-semibold">
                        Start a conversation
                      </p>

                      <p className="mt-1 text-xs text-[#718078]">
                        Message one of your friends.
                      </p>
                    </div>

                    {friendsLoading ? (
                      <p className="py-3 text-xs text-[#718078]">
                        Loading friends...
                      </p>
                    ) : friends.length === 0 ? (
                      <p className="py-3 text-xs leading-5 text-[#718078]">
                        You do not have any accepted
                        friends yet.
                      </p>
                    ) : (
                      <div className="max-h-60 space-y-1 overflow-y-auto">
                        {friends.map((friend) => (
                          <button
                            key={friend.id}
                            type="button"
                            onClick={() =>
                              openNewConversation(
                                friend.id
                              )
                            }
                            className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-white"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17352d] text-xs font-semibold text-white">
                              {friend.avatar_url ? (
                                <img
                                  src={friend.avatar_url}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                getInitials(friend)
                              )}
                            </div>

                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#17352d]">
                              {friend.display_name ||
                                "Knerd"}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Conversations */}
                <div className="divide-y divide-[#eef1ee]">
                  {conversations.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#edf2ee] text-[#557067]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          className="h-6 w-6"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 11.5a8.38 8.38 0 0 1-9 8.3 8.5 8.5 0 0 1-3.9-.95L3 20l1.15-4.35A8.5 8.5 0 1 1 21 11.5Z"
                          />
                        </svg>
                      </div>

                      <h3 className="mt-4 font-[var(--font-playfair)] text-xl font-semibold">
                        No conversations yet.
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-[#718078]">
                        Start a conversation with a
                        friend.
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          setShowFriends(true);
                          loadFriends();
                        }}
                        className="mt-5 rounded-full bg-[#17352d] px-5 py-2.5 text-xs font-semibold text-white"
                      >
                        New message
                      </button>
                    </div>
                  ) : (
                    conversations.map(
                      (conversation) => {
                        const profile =
                          getConversationProfile(
                            conversation
                          );

                        const isSelected =
                          conversation.id ===
                          selectedConversationId;

                        return (
                          <button
                            key={conversation.id}
                            type="button"
                            onClick={() =>
                              setSelectedConversationId(
                                conversation.id
                              )
                            }
                            className={`flex w-full items-start gap-3 p-4 text-left transition ${
                              isSelected
                                ? "bg-[#f1f4f0]"
                                : "hover:bg-[#fafbf9]"
                            }`}
                          >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17352d] text-xs font-semibold text-white">
                              {profile?.avatar_url ? (
                                <img
                                  src={profile.avatar_url}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                getInitials(profile)
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-sm font-semibold text-[#17352d]">
                                  {profile?.display_name ||
                                    "Knerd"}
                                </p>

                                {conversation.latestMessage && (
                                  <span className="shrink-0 text-[10px] text-[#9aa69f]">
                                    {formatConversationTime(
                                      conversation
                                        .latestMessage
                                        .created_at
                                    )}
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 truncate text-xs text-[#7c8983]">
                                {conversation.latestMessage
                                  ? conversation
                                      .latestMessage
                                      .deleted_at
                                    ? "Message deleted"
                                    : conversation
                                        .latestMessage
                                        .content
                                  : "No messages yet"}
                              </p>
                            </div>
                          </button>
                        );
                      }
                    )
                  )}
                </div>
              </aside>

              {/* Chat pane */}
              <section
                className={`min-w-0 ${
                  selectedConversationId
                    ? "block"
                    : "hidden lg:flex"
                }`}
              >
                {!selectedConversationId ||
                !selectedProfile ? (
                  <div className="hidden min-h-[620px] flex-1 items-center justify-center p-8 lg:flex">
                    <div className="max-w-sm text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#edf2ee] text-[#557067]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          className="h-7 w-7"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 11.5a8.38 8.38 0 0 1-9 8.3 8.5 8.5 0 0 1-3.9-.95L3 20l1.15-4.35A8.5 8.5 0 1 1 21 11.5Z"
                          />
                        </svg>
                      </div>

                      <h2 className="mt-5 font-[var(--font-playfair)] text-2xl font-semibold">
                        Your messages
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-[#718078]">
                        Select a conversation to
                        start chatting.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[620px] flex-col">
                    {/* Chat header */}
                    <div className="flex items-center gap-3 border-b border-[#e3e8e4] px-4 py-4 sm:px-5">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedConversationId(
                            null
                          )
                        }
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#dfe6e1] text-[#557067] lg:hidden"
                        aria-label="Back to conversations"
                      >
                        ←
                      </button>

                      <Link
                        href={`/profile/${
                          selectedProfile.username ||
                          "new-member"
                        }`}
                        className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17352d] text-xs font-semibold text-white"
                      >
                        {selectedProfile.avatar_url ? (
                          <img
                            src={
                              selectedProfile.avatar_url
                            }
                            alt={
                              selectedProfile.display_name ||
                              "Knerd"
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getInitials(
                            selectedProfile
                          )
                        )}
                      </Link>

                      <div className="min-w-0">
                        <Link
                          href={`/profile/${
                            selectedProfile.username ||
                            "new-member"
                          }`}
                          className="block truncate text-sm font-semibold text-[#17352d] hover:text-[#557067]"
                        >
                          {selectedProfile.display_name ||
                            "Knerd"}
                        </Link>

                        {selectedProfile.username && (
                          <p className="truncate text-xs text-[#8a9891]">
                            @{selectedProfile.username}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto bg-[#fbfcfa] px-4 py-5 sm:px-6">
                      {messagesLoading ? (
                        <div className="flex h-full items-center justify-center">
                          <p className="text-sm text-[#718078]">
                            Loading conversation...
                          </p>
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex h-full items-center justify-center">
                          <div className="max-w-sm text-center">
                            <p className="font-[var(--font-playfair)] text-xl font-semibold">
                              Start the conversation.
                            </p>

                            <p className="mt-2 text-sm leading-6 text-[#718078]">
                              Send the first message to{" "}
                              {selectedProfile.display_name ||
                                "your friend"}.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {messages.map((message) => {
                            const isMine =
                              message.sender_id ===
                              currentUserId;

                            return (
                              <div
                                key={message.id}
                                className={`flex ${
                                  isMine
                                    ? "justify-end"
                                    : "justify-start"
                                }`}
                              >
                                <div
                                  className={`max-w-[82%] rounded-2xl px-4 py-3 sm:max-w-[70%] ${
                                    isMine
                                      ? "rounded-br-md bg-[#17352d] text-white"
                                      : "rounded-bl-md border border-[#dfe6e1] bg-white text-[#17352d]"
                                  }`}
                                >
                                  {message.deleted_at ? (
                                    <p
                                      className={`text-sm italic ${
                                        isMine
                                          ? "text-white/65"
                                          : "text-[#8a9891]"
                                      }`}
                                    >
                                      Message deleted
                                    </p>
                                  ) : (
                                    <p className="whitespace-pre-wrap break-words text-sm leading-6">
                                      {message.content}
                                    </p>
                                  )}

                                  <p
                                    className={`mt-1 text-[10px] ${
                                      isMine
                                        ? "text-white/60"
                                        : "text-[#9aa69f]"
                                    }`}
                                  >
                                    {formatTime(
                                      message.created_at
                                    )}

                                    {message.edited_at &&
                                      !message.deleted_at && (
                                        <span className="ml-1">
                                          · edited
                                        </span>
                                      )}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Composer */}
                    {messageError && (
                      <div
                        role="alert"
                        className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700"
                      >
                        {messageError}
                      </div>
                    )}

                    <form
                      onSubmit={sendMessage}
                      className="border-t border-[#e3e8e4] bg-white p-3 sm:p-4"
                    >
                      <div className="flex items-end gap-2">
                        <textarea
                          value={messageText}
                          onChange={(event) =>
                            setMessageText(
                              event.target.value
                            )
                          }
                          placeholder="Write a message..."
                          rows={1}
                          maxLength={5000}
                          className="min-h-11 max-h-32 min-w-0 flex-1 resize-none rounded-2xl border border-[#dfe6e1] bg-[#f7f8f5] px-4 py-3 text-sm text-[#17352d] outline-none transition placeholder:text-[#9aa69f] focus:border-[#aebdb4] focus:bg-white"
                          disabled={sending}
                        />

                        <button
                          type="submit"
                          disabled={
                            sending ||
                            !messageText.trim()
                          }
                          className="flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#17352d] px-5 text-xs font-semibold text-white transition hover:bg-[#285247] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {sending
                            ? "Sending..."
                            : "Send"}
                        </button>
                      </div>

                      <p className="mt-2 text-right text-[10px] text-[#9aa69f]">
                        {messageText.length}/5000
                      </p>
                    </form>
                  </div>
                )}
              </section>
            </div>
          )}
        </section>

        {openingTargetConversation && (
          <p className="mt-3 text-center text-xs text-[#8a9891]">
            Opening conversation...
          </p>
        )}
      </div>
    </main>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7f8f5] text-[#17352d]">
          <div className="flex min-h-screen items-center justify-center p-8">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-[#edf2ee]" />

              <p className="mt-4 text-sm text-[#718078]">
                Loading messages...
              </p>
            </div>
          </div>
        </main>
      }
    >
      <MessagesPageContent />
    </Suspense>
  );
}