
import Link from "next/link";

const features = [
  {
    number: "01",
    title: "Connect",
    description:
      "Build meaningful academic connections with students who share your interests, institution, and goals.",
  },
  {
    number: "02",
    title: "Discuss",
    description:
      "Share ideas, ask questions, exchange perspectives, and take part in thoughtful academic conversations.",
  },
  {
    number: "03",
    title: "Learn",
    description:
      "Track what you are learning, set study goals, record progress, and turn learning into a visible journey.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f7f2] text-[#17352d]">
      {/* Navigation */}
      <header className="border-b border-[#dfe5df] bg-[#f7f7f2]/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link
            href="/"
            className="text-2xl font-bold tracking-[-0.04em] text-[#17352d]"
          >
            Knerdly
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#about"
              className="text-sm font-medium text-[#64756f] transition hover:text-[#17352d]"
            >
              About
            </a>

            <a
              href="#features"
              className="text-sm font-medium text-[#64756f] transition hover:text-[#17352d]"
            >
              Features
            </a>

            <a
              href="#vision"
              className="text-sm font-medium text-[#64756f] transition hover:text-[#17352d]"
            >
              Vision
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-full px-5 py-2.5 text-sm font-semibold text-[#17352d] transition hover:bg-[#e9eee9] sm:block"
            >
              Log in
            </Link>

            <Link
              href="/signup"
              className="rounded-full bg-[#17352d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#285247]"
            >
              Join Knerdly
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-16 px-6 pb-24 pt-24 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pb-32 lg:pt-32">
          <div className="flex flex-col justify-center">
            <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-[#d7e0d9] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#557067]">
              <span className="h-2 w-2 rounded-full bg-[#b69a5b]" />
              Built for students
            </div>

            <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-[#17352d] sm:text-6xl lg:text-7xl">
              Learn together.
              <br />
              <span className="text-[#557067]">Grow together.</span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#64756f] sm:text-xl">
              Knerdly is a student-focused social platform where you can
              connect with other students, share ideas, discuss what matters,
              and keep track of what you are learning.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="rounded-full bg-[#17352d] px-7 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-[#285247]"
              >
                Create your account
              </Link>

              <a
                href="#features"
                className="rounded-full border border-[#cfd9d2] bg-white px-7 py-3.5 text-center text-sm font-semibold text-[#17352d] transition hover:border-[#17352d]"
              >
                Explore the idea
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-[#73837d]">
              <span>Real identity or pseudonym</span>
              <span>•</span>
              <span>Academic communities</span>
              <span>•</span>
              <span>Learning progress</span>
            </div>
          </div>

          {/* Conceptual platform preview */}
          <div className="relative flex items-center justify-center">
            <div className="absolute h-72 w-72 rounded-full bg-[#dfe9df] blur-3xl" />

            <div className="relative w-full max-w-md rounded-[2rem] border border-[#d8e0da] bg-white p-4 shadow-[0_30px_80px_rgba(23,53,45,0.12)]">
              <div className="rounded-[1.5rem] bg-[#f7f7f2] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a9892]">
                      Your learning space
                    </div>

                    <div className="mt-1 text-xl font-semibold tracking-tight text-[#17352d]">
                      Good evening, Knerd.
                    </div>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#17352d] text-sm font-semibold text-white">
                    K
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-[#dce4de] bg-white p-5">
                  <div className="text-sm font-semibold text-[#17352d]">
                    What are you learning today?
                  </div>

                  <div className="mt-4 rounded-xl bg-[#f2f5f1] px-4 py-3 text-sm text-[#8a9892]">
                    Share an idea, question, or study update...
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="rounded-full bg-[#edf2eb] px-3 py-1 text-xs font-semibold text-[#557067]">
                      Study
                    </span>

                    <span className="text-xs font-medium text-[#8a9892]">
                      Share
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-[#dce4de] bg-white p-4">
                    <div className="text-xs text-[#8a9892]">
                      This week
                    </div>

                    <div className="mt-2 text-2xl font-semibold text-[#17352d]">
                      8.5h
                    </div>

                    <div className="mt-1 text-xs text-[#557067]">
                      Study time
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#dce4de] bg-white p-4">
                    <div className="text-xs text-[#8a9892]">
                      Current goal
                    </div>

                    <div className="mt-2 text-2xl font-semibold text-[#17352d]">
                      72%
                    </div>

                    <div className="mt-1 text-xs text-[#557067]">
                      Literature
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section
        id="about"
        className="border-y border-[#dfe5df] bg-white"
      >
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b08f4c]">
              The idea
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-[#17352d] sm:text-4xl">
              A social network where learning is part of the social experience.
            </h2>

            <p className="mt-5 text-base leading-8 text-[#64756f]">
              Students should not have to separate their social life from
              their learning life. Knerdly brings conversations, academic
              communities, friendships, questions, and study progress into one
              focused environment.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28"
      >
        <div className="mb-12 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b08f4c]">
            Core experience
          </p>

          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-[#17352d] sm:text-4xl">
            Built around how students actually learn.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.number}
              className="rounded-3xl border border-[#dce4de] bg-white p-7 transition hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(23,53,45,0.08)]"
            >
              <span className="text-xs font-semibold tracking-[0.16em] text-[#b08f4c]">
                {feature.number}
              </span>

              <h3 className="mt-8 text-2xl font-semibold tracking-[-0.03em] text-[#17352d]">
                {feature.title}
              </h3>

              <p className="mt-4 leading-7 text-[#64756f]">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Vision */}
      <section
        id="vision"
        className="bg-[#17352d] text-white"
      >
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d1bb82]">
              Knerdly
            </p>

            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Connect. Share. Discuss. Learn.
            </h2>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#c6d2cc]">
              A platform designed to make student connection and learning feel
              like parts of the same journey.
            </p>

            <Link
              href="/signup"
              className="mt-9 inline-flex rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#17352d] transition hover:bg-[#edf1ec]"
            >
              Join Knerdly
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#dfe5df] bg-[#f7f7f2]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-[#73837d] sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span>© {new Date().getFullYear()} Knerdly</span>

          <span>Built for students, by students.</span>
        </div>
      </footer>
    </main>
  );
}
