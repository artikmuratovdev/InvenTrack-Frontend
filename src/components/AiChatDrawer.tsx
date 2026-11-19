import { Bot, Loader2, Send, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { api } from '../lib/api';
import type { AiChatMessage } from '../types/inventory';

const SUGGESTED_PROMPTS = [
  'Hozir nechta jihoz ta’mirda turibdi?',
  'Zaxiradagi bo‘sh jihozlar ro‘yxatini ko‘rsat',
  '304-xonadagi jihozlar holati qanday?',
];

export function AiChatDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const sendMessage = async (textToSend?: string) => {
    const prompt = (textToSend ?? input).trim();
    if (!prompt || loading) return;

    setError(null);
    const userMsg: AiChatMessage = {
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await api.post<{ reply: string }>('/api/ai/chat', {
        message: prompt,
        history: messages.map((m) => ({ role: m.role, content: m.content })),
      });
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.reply,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI bilan bog‘lanishda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end no-print">
      <div
        className="fixed inset-0 bg-slate-900/30 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="relative z-10 w-full max-w-md bg-white border-l border-slate-200 flex flex-col h-full shadow-lg"
        aria-label="AI Yordamchi"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">AI Yordamchi</h2>
              <p className="text-xs text-slate-500">Inventar ma’lumotlari bo‘yicha maslahat</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  setError(null);
                }}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                title="Suhbatni tozalash"
                aria-label="Suhbatni tozalash"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              aria-label="Yopish"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 ? (
            <div className="space-y-4 py-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Jihozlar holati, ta’mirlar, mas’ul shaxslar yoki xonalar kesimidagi ma’lumotlar bo‘yicha savol bering.
              </p>
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500">Tezkor savollar</p>
                {SUGGESTED_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void sendMessage(q)}
                    className="w-full text-left px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={`${msg.timestamp}-${idx}`}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-50 border border-slate-200 text-slate-800'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
              <span>Javob tayyorlanmoqda...</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage();
          }}
          className="p-4 border-t border-slate-200 bg-white"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Savolingizni yozing..."
              disabled={loading}
              className="flex-1 min-w-0 px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 bg-blue-700 text-white text-sm font-medium rounded-md hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>Yuborish</span>
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
