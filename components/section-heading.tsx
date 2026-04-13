type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="max-w-2xl space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--clay)]">{eyebrow}</p>
      <h2 className="text-3xl font-semibold tracking-tight text-[var(--forest)] sm:text-4xl">{title}</h2>
      <p className="text-base leading-7 text-[rgba(22,38,32,0.72)]">{description}</p>
    </div>
  );
}
