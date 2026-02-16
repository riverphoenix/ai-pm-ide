import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      components={{
        code({ node, className, children, ...props }) {
          // For block code, use a styled pre/code block
          const isInline = node?.position?.start.line === node?.position?.end.line;
          return !isInline ? (
            <pre className="my-4 p-4 rounded-lg bg-codex-surface/80 border border-codex-border/50 overflow-x-auto">
              <code
                className={`${className} text-sm font-mono text-slate-200`}
                {...props}
              >
                {children}
              </code>
            </pre>
          ) : (
            <code
              className={`${className} px-1.5 py-0.5 rounded bg-codex-surface-hover text-indigo-300 text-sm font-mono border border-codex-border/50`}
              {...props}
            >
              {children}
            </code>
          );
        },
        p({ children }) {
          return <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>;
        },
        h1({ children }) {
          return <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0 text-codex-text-primary border-b border-codex-border pb-2">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0 text-codex-text-primary">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-lg font-semibold mb-2 mt-4 first:mt-0 text-codex-text-primary">{children}</h3>;
        },
        h4({ children }) {
          return <h4 className="text-base font-semibold mb-2 mt-3 first:mt-0 text-slate-200">{children}</h4>;
        },
        ul({ children }) {
          return <ul className="list-disc list-inside mb-4 space-y-1 pl-2">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal list-inside mb-4 space-y-1 pl-2">{children}</ol>;
        },
        li({ children }) {
          return <li className="leading-relaxed text-slate-200">{children}</li>;
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-indigo-500 pl-4 py-2 my-4 italic text-codex-text-secondary bg-codex-surface/50 rounded-r">
              {children}
            </blockquote>
          );
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-codex-border rounded-lg overflow-hidden">
                {children}
              </table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="bg-codex-surface">{children}</thead>;
        },
        tbody({ children }) {
          return <tbody className="divide-y divide-slate-700">{children}</tbody>;
        },
        tr({ children }) {
          return <tr className="hover:bg-codex-surface/50 transition-colors">{children}</tr>;
        },
        th({ children }) {
          return (
            <th className="px-4 py-2 text-left text-sm font-semibold text-codex-text-primary border-b border-codex-border">
              {children}
            </th>
          );
        },
        td({ children }) {
          return <td className="px-4 py-2 text-sm text-slate-200">{children}</td>;
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 underline decoration-indigo-400/30 hover:decoration-indigo-300 transition-colors"
            >
              {children}
            </a>
          );
        },
        strong({ children }) {
          return <strong className="font-semibold text-codex-text-primary">{children}</strong>;
        },
        em({ children }) {
          return <em className="italic text-codex-text-secondary">{children}</em>;
        },
        hr() {
          return <hr className="my-6 border-codex-border" />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
