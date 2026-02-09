import { useEffect, useRef } from 'react';

interface MermaidRendererProps {
  chart: string;
}

export default function MermaidRenderer({ chart }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Dynamically import mermaid
    import('mermaid').then((mermaid) => {
      mermaid.default.initialize({
        startOnLoad: true,
        theme: 'dark',
        themeVariables: {
          darkMode: true,
          background: '#1e293b',
          primaryColor: '#6366f1',
          primaryTextColor: '#fff',
          primaryBorderColor: '#4f46e5',
          lineColor: '#94a3b8',
          secondaryColor: '#334155',
          tertiaryColor: '#0f172a',
        }
      });

      // Render the chart
      const renderId = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      mermaid.default.render(renderId, chart).then((result) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = result.svg;
        }
      }).catch((error) => {
        console.error('Mermaid rendering error:', error);
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div class="text-red-400 text-sm p-4 bg-red-500/10 border border-red-500/30 rounded">
              Failed to render diagram: ${error.message}
            </div>
          `;
        }
      });
    });
  }, [chart]);

  return (
    <div
      ref={containerRef}
      className="mermaid-container my-6 p-4 bg-slate-800/40 rounded-lg border border-slate-700 overflow-x-auto"
    />
  );
}
