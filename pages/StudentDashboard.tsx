import React, { useState, useRef, useEffect } from 'react';
import { User, ProgrammingLanguage, ChatMessage } from '../types';
import { generateCodeSolution } from '../services/geminiService';
import { CodeBlock } from '../components/CodeBlock';
import { Button } from '../components/Button';

interface StudentDashboardProps {
  user: User;
}

interface ExecutionResult {
  type: 'console' | 'preview';
  content: string;
  error?: boolean;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user }) => {
  const [language, setLanguage] = useState<ProgrammingLanguage>(ProgrammingLanguage.JAVASCRIPT);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isOutputVisible, setIsOutputVisible] = useState(true); // Toggle for mobile mostly
  
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
      language
    };

    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setIsLoading(true);

    try {
      const responseText = await generateCodeSolution(language, userMessage.content);
      
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error: any) {
        const errorMessageText = error?.message || "Unknown error";
        console.error("Gemini/Chat Error:", errorMessageText);
        
        let friendlyError = "I encountered an error trying to solve that. Please try again.";
        
        // Provide more specific feedback for common deployment issues
        if (errorMessageText.includes("API Key") || errorMessageText.includes("API_KEY")) {
            friendlyError = "Configuration Error: API Key is missing. Please add 'API_KEY' to your Vercel Environment Variables.";
        } else if (errorMessageText.includes("fetch failed") || errorMessageText.includes("Network")) {
            friendlyError = "Network Error: Could not connect to the AI service. Please check your internet connection.";
        } else if (errorMessageText.includes("403") || errorMessageText.includes("permission")) {
            friendlyError = "Access Error: The AI service permission was denied (403). Check your API key quotas.";
        }

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: friendlyError,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunCode = async (code: string, lang: string) => {
    setIsOutputVisible(true);
    setExecutionResult({ type: 'console', content: 'Running...' });

    // Normalize language
    const l = lang.toLowerCase();

    if (l === 'html' || l === 'css' || l === 'html/css') {
      setExecutionResult({ type: 'preview', content: code });
    } else if (l === 'javascript' || l === 'js') {
      const logs: string[] = [];
      
      // Helper to safely stringify objects preventing circular references
      const safeStringify = (obj: any) => {
        if (obj === null) return 'null';
        if (obj === undefined) return 'undefined';
        
        // Handle globals to prevent massive dumps/freezing
        if (typeof window !== 'undefined' && obj === window) return '[window object]';
        if (typeof document !== 'undefined' && obj === document) return '[document object]';

        // Handle DOM elements specifically to avoid massive recursive structures
        // Check if Element is defined (browser env) before instanceof check
        if (typeof Element !== 'undefined' && obj instanceof Element) {
            return obj.outerHTML.split('>')[0] + '...>';
        }

        const cache = new Set();
        try {
            return JSON.stringify(obj, (key, value) => {
            if (typeof value === "object" && value !== null) {
                if (cache.has(value)) {
                    return "[Circular]";
                }
                cache.add(value);
            }
            return value;
            }, 2);
        } catch (e) {
            return String(obj);
        }
      };

      const mockConsole = {
        log: (...args: any[]) => {
          logs.push(args.map(a => 
             typeof a === 'object' ? safeStringify(a) : String(a)
          ).join(' '));
        },
        error: (...args: any[]) => {
          logs.push('Error: ' + args.map(a => String(a)).join(' '));
        },
        warn: (...args: any[]) => {
          logs.push('Warning: ' + args.map(a => String(a)).join(' '));
        },
        info: (...args: any[]) => {
           logs.push('Info: ' + args.map(a => String(a)).join(' '));
        }
      };

      try {
        // Wrap in a function to allow return statements and isolated scope
        // We include a try/catch inside the function to catch user code errors
        const safeFn = new Function('console', `
          try {
            ${code}
          } catch(e) {
            console.error(e.message);
          }
        `);
        safeFn(mockConsole);
      } catch (e: any) {
        // This catches syntax errors in the user's code that prevent function creation
        logs.push("Syntax Error: " + e.message);
      }

      if (logs.length === 0) logs.push("Code executed successfully (no output).");
      setExecutionResult({ type: 'console', content: logs.join('\n') });

    } else if (l === 'python' || l === 'py') {
       // Use Skulpt
       // Check if window is defined (browser env)
       if (typeof window === 'undefined' || !(window as any).Sk) {
           setExecutionResult({ type: 'console', content: 'Python execution environment (Skulpt) not loaded. Please refresh the page or check your internet connection.', error: true });
           return;
       }

       const outputBuffer: string[] = [];
       const Sk = (window as any).Sk;
       
       Sk.configure({
           output: (text: string) => outputBuffer.push(text),
           read: (x: string) => {
               if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
                   throw "File not found: '" + x + "'";
               return Sk.builtinFiles["files"][x];
           },
           __future__: Sk.python3
       });

       try {
           await Sk.misceval.asyncToPromise(() => 
               Sk.importMainWithBody("<stdin>", false, code, true)
           );
           if (outputBuffer.length === 0) outputBuffer.push("Code executed successfully.");
           setExecutionResult({ type: 'console', content: outputBuffer.join('') });
       } catch(e: any) {
           setExecutionResult({ type: 'console', content: e.toString(), error: true });
       }
    } else {
        setExecutionResult({ type: 'console', content: `Execution for ${lang} is not supported in this preview.` });
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50 overflow-hidden">
      
      {/* Left Panel: Chat & Input */}
      <div className={`flex-col flex-1 min-w-0 flex ${isOutputVisible ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm z-10 flex-shrink-0">
            <div>
            <h1 className="text-xl font-bold text-slate-900">Code Generator</h1>
            <p className="text-sm text-slate-500 hidden sm:block">Ask questions about logic, syntax, or full solutions.</p>
            </div>
            <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
            {Object.values(ProgrammingLanguage).map((lang) => (
                <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                    language === lang
                    ? 'bg-white text-brand-600 shadow-sm ring-1 ring-black/5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
                >
                {lang}
                </button>
            ))}
            </div>
            {/* Mobile Toggle for Output */}
            <button 
                onClick={() => setIsOutputVisible(true)}
                className="md:hidden text-sm text-brand-600 font-medium border border-brand-200 rounded px-3 py-1"
            >
                Show Output
            </button>
        </header>

        {/* Chat Area */}
        <div className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-6">
            {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                <svg className="w-24 h-24 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <p className="text-lg font-medium text-slate-600">Select a language and start coding!</p>
            </div>
            )}

            {messages.map((msg) => (
            <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
                <div
                className={`max-w-[95%] lg:max-w-[90%] rounded-2xl px-6 py-4 shadow-sm ${
                    msg.role === 'user'
                    ? 'bg-brand-600 text-white rounded-tr-none'
                    : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                }`}
                >
                    {msg.role === 'user' && msg.language && (
                        <div className="text-xs font-medium opacity-75 mb-1 uppercase tracking-wider">
                            {msg.language} Question
                        </div>
                    )}
                {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                    <CodeBlock content={msg.content} onRun={handleRunCode} />
                )}
                </div>
            </div>
            ))}
            {isLoading && (
            <div className="flex justify-start w-full">
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-6 py-4 shadow-sm flex items-center space-x-2">
                <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
            )}
            <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-slate-200 p-4 flex-shrink-0">
            <form onSubmit={handleSubmit} className="relative flex gap-2">
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={`Ask a question about ${language}...`}
                className="flex-grow resize-none rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-transparent py-3 px-4 text-slate-900 placeholder:text-slate-400 shadow-sm pr-12 min-h-[56px]"
                rows={1}
                onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                }
                }}
            />
            <Button 
                type="submit" 
                disabled={!prompt.trim() || isLoading}
                className="absolute right-2 bottom-2 !p-2 rounded-md"
            >
                <svg className="w-5 h-5 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
            </Button>
            </form>
            <div className="text-center mt-2 text-xs text-slate-400">
            Gemini AI can make mistakes. Review generated code.
            </div>
        </div>
      </div>

      {/* Right Panel: Output Window */}
      <div className={`w-full md:w-[400px] lg:w-[500px] bg-slate-900 flex-col border-l border-slate-800 transition-all duration-300 ${isOutputVisible ? 'flex' : 'hidden'}`}>
         <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex justify-between items-center flex-shrink-0 h-[68px]">
            <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                </svg>
                <span className="text-sm font-medium text-slate-300">Execution Output</span>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => setExecutionResult(null)}
                    className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700"
                >
                    Clear
                </button>
                <button 
                    onClick={() => setIsOutputVisible(false)}
                    className="md:hidden text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700"
                >
                    Close
                </button>
            </div>
         </div>

         <div className="flex-grow overflow-hidden relative bg-black">
            {!executionResult ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 p-8 text-center">
                    <svg className="w-12 h-12 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm">Click "Run" on any code block to see the output here.</p>
                    <p className="text-xs mt-2 opacity-75">Supports JS, Python (via Skulpt), and HTML/CSS.</p>
                </div>
            ) : (
                <>
                 {executionResult.type === 'preview' ? (
                     <iframe 
                        title="preview"
                        srcDoc={executionResult.content}
                        className="w-full h-full bg-white border-none"
                        sandbox="allow-scripts"
                     />
                 ) : (
                     <div className="w-full h-full overflow-auto p-4 font-mono text-sm">
                        <div className={`whitespace-pre-wrap ${executionResult.error ? 'text-red-400' : 'text-green-400'}`}>
                            <span className="text-slate-500 select-none">$ </span>
                            {executionResult.content}
                        </div>
                     </div>
                 )}
                </>
            )}
         </div>
      </div>

    </div>
  );
};