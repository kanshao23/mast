export function BriefPanel({ markdown }: { markdown: string }) {
  return (
    <article className="prose prose-sm max-w-none whitespace-pre-wrap">{markdown}</article>
  );
}
