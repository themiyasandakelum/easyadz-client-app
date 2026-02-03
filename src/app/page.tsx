import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-primary-50 to-white">
      <h1 className="text-3xl font-bold text-primary-700 mb-2">
        EasyAdz
      </h1>
      <p className="text-gray-600 mb-8 text-center max-w-sm">
        Find your perfect match. Join thousands in Sri Lanka.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/signin"
          className="rounded-lg border-2 border-primary-600 bg-white px-6 py-3 text-primary-600 font-medium hover:bg-primary-50 transition text-center"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="rounded-lg bg-primary-600 px-6 py-3 text-white font-medium hover:bg-primary-700 transition text-center"
        >
          Create profile
        </Link>
      </div>
    </main>
  );
}
