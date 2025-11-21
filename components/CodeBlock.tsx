import React from 'react';

interface CodeBlockProps {
  content: string;
  onRun?: (code: string, language: string) => void;
}

// A simple parser to identify markdown code blocks and render them distinctively
export const CodeBlock: React.FC<CodeBlockProps> = ({ content, onRun }) => {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-4 text-sm leading-relaxed">
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          // Extract language and code
          const match = part.match(/```(\w+)?\n([\s\S]*?)```/);
          const code = match ? match[2] : part.replace(/```/g, '');
          const lang = match ? match[1]?.toLowerCase() : '';

          return (
            <div key={index} className="rounded-lg overflow-hidden bg-slate-900 border border-slate-700 shadow-lg my-4">
              <div className="flex justify-between items-center px-4 py-2 bg-slate-800 border-b border-slate-700">
                <span className="text-xs font-mono text-slate-400 uppercase">{lang || 'CODE'}</span>
                <div className="flex items-center gap-3">
                  {onRun && (lang === 'javascript' || lang === 'js' || lang === 'python' || lang === 'py' || lang === 'html' || lang === 'css') && (
                    <button
                      onClick={() => onRun(code, lang)}
                      className="text-xs flex items-center gap-1 text-green-400 hover:text-green-300 font-medium transition-colors"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      Run
                    </button>
                  )}
                  <button
                    onClick={() => navigator.clipboard.writeText(code)}
                    className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <pre className="p-4 overflow-x-auto text-slate-100 font-mono">
                <code>{code}</code>
              </pre>
            </div>
          );
        } else {
          // Render regular text with line breaks
          return (
            <div key={index} className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">
              {part.trim() && <p>{part}</p>}
            </div>
          );
        }
      })}
    </div>
  );
};