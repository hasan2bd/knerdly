"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "../../supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/home";
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
                Welcome back
              </p>

              <h1 className="max-w-lg text-4xl font-semibold leading-tight">
                Continue building your learning journey.
              </h1>

              <p className="mt-6 max-w-lg text-base leading-7 text-[#d5ddd8]">
                Return to your discussions, communities, study
                progress, and academic connections.
              </p>
            </div>
          </section>

          {/* Login form */}
          <section className="p-8 sm:p-12">
            <div className="mx-auto max-w-md">
              <div className="mb-10">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#b08f4c]">
                  Knerdly account
                </p>

                <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                  Welcome back
                </h2>

                <p className="mt-3 text-sm leading-6 text-[#68766f]">
                  Log in to continue to your Knerdly account.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
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
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium"
                    >
                      Password
                    </label>

                    <Link
                      href="/forgot-password"
                      className="text-xs font-semibold text-[#17352d] hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Your password"
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
                  {loading ? "Logging in..." : "Log in"}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-[#68766f]">
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-[#17352d] hover:underline"
                >
                  Create one
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
