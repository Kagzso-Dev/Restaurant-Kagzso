import { useState, useEffect, useRef, useMemo } from 'react';
import { 
    MessageCircle, X, Send, Sparkles, RotateCcw, 
    Utensils, ChevronDown, ShieldAlert, AlertTriangle
} from 'lucide-react';
import { useAI, ROLE_SUGGESTIONS } from '../../context/AIContext';

// ── Message Bubble Component ────────────────────────────────────────────────
const MessageBubble = ({ m }) => {
    if (m.isSecurityAlert) return (
        <div className="flex justify-start animate-slide-up"><div className="max-w-[90%] px-4 py-3 rounded-2xl rounded-tl-sm text-xs bg-red-500/10 text-red-500 border border-red-500/20 flex gap-2 items-start"><ShieldAlert size={14} className="mt-0.5" /><span>{m.text}</span></div></div>
    );
    if (m.isContextSwitch) return (
        <div className="flex justify-center animate-fade-in py-1"><span className="px-3 py-1 text-[10px] bg-violet-500/10 text-violet-400 font-bold uppercase rounded-full border border-violet-500/20">{m.text}</span></div>
    );
    return (
        <div className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm font-medium ${m.sender === 'user' ? 'bg-orange-500 text-white rounded-tr-sm shadow-sm' : 'bg-[var(--theme-bg-muted)] text-[var(--theme-text-main)] border border-[var(--theme-border)] rounded-tl-sm shadow-sm'}`}>
                {m.text.split('\n').map((line, i) => (<span key={i}>{line}{i < m.text.split('\n').length - 1 && <br />}</span>))}
            </div>
        </div>
    );
};

// ── KagzsoAI Main Component ──────────────────────────────────────────────────
const KagzsoAI = () => {
    const { isOpen, setIsOpen, messages, sendMessage, isTyping, clearChat, context, securityAlerts, dismissSecurityAlert } = useAI();
    const [inputValue, setInputValue] = useState('');
    const [showSecurityBanner, setShowSecurityBanner] = useState(false);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => { if (securityAlerts.length > 0) setShowSecurityBanner(true); }, [securityAlerts.length]);
    useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, isTyping]);
    useEffect(() => { if (isOpen) { setTimeout(() => inputRef.current?.focus(), 350); } }, [isOpen]);

    const suggestions = useMemo(() => ROLE_SUGGESTIONS[context.role] || ROLE_SUGGESTIONS.guest, [context.role]);

    const handleSend = () => { if (!inputValue.trim() || isTyping) return; sendMessage(inputValue); setInputValue(''); };
    const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

    // Do not show on login page
    if (context.path === '/login') return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] pl-safe pr-safe">
            
            {/* ── Floating AI Button ─────────────────────────────────────────── */}
            <div className={`
              absolute pointer-events-auto transition-all duration-300
              /* Mobile/Tablet: Above Bottom Nav */
              bottom-24 lg:bottom-6 right-4 md:right-6
              /* Notch support handled by parent pl-safe/pr-safe */
            `}>
                {!isOpen && <span className="absolute inset-0 rounded-full animate-ping bg-orange-500 opacity-20 pointer-events-none" />}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center bg-gradient-to-tr from-orange-600 to-red-500 text-white shadow-2xl transition-all duration-300 hover:scale-110 active:scale-90 relative ${isOpen ? 'rotate-180' : ''}`}
                >
                    {isOpen ? <X size={24} /> : (
                        <>
                            <MessageCircle size={24} />
                            {securityAlerts.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-orange-600 animate-pulse">{securityAlerts.length}</span>}
                            {!securityAlerts.length && <span className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm"><Sparkles size={10} className="text-orange-500" /></span>}
                        </>
                    )}
                </button>
            </div>

            {/* ── Chat Panel ─────────────────────────────────────────────────── */}
            <div 
              className={`
                absolute pointer-events-auto flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16, 1, 0.3, 1)] overflow-hidden
                ${isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95 pointer-events-none'}
                
                /* Desktop Stylings (Floating Box) */
                md:bottom-24 md:right-6 md:w-[370px] md:h-[560px] md:rounded-3xl md:border md:border-[var(--theme-border)] md:shadow-2xl md:bg-[var(--theme-bg-card)] md:backdrop-blur-xl
                
                /* Mobile Stylings (Bottom Sheet) */
                bottom-0 left-0 right-0 h-[85dvh] rounded-t-[32px] border-t border-[var(--theme-border)] bg-[var(--theme-bg-card)] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-[101]
              `}
            >
                
                {/* Header (with mobile drag handle) */}
                <div className="px-5 py-4 border-b border-[var(--theme-border)] bg-gradient-to-r from-orange-600/10 to-transparent flex flex-col flex-shrink-0 pt-3 md:pt-4">
                    <div className="md:hidden w-12 h-1 bg-[var(--theme-border)] rounded-full mx-auto mb-3" />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center shadow-lg -rotate-3"><Utensils size={18} className="text-white" /></div>
                            <div>
                                <h3 className="text-sm font-black text-[var(--theme-text-main)] uppercase tracking-tight italic leading-tight">Kagzso AI</h3>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest truncate">{context.page} assistance</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button onClick={clearChat} title="Clear Chat" className="p-2 text-[var(--theme-text-muted)] hover:text-rose-400 rounded-lg transition-colors"><RotateCcw size={14} /></button>
                            <button onClick={() => setIsOpen(false)} title="Close" className="md:hidden p-2 text-[var(--theme-text-muted)] hover:text-white rounded-lg"><ChevronDown size={22} /></button>
                        </div>
                    </div>
                </div>

                {/* Security Banner Area */}
                {showSecurityBanner && securityAlerts.length > 0 && (
                    <div className="mx-4 mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3 animate-slide-up">
                        <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-[11px] font-black text-red-500 uppercase tracking-wide">Security Alert</p>
                            <p className="text-[10px] text-red-400 mt-0.5 leading-relaxed tracking-tight">Suspicious query blocked. Admin notified.</p>
                        </div>
                        <button onClick={() => setShowSecurityBanner(false)} className="p-1 text-red-400 hover:text-red-300"><X size={14} /></button>
                    </div>
                )}

                {/* Messages Area */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-5 custom-scrollbar h-full overscroll-contain">
                    {messages.map(m => <MessageBubble key={m.id} m={m} />)}
                    {isTyping && (
                        <div className="flex justify-start animate-fade-in"><div className="bg-[var(--theme-bg-muted)] border border-[var(--theme-border)] px-4 py-2.5 rounded-2xl rounded-tl-sm flex gap-1.5 items-center"><span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div></div>
                    )}
                </div>

                {/* Suggestions + Input */}
                <div className="p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] border-t border-[var(--theme-border)] bg-[var(--theme-bg-card)] flex-shrink-0 shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
                    {!inputValue && messages.length <= 4 && (
                        <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar snap-x">
                            {suggestions.map((s, idx) => (
                                <button key={idx} onClick={() => sendMessage(s)} className="flex-shrink-0 snap-start px-3.5 py-2 bg-[var(--theme-bg-dark)] border border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-orange-400 hover:border-orange-500/50 rounded-xl text-[11px] font-bold transition-all active:scale-95 whitespace-nowrap">{s}</button>
                            ))}
                        </div>
                    )}
                    <div className="relative">
                        <textarea
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="How can I help you fast?..."
                            rows="1"
                            className="w-full bg-[var(--theme-bg-dark)] text-[var(--theme-text-main)] border border-[var(--theme-border)] rounded-2xl pl-4 pr-12 py-3.5 text-sm resize-none focus:ring-2 focus:ring-orange-500/30 transition-all outline-none"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!inputValue.trim() || isTyping}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-orange-600 hover:bg-orange-500 disabled:bg-[var(--theme-bg-hover)] disabled:text-gray-600 text-white rounded-xl shadow-lg transition-all active:scale-90"
                        ><Send size={16} /></button>
                    </div>
                </div>
            </div>

            {/* Mobile Backdrop */}
            <div 
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 pointer-events-auto md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsOpen(false)}
            />
        </div>
    );
};

export default KagzsoAI;
