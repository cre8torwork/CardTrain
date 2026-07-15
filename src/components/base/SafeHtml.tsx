import { createElement, Fragment } from 'react';

const ALLOWED_TAGS_PATTERN = /<\/?(?!\/?(strong|em|br)(\s[^>]*)?\/?>)[^>]*>/gi;

/**
 * Strips all HTML tags except <strong>, <em>, <br>.
 * This prevents XSS while allowing basic formatting in translations.
 */
export function sanitizeHtml(html: string): string {
  return html.replace(ALLOWED_TAGS_PATTERN, '');
}

/**
 * Wrapper that uses dangerouslySetInnerHTML with sanitized content.
 * Only <strong>, <em>, and <br/> tags are preserved.
 */
export function SafeHtml({ html, className }: { html: string; className?: string }) {
  const clean = sanitizeHtml(html);
  return <span className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}