import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero section with background image */}
      <section className="relative flex-1 min-h-screen flex flex-col items-center justify-start px-6 pt-20 sm:pt-24">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/hero-bg.png)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50" />
        {/* Sign in / Create profile - top right */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-3">
          <Link
            href="/signin"
            className="rounded-lg border-2 border-white bg-white/10 backdrop-blur-sm px-4 py-2 text-white text-sm font-medium hover:bg-white/20 transition"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-primary-600 px-4 py-2 text-white text-sm font-medium hover:bg-primary-700 transition"
          >
            Create profile
          </Link>
        </div>
        <div className="relative z-10 flex flex-col items-center text-center w-full">
          <h1 className="text-4xl sm:text-5xl font-bold text-white drop-shadow-lg mb-3">
            EasyAdz
          </h1>
          <p className="text-white/95 text-base sm:text-lg max-w-md drop-shadow-md">
            Find your perfect match. Join thousands in Sri Lanka.
          </p>
        </div>
      </section>
    </main>
  );
}
