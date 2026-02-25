"use client";

import { motion } from "framer-motion";

const stories = [
  {
    heading: "It works while you sleep.",
    body: "Regina went to bed. Her WOPR Bot found a gap in her university's AI law curriculum, drafted a new module, and had it in her inbox by 6am.",
  },
  {
    heading: "It doesn't quit when you do.",
    body: 'Alvin said "I\'ll finish the chapter tomorrow" for six years. His WOPR Bot finished it while he was at dinner.',
  },
  {
    heading: "It runs the whole thing.",
    body: "T hasn't hired anyone. His WOPR Bot runs engineering, ops, and customer support. The commit history is the proof.",
  },
];

export function StorySections() {
  return (
    <section className="mx-auto max-w-2xl space-y-24 px-4 py-24 md:py-32">
      {stories.map((story, i) => (
        <motion.div
          key={story.heading}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{
            duration: 0.4,
            delay: i * 0.05,
            ease: "easeOut",
          }}
        >
          <h2 className="font-mono text-lg font-bold text-terminal sm:text-xl">{story.heading}</h2>
          <p className="mt-4 font-mono text-sm leading-relaxed text-terminal/60 sm:text-base">
            {story.body}
          </p>
        </motion.div>
      ))}
    </section>
  );
}
