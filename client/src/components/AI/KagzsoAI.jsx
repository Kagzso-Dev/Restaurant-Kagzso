import { useState, useEffect, useRef, useMemo } from 'react';
import {
    MessageCircle, X, Send, Sparkles, RotateCcw,
    Utensils, ShieldAlert, AlertTriangle, ChevronDown,
} from 'lucide-react';
import { useAI, ROLE_SUGGESTIONS } from '../../context/AIContext';

// ── Message Bubble ────────────────────────────────────────────────────────────
const MessageBubble = ({ m }) => {
    if (m.sender === 'user') {
        return (
            <div className="flex justify-end animate-slide-up">
                <div className="max-w-[82%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm font-medium leading-relaxed shadow-sm bg-orange-500 text-white">
                    {m.text}
                </div>
            </div>
        );
    }

    if (m.isSecurityAlert) {
        return (
            <div className="flex justify-start animate-slide-up">
                <div className="max-w-[90%] px-4 py-3 rounded-2xl rounded-tl-sm text-sm font-medium leading-relaxed
                    bg-red-500/10 text-red-400 border border-red-500/30 flex gap-2.5 items-start">
                    <ShieldAlert size={15} className="flex-shrink-0 mt-0.5 text-red-500" />
                    <span>{m.text}</span>
                </div>
            </div>
        );
    }

    if (m.isContextSwitch) {
        return (
            <div className="flex justify-center animate-fade-in py-1">
                <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full
                    bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    {m.text}
                </span>
            </div>
        );
    }

    // Regular AI message — support newlines
    return (
        <div className="flex justify-start gap-2.5 animate-slide-up">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex-shrink-0 flex items-center justify-center mt-0.5 shadow">
                <Utensils size={11} className="text-white" />
            </div>
            <div className="max-w-[82%] px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm font-medium leading-relaxed shadow-sm
                bg-[var(--theme-bg-muted)] text-[var(--theme-text-main)] border border-[var(--theme-border)]">
                {m.text.split('\n').map((line, i) => (
                    <span key={i}>{line}{i < m.text.split('\n').length - 1 && <br />}</span>
                ))}
            </div>
        </div>
    );
};

