import Link from "next/link";
import { AuthTopBar } from "../components/AuthTopBar";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <AuthTopBar />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-primary-800 mb-4">Contact us</h1>
        <p className="text-gray-600 mb-6">
          Have questions or feedback? We&apos;d love to hear from you.
        </p>
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <p className="text-gray-600">
            Email:{" "}
            <a
              href="mailto:support@easyadz.lk"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              support@easyadz.lk
            </a>
          </p>
          <p className="text-gray-600">
            We typically respond within 24–48 hours.
          </p>
        </div>
        <Link
          href="/"
          className="inline-block mt-6 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}
