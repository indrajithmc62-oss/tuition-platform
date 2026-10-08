"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Nav() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  return (
    <nav className="border-b border-mist bg-paper">
      <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="font-display text-xl font-semibold text-ink">
          TuitionHub
        </Link>
        <div className="flex gap-6 items-center text-sm text-ink">
          {role !== "TUTOR" && role !== "ADMIN" && (
            <Link href="/tutors" className="hover:text-marigold transition-colors">
              Find a tutor
            </Link>
          )}
          {role === "ADMIN" && (
            <Link href="/admin" className="hover:text-marigold transition-colors">
              Admin
            </Link>
          )}
          {session?.user ? (
            <>
              {role !== "ADMIN" && (
                <Link href="/dashboard" className="hover:text-marigold transition-colors">
                  Dashboard
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="hover:text-coral transition-colors"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-marigold transition-colors">
                Log in
              </Link>
              <Link
                href="/register"
                className="bg-ink text-paper px-4 py-2 rounded-md hover:bg-marigold transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}