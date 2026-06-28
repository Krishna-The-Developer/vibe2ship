import React from 'react';
import Markdown from 'react-markdown';
import { User, Sparkles } from 'lucide-react';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export default function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div id={`msg-${isUser ? 'user' : 'ai'}`} className={`flex w-full items-start gap-3 my-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Icon */}
      <div id={`avatar-${isUser ? 'user' : 'ai'}`} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${isUser ? 'bg-amber-600/20 border-amber-500/50 text-amber-300' : 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'}`}>
        {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>

      {/* Message content box */}
      <div id={`bubble-box-${isUser ? 'user' : 'ai'}`} className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Name and time */}
        <div id={`metadata-${isUser ? 'user' : 'ai'}`} className="flex items-center gap-2 mb-1 px-1">
          <span className="text-xs font-medium text-slate-400">
            {isUser ? 'Emergency Manager' : 'DIEP-AI Command Assistant'}
          </span>
          {timestamp && (
            <span className="text-[10px] text-slate-500">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Bubble contents */}
        <div id={`bubble-text-${isUser ? 'user' : 'ai'}`} className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed border shadow-md ${isUser ? 'bg-slate-800 border-slate-700 text-slate-100 rounded-tr-none' : 'bg-slate-900 border-emerald-500/30 text-slate-200 rounded-tl-none'}`}>
          <div className="markdown-body prose prose-invert max-w-none prose-sm">
            <Markdown>{content}</Markdown>
          </div>
        </div>
      </div>
    </div>
  );
}
