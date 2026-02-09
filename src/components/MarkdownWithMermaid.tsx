import ReactMarkdown from 'react-markdown';
import MermaidRenderer from './MermaidRenderer';
import type { Components } from 'react-markdown';

interface MarkdownWithMermaidProps {
  content: string;
}

export default function MarkdownWithMermaid({ content }: MarkdownWithMermaidProps) {
  const components: Components = {
    code: ({ node, inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const codeString = String(children).replace(/\n$/, '');

      // Render Mermaid diagrams
      if (!inline && language === 'mermaid') {
        return <MermaidRenderer chart={codeString} />;
      }

      // Regular code blocks
      if (!inline) {
        return (
          <pre className="bg-slate-800 rounded p-4 overflow-x-auto my-4">
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
        );
      }

      // Inline code
      return (
        <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm" {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}
