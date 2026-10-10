"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import Hero3D from "./hero-3d";
import ScrollReveal from "./scroll-reveal";

const steps = [
  {
    n: "01",
    title: "Find your subject",
    body: "Search by subject and price to find a tutor who fits what you're working on.",
  },
  {
    n: "02",
    title: "Pick a time",
    body: "Book a slot that works for you — no back-and-forth scheduling.",
  },
  {
    n: "03",
    title: "Join the session",
    body: "Meet your tutor right in the browser once your booking is confirmed.",
  },
];

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.15 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function Home() {
  return (
    <div>
      <div className="max-w-5xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-16 items-center">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.h1
            variants={item}
            className="font-display text-5xl font-semibold text-ink leading-tight"
          >
            Learn from tutors you trust.
          </motion.h1>
          <motion.p
            variants={item}
            className="mt-6 text-ink/70 max-w-md leading-relaxed"
          >
            Book 1-on-1 online tutoring sessions in any subject. Browse tutors,
            pick a time that works, and join the session right in your browser.
          </motion.p>
          <motion.div variants={item} className="mt-8 flex gap-4">
            <Link
              href="/tutors"
              className="bg-ink text-paper px-6 py-3 rounded-md transition-all duration-150 hover:bg-marigold hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              Find a tutor
            </Link>
            <Link
              href="/register"
              className="border border-ink px-6 py-3 rounded-md transition-all duration-150 hover:border-marigold hover:text-marigold hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              Become a tutor
            </Link>
          </motion.div>
        </motion.div>

        <Hero3D />
      </div>

      <div className="border-t border-mist">
        <div className="max-w-5xl mx-auto px-6 py-20 grid md:grid-cols-3 gap-10">
          {steps.map((step, i) => (
            <ScrollReveal key={step.n} delay={i * 0.12}>
              <p className="font-display text-3xl text-marigold">{step.n}</p>
              <h3 className="font-display text-xl font-semibold text-ink mt-2">
                {step.title}
              </h3>
              <p className="text-ink/70 mt-2 leading-relaxed">{step.body}</p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </div>
  );
}