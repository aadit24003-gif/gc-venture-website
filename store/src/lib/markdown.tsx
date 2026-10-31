/**
 * A small, safe Markdown renderer for CMS pages and blog posts. It builds React elements
 * (never raw HTML), so stored text cannot inject scripts.
 * Supports: ## / ### headings, paragraphs, - and 1. lists, > quotes, --- rules,
 * **bold**, *italic*, `code` and [links](/path or https://...).
 */
import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';

function safeHref(href: string): string | null {
  const h = href.trim();
  if (/^(https?:\/\/|mailto:|tel:)/i.test(h)) return h;
  if (h.startsWith('/') && !h.startsWith('//')) return h;
  if (h.startsWith('#')) return h;
  return null;
}

function inline(text: string, key = 'i'): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${n++}`;
    if (m[2]) out.push(<strong key={k}>{inline(m[2], k)}</strong>);
    else if (m[3]) out.push(<em key={k}>{inline(m[3], k)}</em>);
    else if (m[4]) out.push(<code key={k}>{m[4]}</code>);
    else if (m[5]) {
      const href = safeHref(m[6]);
      if (!href) out.push(m[5]);
      else if (href.startsWith('/')) out.push(<Link key={k} href={href}>{inline(m[5], k)}</Link>);
      else out.push(<a key={k} href={href} rel="noopener noreferrer" target={href.startsWith('http') ? '_blank' : undefined}>{inline(m[5], k)}</a>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function slugifyHeading(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Headings in the text, for a table of contents. */
export function headings(md: string): { id: string; text: string }[] {
  return md.split('\n').filter((l) => /^##\s/.test(l)).map((l) => {
    const text = l.replace(/^##\s+/, '').trim();
    return { id: slugifyHeading(text), text };
  });
}

export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const key = `b${k++}`;
    if (/^###\s/.test(line)) { blocks.push(<h3 key={key}>{inline(line.replace(/^###\s+/, ''), key)}</h3>); i++; continue; }
    if (/^##\s/.test(line)) {
      const t = line.replace(/^##\s+/, '');
      blocks.push(<h2 key={key} id={slugifyHeading(t)}>{inline(t, key)}</h2>); i++; continue;
    }
    if (/^---+\s*$/.test(line)) { blocks.push(<hr key={key} />); i++; continue; }
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push(<blockquote key={key}>{inline(buf.join(' '), key)}</blockquote>);
      continue;
    }
    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) items.push(lines[i++].replace(/^[-*]\s+/, ''));
      blocks.push(<ul key={key}>{items.map((t, j) => <li key={j}>{inline(t, `${key}-${j}`)}</li>)}</ul>);
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) items.push(lines[i++].replace(/^\d+\.\s+/, ''));
      blocks.push(<ol key={key}>{items.map((t, j) => <li key={j}>{inline(t, `${key}-${j}`)}</li>)}</ol>);
      continue;
    }
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,3}\s|[-*]\s|\d+\.\s|>|---)/.test(lines[i])) buf.push(lines[i++]);
    blocks.push(<p key={key}>{inline(buf.join(' '), key)}</p>);
  }
  return <Fragment>{blocks}</Fragment>;
}

/** Plain text (for meta descriptions and emails). */
export function stripMarkdown(md: string) {
  return md.replace(/^#+\s+/gm, '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/^[-*>]\s+/gm, '').replace(/\s+/g, ' ').trim();
}
