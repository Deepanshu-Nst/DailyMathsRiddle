'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Riddle } from '@/types';
import ImagePreview from './ImagePreview';
import CaptionEditor from './CaptionEditor';
import {
  PLATFORM_LIMITS,
  generateLinkedInCaption,
  generateWhatsAppCaption
} from '@/lib/share/generateCaption';
import {
  getLinkedInShareUrl,
  getWhatsAppShareUrl
} from '@/lib/share/getShareUrl';
import { useChallengeSession } from '@/components/providers/ChallengeSessionProvider';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://daily-maths-riddle.vercel.app";

interface ShareModalProps {
  riddle: Partial<Riddle>;
  date: string;
  onClose: () => void;
}

type Platform = 'linkedin' | 'whatsapp' | 'instagram';

export default function ShareModal({ riddle, date, onClose }: ShareModalProps) {
  const { session } = useChallengeSession();
  const [platform, setPlatform] = useState<Platform>('linkedin');
  const [captions, setCaptions] = useState<Record<Platform, string>>({
    linkedin: '',
    whatsapp: '',
    instagram: '',
  });
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const shareUrl = `${BASE_URL}/riddle/${date}?difficulty=${riddle.difficulty ?? 'medium'}`;

  useEffect(() => {
    if (shareUrl) {
      const input = { riddle, date, url: shareUrl };
      const li = generateLinkedInCaption(input);
      setCaptions({ // eslint-disable-line react-hooks/set-state-in-effect
        linkedin: li,
        whatsapp: generateWhatsAppCaption(input),
        instagram: li,
      });
    }
  }, [riddle, date, shareUrl]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleShare = async (p: Platform) => {
    const text = captions[p];
    
    if (p === 'instagram') {
      if (imageDataUrl) {
        try {
          const a = document.createElement('a');
          a.href = imageDataUrl;
          a.download = `advaitai-riddle-${date}.svg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          await navigator.clipboard.writeText(text);
          handleToast('Image downloaded + caption copied. Post on Instagram.');
        } catch (e) {
          handleToast('Failed to download image or copy caption.');
        }
      } else {
        handleToast('Please wait for image to generate.');
      }
      return;
    }

    if (p === 'linkedin') {
      try {
        await navigator.clipboard.writeText(text);
        handleToast('Caption copied. Paste it on LinkedIn.');
      } catch (e) {
        handleToast('Failed to copy caption. Proceeding anyway.');
      }
      const url = getLinkedInShareUrl(shareUrl);
      setTimeout(() => {
        window.open(url, '_blank', 'noopener,noreferrer');
      }, 800);
      return;
    }

    if (p === 'whatsapp') {
      const url = getWhatsAppShareUrl(text, shareUrl);
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
  };

  const currentMaxChars = PLATFORM_LIMITS[platform === 'instagram' ? 'linkedin' : platform];

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 100 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 6 }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
        className="modal-card relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/[0.12] bg-gradient-to-br from-bg via-bg to-surface-soft flex flex-col md:flex-row"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 900, minHeight: 500 }}
      >
        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -20, x: '-50%' }}
              className="absolute top-4 left-1/2 bg-surface-2 text-text-1 px-5 py-2.5 rounded-full text-sm font-medium z-50 border border-border shadow-xl"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-10 text-text-4 hover:text-text-1 transition-colors bg-surface-soft/80 hover:bg-surface-2 rounded-full p-2 border border-border hover:border-border-dark"
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* LEFT: Riddle Context */}
        <div className="w-full md:w-[45%] p-8 md:p-10 border-b md:border-b-0 md:border-r border-border bg-bg-subtle/30 flex flex-col">
          <h2 className="mb-8 text-2xl font-semibold tracking-tight text-text-1 md:text-[1.75rem]">Share result</h2>
          
          <div className="flex-1 flex flex-col">
            <span className="label mb-3 block text-text-4">Challenge preview</span>
            <div className="card-inset p-6 flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info" size="sm" className="font-mono uppercase">
                  {riddle.category}
                </Badge>
                <Badge
                  variant={riddle.difficulty === 'hard' ? 'danger' : riddle.difficulty === 'easy' ? 'success' : 'warning'}
                  size="sm"
                  className="font-mono uppercase"
                >
                  {riddle.difficulty}
                </Badge>
              </div>
              <p className="text-text-1 text-[15px] leading-relaxed font-medium">
                {riddle.question}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: Platform Settings & Action */}
        <div className="flex-1 p-8 md:p-10 bg-bg flex flex-col relative">
          
          {/* Platform Tabs */}
          <div className="mb-8">
            <Tabs
              tabs={[
                { id: 'linkedin', label: 'LinkedIn' },
                { id: 'whatsapp', label: 'WhatsApp' },
                { id: 'instagram', label: 'Instagram' },
              ]}
              activeTab={platform}
              onChange={(id) => setPlatform(id as Platform)}
              variant="contained"
            />
          </div>

          {/* Content Layout */}
          <div className="flex flex-col sm:flex-row gap-6 mb-8 flex-1">
            {/* Asset Preview */}
            <div className="w-full sm:w-[140px] flex-shrink-0">
              <span className="label mb-3 block text-text-4">Image</span>
              <div className="rounded-xl overflow-hidden shadow-2xl border border-border bg-surface-soft aspect-square">
                <ImagePreview 
                  date={date} 
                  difficulty={riddle.difficulty ?? 'medium'} 
                  streak={session?.streak.currentStreak || 0}
                  isSolved={session?.solvedToday || false}
                  onLoaded={setImageDataUrl} 
                />
              </div>
            </div>

            {/* Caption Editor */}
            <div className="flex-1 flex flex-col">
              <CaptionEditor
                value={captions[platform]}
                onChange={(val) => setCaptions({ ...captions, [platform]: val })}
                platform={platform}
                maxChars={currentMaxChars}
              />
            </div>
          </div>

          {/* Action Button */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => handleShare(platform)}
            className="mt-auto"
          >
            {platform === 'instagram' ? 'Download Image & Copy Caption' : `Share to ${platform.charAt(0).toUpperCase() + platform.slice(1)}`}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
