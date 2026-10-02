"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CommunityMemberRoleControlProps = {
  communityId: string;
  userId: string;
  currentRole: "admin" | "moderator" | "member";
  memberName: string;
};

const roles = [
  {
    value: "admin",
    label: "Admin",
    description: "Can receive elevated community permissions.",
  },
  {
    value: "moderator",
    label: "Moderator",
    description: "Can help moderate community activity.",
  },
  {
    value: "member",
    label: "Member",
    description: "Standard community membership.",
  },
] as const;

export default function CommunityMemberRoleControl({
  communityId,
  userId,
  currentRole,
  memberName,
}: CommunityMemberRoleControlProps) {
  const router = useRouter();

  const [selectedRole, setSelectedRole] =
    useState(currentRole);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] =
    useState(false);

  const selectedRoleInfo = roles.find(
    (role) => role.value === selectedRole
  );

  function handleRoleChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const nextRole = event.target.value as
      | "admin"
      | "moderator"
      | "member";

    setError("");
    setSelectedRole(nextRole);

    if (nextRole === currentRole) {
      setShowConfirm(false);
      return;
    }

    setShowConfirm(true);
  }

  function cancelChange() {
    setSelectedRole(currentRole);
    setShowConfirm(false);
    setError("");
  }

  async function saveRole() {
    if (selectedRole === currentRole) {
      setShowConfirm(false);
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(
        "/api/communities/members/role",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            communityId,
            userId,
            role: selectedRole,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to update the member role."
        );
      }

      setShowConfirm(false);

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update the member role."
      );

      setSelectedRole(currentRole);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="w-full sm:w-auto">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label
          htmlFor={`role-${userId}`}
          className="sr-only"
        >
          Change role for {memberName}
        </label>

        <select
          id={`role-${userId}`}
          value={selectedRole}
          onChange={handleRoleChange}
          disabled={isSaving}
          className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 disabled:cursor-not-allowed disabled:opacity-60 sm:w-36"
        >
          {roles.map((role) => (
            <option
              key={role.value}
              value={role.value}
            >
              {role.label}
            </option>
          ))}
        </select>
      </div>

      {showConfirm && (
        <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 sm:w-80">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            Change {memberName}&apos;s role?
          </p>

          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            {selectedRoleInfo?.description}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveRole}
              disabled={isSaving}
              className="min-h-10 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? "Saving..."
                : `Make ${selectedRoleInfo?.label}`}
            </button>

            <button
              type="button"
              onClick={cancelChange}
              disabled={isSaving}
              className="min-h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>

          {error && (
            <p
              className="mt-3 text-xs font-medium text-red-600"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>
      )}

      {error && !showConfirm && (
        <p
          className="mt-2 text-xs font-medium text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