// ── Typing Indicator ──────────────────────────────────────────────────────────
const TypingIndicator = () => (
    <div className="flex justify-start gap-2.5 animate-fade-in">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex-shrink-0 flex items-center justify-center shadow">
            <Utensils size={11} className="text-white" />
        </div>
        <div className="bg-[var(--theme-bg-muted)] border border-[var(--theme-border)] px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1.5 items-center">
            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
    </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const KagzsoAI = () => {
    const {
        isOpen, setIsOpen,
        messages, sendMessage,
        isTyping, clearChat,
        context, securityAlerts, dismissSecurityAlert,
    } = useAI();

    const [inputValue, setInputValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [showSecurityBanner, setShowSecurityBanner] = useState(false);
    const scrollRef  = useRef(null);
    const inputRef   = useRef(null);

    // Show security banner when new alerts arrive
    useEffect(() => {
        if (securityAlerts.length > 0) setShowSecurityBanner(true);
    }, [securityAlerts.length]);

    // Auto-scroll on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, isTyping]);

    // Focus input on open (desktop only)
    useEffect(() => {
        if (isOpen && window.matchMedia('(min-width: 768px)').matches) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    const handleSend = () => {
        if (!inputValue.trim() || isTyping) return;
        sendMessage(inputValue);
        setInputValue('');
        setShowSuggestions(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSuggestion = (text) => {
        sendMessage(text);
        setShowSuggestions(false);
    };

    const suggestions = useMemo(() =>
        ROLE_SUGGESTIONS[context.role] || ROLE_SUGGESTIONS.guest,
    [context.role]);

    const hasSecurityAlerts = securityAlerts.length > 0;

    return (
        // Fixed overlay — pointer-events-none so it never blocks clicks on the page
        <div className="fixed inset-0 pointer-events-none z-[100]">

            {/* ── Floating AI Button ──────────────────────────────────────── */}
            <div className="absolute bottom-[4.5rem] lg:bottom-6 right-4 lg:right-6 pointer-events-auto">
                {/* Outer pulse ring */}
                {!isOpen && (
                    <span className="absolute inset-0 rounded-full animate-ping bg-orange-500 opacity-25 pointer-events-none" />
                )}

                <button
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label={isOpen ? 'Close Kagzso AI' : 'Open Kagzso AI'}
                    className={`
                        relative w-13 h-13 md:w-14 md:h-14 rounded-full flex items-center justify-center
                        bg-gradient-to-tr from-orange-600 via-orange-500 to-red-500 text-white
                        shadow-[0_8px_30px_rgba(234,88,12,0.5)] hover:shadow-[0_8px_40px_rgba(234,88,12,0.7)]
                        hover:scale-110 active:scale-90 transition-all duration-300
                        ${isOpen ? 'rotate-[360deg]' : ''}
                    `}
                    style={{ width: '3.25rem', height: '3.25rem' }}
                >
                    {isOpen
                        ? <X size={22} />
                        : <MessageCircle size={22} />
                    }

                    {/* Sparkle badge */}
                    {!isOpen && !hasSecurityAlerts && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <Sparkles size={9} className="text-orange-500" />
                        </span>
                    )}

                    {/* Security alert badge */}
                    {hasSecurityAlerts && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-md animate-pulse text-white text-[9px] font-black">
                            {securityAlerts.length > 9 ? '9+' : securityAlerts.length}
                        </span>
                    )}
                </button>
            </div>

            {/* ── Chat Panel ──────────────────────────────────────────────── */}
            <div
                className={`
                    absolute pointer-events-auto flex flex-col
                    transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
                    ${isOpen
                        ? 'opacity-100 translate-y-0 scale-100'
                        : 'opacity-0 translate-y-10 scale-95 pointer-events-none'
                    }
                    /* Mobile → bottom sheet */
                    bottom-0 left-0 right-0 h-[88vh] rounded-t-[32px]
                    border-t border-[var(--theme-border)]
                    bg-[var(--theme-bg-card)] shadow-[0_-20px_60px_rgba(0,0,0,0.35)]
                    z-[101]
                    /* Desktop → floating box */
                    md:bottom-[5.5rem] md:right-5 md:left-auto md:w-[370px] md:h-[560px]
                    md:rounded-3xl md:border md:shadow-2xl md:overflow-hidden
                `}
            >
                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="flex-shrink-0 px-5 py-4 border-b border-[var(--theme-border)] bg-gradient-to-r from-orange-600/10 via-transparent to-transparent">
                    {/* Drag handle — mobile only */}
                    <div className="md:hidden w-10 h-1 rounded-full bg-[var(--theme-border)] mx-auto mb-3" />

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg -rotate-3 flex-shrink-0">
                                <Utensils size={17} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-[var(--theme-text-main)] uppercase tracking-tight italic leading-none">
                                    Kagzso AI
                                </h3>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                                    <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest truncate">
                                        {context.page} mode
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            {hasSecurityAlerts && (
                                <button
                                    onClick={() => setShowSecurityBanner(v => !v)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-[10px] font-bold transition-colors"
                                    title="Security alerts"
                                >
                                    <AlertTriangle size={11} />
                                    {securityAlerts.length}
                                </button>
                            )}
                            <button
                                onClick={clearChat}
                                className="p-2 text-[var(--theme-text-muted)] hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                                title="Clear chat"
                            >
                                <RotateCcw size={14} />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="md:hidden p-2 text-[var(--theme-text-muted)] hover:text-white hover:bg-[var(--theme-bg-hover)] rounded-xl transition-colors"
                            >
                                <ChevronDown size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Security Banner ──────────────────────────────────────── */}
                {showSecurityBanner && hasSecurityAlerts && (
                    <div className="flex-shrink-0 mx-4 mt-3 p-3 bg-red-500/10 border border-red-500/25 rounded-2xl">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex gap-2 items-start">
                                <ShieldAlert size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[11px] font-black text-red-400 uppercase tracking-wider">
                                        Security Alert — Admin Action Required
                                    </p>
                                    <p className="text-[11px] text-red-400/80 mt-0.5 leading-relaxed">
                                        {securityAlerts.length} suspicious {securityAlerts.length === 1 ? 'query' : 'queries'} blocked.
                                        Review in Admin → Notifications.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    securityAlerts.forEach(a => dismissSecurityAlert(a.id));
                                    setShowSecurityBanner(false);
                                }}
                                className="p-1 text-red-400/60 hover:text-red-400 flex-shrink-0 transition-colors"
                            >
                                <X size={13} />
                            </button>
                        </div>
                        <div className="mt-2 space-y-1 max-h-20 overflow-y-auto">
                            {securityAlerts.map(a => (
                                <div key={a.id} className="text-[10px] text-red-400/60 flex items-center gap-1.5 truncate">
                                    <span className="w-1 h-1 rounded-full bg-red-400/60 flex-shrink-0" />
                                    <span className="font-bold capitalize">{a.type.replace('_', ' ')}</span>
                                    <span className="opacity-60">· {a.user} · {a.role}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Messages Area ─────────────────────────────────────────── */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto px-4 py-4 space-y-3 overscroll-contain"
                    style={{ scrollbarWidth: 'none' }}
                >
                    {messages.map(m => <MessageBubble key={m.id} m={m} />)}
                    {isTyping && <TypingIndicator />}
                </div>

                {/* ── Footer: Suggestions + Input ───────────────────────────── */}
                <div className="flex-shrink-0 p-4 border-t border-[var(--theme-border)] bg-[var(--theme-bg-card)]">

                    {/* Quick Suggestion Chips */}
                    {showSuggestions && !inputValue && messages.length <= 3 && (
                        <div className="flex gap-2 overflow-x-auto pb-3 mb-1" style={{ scrollbarWidth: 'none' }}>
                            {suggestions.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSuggestion(s)}
                                    className="flex-shrink-0 px-3 py-1.5 bg-[var(--theme-bg-dark)] border border-[var(--theme-border)]
                                        text-[var(--theme-text-muted)] hover:text-orange-400 hover:border-orange-500/40
                                        rounded-xl text-[11px] font-semibold transition-all active:scale-95 whitespace-nowrap"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Row */}
                    <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                            <textarea
                                ref={inputRef}
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask Kagzso anything..."
                                rows={1}
                                className="w-full bg-[var(--theme-bg-dark)] text-[var(--theme-text-main)]
                                    border border-[var(--theme-border)] focus:border-orange-500/50
                                    rounded-2xl pl-4 pr-12 py-3 text-sm resize-none
                                    focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                                style={{ scrollbarWidth: 'none' }}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!inputValue.trim() || isTyping}
                                className="absolute right-2 top-1/2 -translate-y-1/2
                                    w-8 h-8 flex items-center justify-center rounded-xl
                                    bg-orange-600 hover:bg-orange-500
                                    disabled:bg-[var(--theme-bg-hover)] disabled:text-[var(--theme-text-muted)]
                                    text-white shadow-md active:scale-90 transition-all"
                            >
                                <Send size={14} />
                            </button>
                        </div>
                    </div>

                    <p className="text-center text-[9px] text-[var(--theme-text-muted)] mt-2 font-medium">
                        Kagzso AI · POS Assistant · Do not share sensitive info
                    </p>
                </div>
            </div>

            {/* ── Mobile Backdrop ──────────────────────────────────────────── */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] md:hidden pointer-events-auto"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};

export default KagzsoAI;
