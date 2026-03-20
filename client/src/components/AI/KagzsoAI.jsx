import { useState, useEffect, useRef, useMemo } from 'react';
import { 
    MessageCircle, X, Send, Sparkles, Trash2, 
    ArrowRight, Utensils, CreditCard, LayoutGrid, RotateCcw
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAI } from '../../context/AIContext';

const KagzsoAI = () => {
    const { 
        isOpen, setIsOpen, messages, sendMessage, 
        isTyping, isModelLoading, clearChat, context 
    } = useAI();
    
    const location = useLocation();
    const [inputValue, setInputValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(true);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    // ── Draggable State ──────────────────────────────────────────────
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState(() => {
        const saved = localStorage.getItem('kagzso_ai_pos');
        return saved ? JSON.parse(saved) : { x: 0, y: 0 };
    });
    const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0, hasMoved: false });

    const handleDragStart = (e) => {
        const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
        
        dragRef.current = {
            startX: clientX,
            startY: clientY,
            initialX: position.x,
            initialY: position.y,
            hasMoved: false
        };
        setIsDragging(true);
    };

    useEffect(() => {
        const handleMove = (e) => {
            if (!isDragging) return;
            
            const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;

            const deltaX = clientX - dragRef.current.startX;
            const deltaY = clientY - dragRef.current.startY;

            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                dragRef.current.hasMoved = true;
            }

            // Boundary constraints (strictly clamped within viewport)
            const padding = 20; // safe distance from edges
            const btnSize = 64; // width/height of the button
            
            // Initial relative position from bottom-right (fixed bottom-5 right-5 is 20px from edge)
            const initialBottom = 20;
            const initialRight = 20;
            
            // Screen limits
            const maxX = initialRight - padding;
            const minX = -(window.innerWidth - btnSize - padding - initialRight);
            const maxY = initialBottom - padding;
            const minY = -(window.innerHeight - btnSize - padding - initialBottom);

            const newX = Math.min(maxX, Math.max(minX, dragRef.current.initialX + deltaX));
            const newY = Math.min(maxY, Math.max(minY, dragRef.current.initialY + deltaY));
            
            setPosition({ x: newX, y: newY });
        };

        const handleStop = () => {
            if (isDragging) {
                localStorage.setItem('kagzso_ai_pos', JSON.stringify(position));
                setIsDragging(false);
            }
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleStop);
            window.addEventListener('touchmove', handleMove);
            window.addEventListener('touchend', handleStop);
        }

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleStop);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleStop);
        };
    }, [isDragging, position]);

    const handleButtonClick = (e) => {
        if (dragRef.current.hasMoved) {
            e.preventDefault();
            return;
        }
        setIsOpen(!isOpen);
    };

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    // Focus input on open
    useEffect(() => {
        if (isOpen && !window.matchMedia('(max-width: 768px)').matches) {
            inputRef.current?.focus();
        }
    }, [isOpen]);

    const handleSend = () => {
        if (!inputValue.trim()) return;
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

    const suggestions = useMemo(() => {
        if (context.role === 'admin') return ["How to manage menu?", "View reports?", "Add category?"];
        if (context.role === 'waiter') return ["How to add items?", "Table status?", "Takeaway setup?"];
        if (context.role === 'cashier') return ["How to collect bill?", "QR payment help?", "Check active orders?"];
        if (context.role === 'kitchen') return ["Update order status?", "View queue?", "Kitchen summary?"];
        return ["How do I start?", "Features list?", "Technical help?"];
    }, [context.role]);

    // Don't show AI on login page (must be after all hooks)
    if (location.pathname === '/login') return null;

    return (
        <>
            {/* ── Floating AI Button ─────────────────────────────────────────── */}
            <div 
                className={`fixed pointer-events-auto transition-transform z-[1005] ${isDragging ? 'duration-0 scale-105 cursor-grabbing' : 'duration-300'}`}
                style={{ 
                    bottom: 'calc(1.25rem + env(safe-area-inset-bottom))', 
                    right: 'calc(1.25rem + env(safe-area-inset-right))',
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    touchAction: 'none'
                }}
            >
                <button
                    onMouseDown={handleDragStart}
                    onTouchStart={handleDragStart}
                    onClick={handleButtonClick}
                    className={`
                        w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center 
                        bg-gradient-to-tr from-orange-600 to-red-500 text-white 
                        shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 relative
                        ${isOpen ? 'rotate-90 opacity-0 pointer-events-none' : 'hover:shadow-glow-orange'}
                    `}
                >
                    <MessageCircle size={28} />
                    {!messages.some(m => !m.read && m.sender === 'ai') && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                            <Sparkles size={10} className="text-orange-500" />
                        </div>
                    )}
                </button>
            </div>

            {/* ── Chat Panel (Desktop Floating/Mobile Bottom Sheet) ─────────── */}
            <div className={`
                fixed transition-all duration-500 ease-[cubic-bezier(0.16, 1, 0.3, 1)] z-[1006]
                ${isOpen 
                    ? 'opacity-100 translate-y-0 scale-100' 
                    : 'opacity-0 translate-y-12 scale-90 pointer-events-none'
                }
                
                /* Desktop Stylings */
                md:bottom-24 md:right-6 md:w-[400px] md:h-[600px] 
                md:rounded-[28px] md:border md:border-white/10
                md:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] md:overflow-hidden 
                md:bg-[var(--theme-bg-card)]/80 md:backdrop-blur-3xl
                
                /* Mobile Stylings (Bottom Sheet) */
                bottom-0 right-0 left-0 h-[85vh] rounded-t-[40px] border-t border-white/10
                bg-[var(--theme-bg-card)] shadow-[0_-20px_50px_rgba(0,0,0,0.5)]
                pb-[env(safe-area-inset-bottom)] flex flex-col
            `}>
                
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-600/20 transform hover:rotate-3 transition-transform">
                            <Utensils size={24} className="text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-black text-[var(--theme-text-main)] italic uppercase tracking-tighter">Kagzso AI</h3>
                                <Sparkles size={14} className="text-orange-400 animate-pulse" />
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{context.page} Assistant</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={clearChat} 
                            title="Reset Chat"
                            className="p-2.5 text-[var(--theme-text-muted)] hover:text-orange-400 bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-90"
                        >
                            <RotateCcw size={18} />
                        </button>
                        <button 
                            onClick={() => setIsOpen(false)} 
                            className="p-2.5 text-[var(--theme-text-muted)] hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-90"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div 
                    className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar" 
                    ref={scrollRef}
                >
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40 py-10">
                            <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center">
                                <MessageCircle size={32} />
                            </div>
                            <p className="text-sm font-medium max-w-[200px]">
                                Ask me anything about {context.page} or the POS system!
                            </p>
                        </div>
                    )}

                    {messages.map((m, idx) => (
                        <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                            <div className={`
                                max-w-[85%] px-4 py-3.5 rounded-2xl text-[13.5px] font-medium leading-relaxed
                                shadow-lg
                                ${m.sender === 'user' 
                                    ? 'bg-gradient-to-tr from-orange-600 to-orange-500 text-white rounded-tr-none shadow-orange-600/10' 
                                    : m.isContextSwitch 
                                        ? 'bg-violet-600/5 text-violet-400 border border-violet-500/20 rounded-tl-none italic'
                                        : 'bg-[var(--theme-bg-muted)]/50 backdrop-blur-md text-[var(--theme-text-main)] border border-white/5 rounded-tl-none'
                                }
                            `}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    {isModelLoading && (
                        <div className="flex justify-center p-4 animate-fade-in">
                            <div className="bg-orange-500/10 border border-orange-500/20 px-4 py-2 rounded-xl flex items-center gap-3">
                                <RotateCcw size={14} className="text-orange-500 animate-spin" />
                                <span className="text-[11px] font-bold text-orange-500 uppercase tracking-wider">Initializing Local AI...</span>
                            </div>
                        </div>
                    )}
                    {isTyping && (
                        <div className="flex justify-start animate-fade-in">
                            <div className="bg-[var(--theme-bg-muted)]/50 border border-white/5 px-5 py-3.5 rounded-2xl rounded-tl-none flex gap-1.5 items-center">
                                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Input Area */}
                <div className="p-5 bg-gradient-to-t from-[var(--theme-bg-card)] to-transparent shrink-0">
                    
                    {/* Suggestions Area */}
                    {showSuggestions && !inputValue && messages.length < 5 && (
                        <div className="flex gap-2.5 overflow-x-auto pb-5 hide-scrollbar snap-x px-1">
                            {suggestions.map((s, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => sendMessage(s)}
                                    className="flex-shrink-0 snap-start flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-[var(--theme-text-main)] hover:border-orange-500/50 hover:bg-orange-500/10 rounded-full text-xs font-bold transition-all active:scale-95 shadow-sm whitespace-nowrap"
                                >
                                    <ArrowRight size={12} className="text-orange-500" />
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="relative flex items-center gap-3">
                        <div className="flex-1 relative group">
                            <textarea
                                ref={inputRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type your message..."
                                rows="1"
                                className={`
                                    w-full bg-black/40 text-[var(--theme-text-main)] border border-white/5 
                                    rounded-3xl pl-5 pr-14 py-4 text-sm resize-none 
                                    focus:ring-[6px] focus:ring-orange-500/10 focus:border-orange-500/60 
                                    transition-all outline-none hide-scrollbar placeholder:text-white/10
                                `}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!inputValue.trim() || isTyping}
                                className={`
                                    absolute right-2.5 top-1/2 -translate-y-1/2 w-10 h-10 
                                    flex items-center justify-center rounded-xl transition-all shadow-xl
                                    ${!inputValue.trim() || isTyping 
                                        ? 'bg-white/5 text-white/20 scale-90' 
                                        : 'bg-gradient-to-tr from-orange-600 to-orange-400 text-white hover:shadow-orange-600/20 active:scale-90 hover:scale-105'}
                                `}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Backdrop */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1005] transition-opacity duration-300 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
};

export default KagzsoAI;
