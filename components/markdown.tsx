import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Packs, objections and resolutions. No raw HTML (CLAUDE.md rule 7); unsafe link schemes are dropped by default.
 * Links open in a new tab without a referrer, so a review link's token never leaks to the sites it points at.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: text }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {text}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
