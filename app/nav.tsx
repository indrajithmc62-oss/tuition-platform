"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Nav() {
  const { data: session } = useSession();

  return (
    <nav className="border-b p-4 flex justify-between items-center max-w-5xl mx-auto w-full">
      <Link href="/" className="font-semibold">
        TuitionHub
      </Link>
      <div className="flex gap-4 items-center text-sm">
        <Link href="/tutors">Find a tutor</Link>
        {session?.user ? (
          <>
            <Link href="/dashboard">Dashboard</Link>
            <button onClick={() => signOut({ callbackUrl: "/" })}>Log out</button>
          </>
        ) : (
          <>
            <Link href="/login">Log in</Link>
            <Link href="/register">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}