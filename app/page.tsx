import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center text-center px-6 py-24">
      <h1 className="text-4xl font-semibold mb-4">Learn from tutors you trust</h1>
      <p className="text-gray-600 max-w-xl mb-8">
        Book 1-on-1 online tutoring sessions in any subject. Browse tutors, pick a
        time that works, and join the session right in your browser.
      </p>
      <div className="flex gap-4">
        <Link href="/tutors" className="bg-black text-white px-5 py-3 rounded-md">
          Find a tutor
        </Link>
        <Link href="/register" className="border px-5 py-3 rounded-md">
          Become a tutor
        </Link>
      </div>
    </div>
  );
}