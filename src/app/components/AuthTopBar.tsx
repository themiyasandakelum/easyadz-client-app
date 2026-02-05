import Link from "next/link";

export function AuthTopBar() {
  return (
    <header className="flex items-center justify-between h-14 sm:h-16 px-2 bg-white border-b border-gray-200 shadow-sm">
      <Link href="/" className="flex items-center h-full shrink-0" aria-label="easyadz.lk">
        <img
          src="/easyadz-logo.png"
          alt="easyadz.lk"
          className="h-14 w-auto sm:h-16 object-contain"
        />
      </Link>
      <nav className="flex items-center gap-4 sm:gap-6">
        <Link
          href="/"
          className="text-sm font-medium text-gray-600 hover:text-primary-600 transition"
        >
          Home
        </Link>
        <Link
          href="/contact"
          className="text-sm font-medium text-gray-600 hover:text-primary-600 transition"
        >
          Contact us
        </Link>
        <Link
          href="/privacy"
          className="text-sm font-medium text-gray-600 hover:text-primary-600 transition"
        >
          Privacy policy
        </Link>
      </nav>
    </header>
  );
}
