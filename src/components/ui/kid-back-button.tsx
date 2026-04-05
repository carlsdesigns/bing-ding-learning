'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

type KidBackButtonProps = {
  href?: string;
  label?: string;
};

export function KidBackButton({ href = '/', label = 'Home' }: KidBackButtonProps) {
  return (
    <Link href={href}>
      <motion.button
        type="button"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        className="flex items-center gap-2 px-5 py-3 min-h-[52px] min-w-[52px] rounded-2xl shadow-lg font-extrabold text-base md:text-lg
          bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600 text-white
          border-[3px] border-amber-200/90 ring-2 ring-orange-800/20
          hover:from-amber-300 hover:via-orange-400 hover:to-orange-500
          focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300"
        aria-label={`Go back to ${label}`}
      >
        <svg
          className="w-7 h-7 shrink-0 stroke-[3]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <span className="drop-shadow-sm">{label}</span>
      </motion.button>
    </Link>
  );
}
