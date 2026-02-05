import Link from "next/link";
import { AuthTopBar } from "../components/AuthTopBar";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <AuthTopBar />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-xl font-bold text-primary-800 mb-3">Privacy policy</h1>
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4 text-gray-600 text-sm">
          <p>
            EasyAdz respects your privacy. This policy describes how we collect, use, and protect your personal information.
          </p>
          <h2 className="font-semibold text-gray-800 mt-4">Information we collect</h2>
          <p>
            We collect information you provide when creating a profile, posting ads, or contacting us—including name, email, phone, and preferences.
          </p>
          <h2 className="font-semibold text-gray-800 mt-4">How we use it</h2>
          <p>
            We use your information to operate the platform, match profiles, display ads, and communicate with you.
          </p>
          <h2 className="font-semibold text-gray-800 mt-4">Data security</h2>
          <p>
            We implement appropriate measures to protect your data. Contact us for any privacy concerns.
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
