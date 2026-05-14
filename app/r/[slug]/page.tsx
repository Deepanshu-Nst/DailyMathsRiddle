import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getRiddleBySlug } from '@/lib/riddles/queries';
import { getRiddleShareUrl, getBaseUrl } from '@/lib/share/getCanonicalUrl';
import RiddleSharePage from './RiddleSharePage';

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * generateMetadata — Server-side OG tag generation for /r/[slug].
 * Uses production domain from NEXT_PUBLIC_APP_URL.
 * Social preview cards will show the riddle question + difficulty.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const riddle = await getRiddleBySlug(slug);

  if (!riddle) {
    return {
      title: 'Riddle not found — AdvaitAI',
    };
  }

  const shortQuestion =
    riddle.question.length > 80
      ? riddle.question.slice(0, 77) + '...'
      : riddle.question;

  const canonicalUrl = getRiddleShareUrl(slug);
  const difficulty = riddle.difficulty.charAt(0).toUpperCase() + riddle.difficulty.slice(1);

  return {
    title: `${difficulty} Math Challenge | AdvaitAI`,
    description: shortQuestion,
    metadataBase: new URL(getBaseUrl()),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'website',
      url: canonicalUrl,
      title: `Can you solve this? — ${difficulty} Math Riddle`,
      description: shortQuestion,
      siteName: 'AdvaitAI Daily Math Challenge',
    },
    twitter: {
      card: 'summary',
      title: `Can you solve this? — ${difficulty} Math Riddle`,
      description: shortQuestion,
    },
  };
}

/**
 * /r/[slug] — Immutable riddle share page.
 *
 * This page always shows the EXACT riddle identified by the slug.
 * It will NEVER redirect to today's daily riddle.
 * Ideal for social sharing — the link is stable forever.
 */
export default async function SlugPage({ params }: Props) {
  const { slug } = await params;
  const riddle = await getRiddleBySlug(slug);

  if (!riddle) notFound();

  const shareUrl = getRiddleShareUrl(slug);

  return <RiddleSharePage riddle={riddle} shareUrl={shareUrl} />;
}
