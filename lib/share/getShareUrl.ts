export function getLinkedInShareUrl(url: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}

export function getWhatsAppShareUrl(caption: string, shareUrl: string): string {
  return `https://wa.me/?text=${encodeURIComponent(caption + "\n\n" + shareUrl)}`;
}
