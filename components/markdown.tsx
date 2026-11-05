import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Packs, objections and resolutions. No raw HTML (CLAUDE.md rule 7); unsafe link schemes are dropped by default. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
