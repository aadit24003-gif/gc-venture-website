/** Questions and answers as native disclosure widgets, with FAQPage structured data. */
export default function Faq({ items, schema = true }: { items: [string, string][]; schema?: boolean }) {
  return (
    <div className="divide-y divide-line rounded-[20px] border border-line bg-white px-6">
      {items.map(([q, a]) => (
        <details key={q} className="group py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16.5px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
            {q}<span className="text-[24px] font-normal leading-none transition-transform duration-300 group-open:rotate-45" aria-hidden>+</span>
          </summary>
          <p className="mt-3 max-w-[65ch] text-[15.5px] leading-relaxed text-ink-2">{a}</p>
        </details>
      ))}
      {schema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org', '@type': 'FAQPage',
          mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
        }) }} />
      )}
    </div>
  );
}
