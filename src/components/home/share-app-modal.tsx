'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildHomeShareUrl, MAX_SHARED_NAME_LENGTH } from '@/lib/home-share-link';

interface ShareAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareAppModal({ open, onOpenChange }: ShareAppModalProps) {
  const [friendName, setFriendName] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const trimmed = friendName.trim().slice(0, MAX_SHARED_NAME_LENGTH);
  const shareUrl = trimmed ? buildHomeShareUrl(trimmed) : '';

  useEffect(() => {
    if (!open) {
      setFriendName('');
      setCopied(false);
      setCopyError(false);
    }
  }, [open]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError(true);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="share-app-layer"
          className="fixed inset-0 z-[400] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close share dialog"
            className="absolute inset-0 bg-black/40"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-app-title"
            className="relative z-[1] w-[min(100%,22rem)] rounded-3xl bg-white p-6 shadow-2xl border-2 border-lime-200"
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          >
            <h2
              id="share-app-title"
              className="text-xl font-bold text-gray-800 mb-1 text-center"
            >
              Share with a friend
            </h2>
            <p className="text-sm text-gray-500 text-center mb-4">
              Their name will be filled in when they open the link.
            </p>
            <label htmlFor="share-friend-name" className="sr-only">
              Friend&apos;s name
            </label>
            <input
              id="share-friend-name"
              type="text"
              value={friendName}
              onChange={(e) =>
                setFriendName(e.target.value.slice(0, MAX_SHARED_NAME_LENGTH))
              }
              placeholder="Friend's name"
              className="w-full px-4 py-3 text-lg font-medium border-2 border-lime-300 rounded-2xl focus:border-lime-500 focus:outline-none focus:ring-4 focus:ring-lime-100 text-center mb-3 bg-white"
              autoFocus
            />
            {shareUrl && (
              <p className="text-xs text-gray-400 break-all mb-3 px-1">
                {shareUrl}
              </p>
            )}
            <div className="flex flex-col gap-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                disabled={!trimmed}
                onClick={handleCopy}
                className="w-full py-3 rounded-2xl font-bold text-white bg-lime-500 hover:bg-lime-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {copied ? 'Copied!' : 'Copy link'}
              </motion.button>
              {copyError && (
                <p className="text-sm text-coral-500 text-center">
                  Could not copy — select the link above and copy manually.
                </p>
              )}
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="w-full py-2 text-gray-500 font-medium hover:text-gray-700"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
