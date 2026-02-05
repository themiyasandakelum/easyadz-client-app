import Link from "next/link";

export default function SuspendedPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-50 to-white">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Account Suspended</h1>
        <p className="text-gray-600 mb-6">
          Your account has been suspended. If you believe this is an error, please contact support.
        </p>
        <Link
          href="/signin"
          className="inline-block rounded-lg border-2 border-gray-300 px-6 py-3 text-gray-700 font-medium hover:bg-gray-50 transition"
        >
          Back to Sign in
        </Link>
      </div>
    </main>
  );
}
