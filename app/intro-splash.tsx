"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Particle = { id: number; x: number; size: number; duration: number; delay: number };

export default function IntroSplash() {
  const [show, setShow] = useState(true);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Generate random particle positions only on the client, after mount,
    // so server-rendered HTML and the first client render match exactly.
    setParticles(
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        size: 4 + Math.random() * 8,
        duration: 3 + Math.random() * 3,
        delay: Math.random() * 1.5,
      }))
    );

    const timer = setTimeout(() => setShow(false), 2600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 bg-ink flex items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.08,
            filter: "blur(12px)",
            transition: { duration: 0.7, ease: "easeInOut" },
          }}
        >
          <motion.div
            className="absolute w-[32rem] h-[32rem] rounded-full bg-marigold/25 blur-3xl"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [0.6, 1.1, 1], opacity: 0.6 }}
            transition={{ duration: 2.2, ease: "easeOut" }}
          />

          {particles.map((p) => (
            <motion.span
              key={p.id}
              className="absolute bottom-0 rounded-full bg-marigold/40"
              style={{ left: `${p.x}%`, width: p.size, height: p.size }}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: -500, opacity: [0, 1, 0] }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: "easeOut",
                repeat: Infinity,
              }}
            />
          ))}

          <div className="relative text-center">
            <motion.h1
              className="font-display text-5xl font-semibold text-paper"
              initial={{ opacity: 0, y: 40, scale: 0.8, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              transition={{
                type: "spring",
                stiffness: 180,
                damping: 14,
                mass: 0.8,
                delay: 0.3,
              }}
            >
              TuitionHub
            </motion.h1>
            <motion.p
              className="text-paper/70 mt-3"
              initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                type: "spring",
                stiffness: 140,
                damping: 16,
                delay: 1.0,
              }}
            >
              Learning, one session at a time.
            </motion.p>

            <motion.div
              className="h-[2px] bg-marigold mt-6 mx-auto"
              initial={{ width: 0 }}
              animate={{ width: "6rem" }}
              transition={{ duration: 0.8, delay: 1.4, ease: "easeOut" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}