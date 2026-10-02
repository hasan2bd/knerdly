"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../supabase/client";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName.trim(),
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    /*
     * Supabase may automatically create a session
     * after signup when email confirmation is disabled.
     *
     * We explicitly sign out so the user must log in
     * through the login page after creating the account.
     */
    await supabase.auth.signOut();

    router.push("/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-6 py-12 text-[#17352d]">
      <div className="mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-[#dfe4dc] bg-white shadow-sm lg:grid-cols-2">
          {/* Brand panel */}
          <section className="hidden bg-[#17352d] p-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <Link
                href="/"
                className="text-3xl font-bold tracking-tight"
              >
                Knerdly
              </Link>

              <p className="mt-2 text-sm text-[#d5ddd8]">
                Learn together. Grow together.
              </p>
            </div>

            <div>
              <p className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-[#c8ad73]">
                Your learning network
              </p>

              <h1 className="max-w-lg text-4xl font-semibold leading-tight">
                Build connections around what you are learning.
              </h1>

              <p className="mt-6 max-w-lg text-base leading-7 text-[#d5ddd8]">
                Share ideas, track your progress, ask questions,
                discover communities, and connect with other students.
              </p>
            </div>
          </section>

          {/* Signup form */}
          <section className="p-8 sm:p-12">
            <div className="mx-auto max-w-md">
              <div className="mb-10">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#b08f4c]">
                  Join Knerdly
                </p>

                <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                  Create your account
                </h2>

                <p className="mt-3 text-sm leading-6 text-[#68766f]">
                  Start building your academic and learning network.
                </p>
              </div>

              <form
                onSubmit={handleSignup}
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="displayName"
                    className="mb-2 block text-sm font-medium"
                  >
                    Name
                  </label>

                  <input
                    id="displayName"
                    type="text"
                    required
                    value={displayName}
                    onChange={(event) =>
                      setDisplayName(event.target.value)
                    }
                    placeholder="Your name"
                    className="w-full rounded-xl border border-[#d7ded9] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#17352d] focus:ring-2 focus:ring-[#17352d]/10"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium"
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-[#d7ded9] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#17352d] focus:ring-2 focus:ring-[#17352d]/10"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium"
                  >
                    Password
                  </label>

                  <input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-[#d7ded9] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#17352d] focus:ring-2 focus:ring-[#17352d]/10"
                  />
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[#17352d] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#102a23] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Creating account..."
                    : "Create account"}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-[#68766f]">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-[#17352d] hover:underline"
                >
                  Log in
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
