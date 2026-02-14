import ReactMarkdown from 'react-markdown';
import MermaidRenderer from './MermaidRenderer';
import type { Components } from 'react-markdown';

interface MarkdownWithMermaidProps {
  content: string;
}

export default function MarkdownWithMermaid({ content }: MarkdownWithMermaidProps) {
  const components: Components = {
    // Headings with proper spacing
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold text-white mt-6 mb-4 pb-2 border-b border-slate-700">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl font-bold text-white mt-6 mb-3">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg font-semibold text-white mt-5 mb-2">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-base font-semibold text-slate-200 mt-4 mb-2">
        {children}
      </h4>
    ),
    h5: ({ children }) => (
      <h5 className="text-sm font-semibold text-slate-300 mt-3 mb-2">
        {children}
      </h5>
    ),
    h6: ({ children }) => (
      <h6 className="text-sm font-medium text-slate-400 mt-3 mb-2">
        {children}
      </h6>
    ),

    // Paragraphs with spacing
    p: ({ children }) => (
      <p className="text-slate-300 leading-relaxed mb-4">
        {children}
      </p>
    ),

    // Lists with proper spacing
    ul: ({ children }) => (
      <ul className="list-disc list-outside ml-5 mb-4 space-y-2 text-slate-300">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-outside ml-5 mb-4 space-y-2 text-slate-300">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed">
        {children}
      </li>
    ),

    // Blockquotes
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-indigo-500 pl-4 py-2 my-4 bg-slate-800/30 text-slate-300 italic">
        {children}
      </blockquote>
    ),

    // Horizontal rule
    hr: () => (
      <hr className="border-slate-700 my-6" />
    ),

    // Links
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-400 hover:text-indigo-300 underline"
      >
        {children}
      </a>
    ),

    // Tables
    table: ({ children }) => (
      <div className="overflow-x-auto my-4 max-w-full">
        <table className="w-full border border-slate-700 rounded table-auto">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-slate-800">
        {children}
      </thead>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-slate-700">
        {children}
      </tbody>
    ),
    tr: ({ children }) => (
      <tr className="hover:bg-slate-800/30">
        {children}
      </tr>
    ),
    th: ({ children }) => (
      <th className="px-4 py-2 text-left text-sm font-semibold text-white border-b border-slate-700">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-2 text-sm text-slate-300">
        {children}
      </td>
    ),

    // Strong and emphasis
    strong: ({ children }) => (
      <strong className="font-bold text-white">
        {children}
      </strong>
    ),
    em: ({ children }) => (
      <em className="italic text-slate-200">
        {children}
      </em>
    ),

    // Code blocks and inline code
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
          <pre className="bg-slate-800 rounded p-4 overflow-x-auto my-4 border border-slate-700">
            <code className={`${className} text-sm text-slate-200`} {...props}>
              {children}
            </code>
          </pre>
        );
      }

      // Inline code
      return (
        <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-indigo-300 font-mono" {...props}>
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
