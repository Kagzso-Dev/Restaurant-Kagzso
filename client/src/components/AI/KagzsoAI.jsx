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

    // ── Permissions ──────────────────────────────────────────────────
    // Only show AI for Admin users while they are in the Admin section
    const isAdminPath = location.pathname.startsWith('/admin');
    const isVisible = context.role === 'admin' && isAdminPath;

    if (!isVisible || location.pathname === '/login') return null;

    return (
        <>
            {/* ── Floating AI Button ─────────────────────────────────────────── */}
            <div 
                className={`fixed pointer-events-auto transition-all z-[1005] ${isDragging ? 'duration-0 scale-105 cursor-grabbing' : 'duration-500 hover:scale-110 active:scale-95'}`}
                style={{ 
                    bottom: 'calc(1.5rem + env(safe-area-inset-bottom))', 
                    right: 'calc(1.5rem + env(safe-area-inset-right))',
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    touchAction: 'none'
                }}
            >
                <button
                    onMouseDown={handleDragStart}
                    onTouchStart={handleDragStart}
                    onClick={handleButtonClick}
                    className={`
                        w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center 
                        bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 text-white 
                        shadow-[0_10px_30px_-5px_rgba(234,88,12,0.5)] transition-all duration-300 relative overflow-hidden group
                        ${isOpen ? 'rotate-90 opacity-0 pointer-events-none' : 'hover:shadow-[0_15px_40px_-5px_rgba(234,88,12,0.6)]'}
                    `}
                >
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <MessageCircle size={30} className="relative z-10" />
                    {!messages.some(m => !m.read && m.sender === 'ai') && (
                        <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-white rounded-full animate-ping opacity-75" />
                    )}
                </button>
            </div>

            {/* ── Chat Panel ─────────────────────────────────────────── */}
            <div className={`
                fixed transition-all duration-700 ease-[cubic-bezier(0.23, 1, 0.32, 1)] z-[1006]
                ${isOpen 
                    ? 'opacity-100 translate-y-0 scale-100' 
                    : 'opacity-0 translate-y-12 scale-95 pointer-events-none'
                }
                
                /* Desktop Stylings */
                md:bottom-28 md:right-8 md:w-[420px] md:h-[650px] 
                md:rounded-[32px] md:border md:border-white/10
                md:shadow-[0_30px_100px_-20px_rgba(0,0,0,0.8)] md:overflow-hidden 
                md:bg-[var(--theme-bg-card)]/90 md:backdrop-blur-3xl
                
                /* Mobile Stylings */
                bottom-0 right-0 left-0 h-[88vh] rounded-t-[40px] border-t border-white/10
                bg-[var(--theme-bg-card)] shadow-[0_-20px_60px_rgba(0,0,0,0.6)]
                flex flex-col
            `}>
                
                {/* Premium Header */}
                <div className="px-6 py-6 border-b border-white/5 bg-gradient-to-br from-white/10 to-transparent flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-xl shadow-orange-600/20">
                                <Utensils size={28} className="text-white" />
                            </div>
                            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[var(--theme-bg-card)] shadow-lg" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-black text-[var(--theme-text-main)] uppercase tracking-tight">Kagzso AI</h3>
                                <div className="px-1.5 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20">
                                    <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">PRO</span>
                                </div>
                            </div>
                            <p className="text-[11px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest opacity-60">System Specialist Online</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={clearChat} 
                            className="p-3 text-[var(--theme-text-muted)] hover:text-orange-400 bg-white/5 hover:bg-white/10 rounded-2xl transition-all active:scale-95"
                            title="Reset Memory"
                        >
                            <RotateCcw size={18} />
                        </button>
                        <button 
                            onClick={() => setIsOpen(false)} 
                            className="p-3 text-[var(--theme-text-muted)] hover:text-white bg-white/5 hover:bg-white/10 rounded-2xl transition-all active:scale-95"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div 
                    className="flex-1 overflow-y-auto px-6 py-8 space-y-8 custom-scrollbar scroll-smooth" 
                    ref={scrollRef}
                >
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-30 py-20">
                            <div className="w-24 h-24 rounded-[32px] bg-white/5 flex items-center justify-center border border-white/10">
                                <Sparkles size={48} className="text-orange-500" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-lg font-black uppercase tracking-widest text-[var(--theme-text-main)]">Intelligent Core</p>
                                <p className="text-xs font-medium max-w-[240px] leading-relaxed">
                                    Ask me about {context.page} operations, revenue insights, or general management tips.
                                </p>
                            </div>
                        </div>
                    )}

                    {messages.map((m, idx) => (
                        <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                            <div className={`
                                max-w-[88%] px-5 py-4 rounded-[24px] text-[14px] font-medium leading-relaxed
                                shadow-2xl transition-all hover:scale-[1.01]
                                ${m.sender === 'user' 
                                    ? 'bg-gradient-to-br from-orange-600 to-orange-500 text-white rounded-tr-sm shadow-orange-600/20' 
                                    : m.isContextSwitch 
                                        ? 'bg-white/5 text-orange-400 border border-orange-500/20 rounded-tl-sm italic text-xs'
                                        : 'bg-white/5 backdrop-blur-md text-[var(--theme-text-main)] border border-white/10 rounded-tl-sm shadow-black/20'
                                }
                            `}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    
                    {isTyping && (
                        <div className="flex justify-start animate-fade-in">
                            <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-[24px] rounded-tl-sm flex gap-2 items-center">
                                <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Area */}
                <div className="p-6 bg-gradient-to-t from-black/20 to-transparent shrink-0">
                    
                    {/* Interactive Suggestions */}
                    {showSuggestions && !inputValue && messages.length < 5 && (
                        <div className="flex gap-3 overflow-x-auto pb-6 hide-scrollbar snap-x px-1">
                            {suggestions.map((s, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => sendMessage(s)}
                                    className="flex-shrink-0 snap-start flex items-center gap-3 px-5 py-3 bg-white/5 border border-white/10 text-[var(--theme-text-main)] hover:border-orange-500/50 hover:bg-orange-500/10 rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-lg whitespace-nowrap group"
                                >
                                    <Sparkles size={14} className="text-orange-500 group-hover:scale-125 transition-transform" />
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="relative flex items-center gap-4 bg-white/5 border border-white/10 rounded-[28px] p-2 pr-3 focus-within:border-orange-500/50 focus-within:ring-4 focus-within:ring-orange-500/10 transition-all shadow-2xl">
                        <textarea
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            rows="1"
                            className="flex-1 bg-transparent text-[var(--theme-text-main)] pl-4 py-3 text-sm resize-none outline-none hide-scrollbar placeholder:text-white/20 font-medium"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!inputValue.trim() || isTyping}
                            className={`
                                w-11 h-11 flex items-center justify-center rounded-2xl transition-all shadow-xl
                                ${!inputValue.trim() || isTyping 
                                    ? 'bg-white/5 text-white/10' 
                                    : 'bg-gradient-to-br from-orange-500 to-red-600 text-white hover:shadow-orange-600/30 active:scale-90 hover:scale-105'}
                            `}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Backdrop */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1005] transition-opacity duration-500 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
};

export default KagzsoAI;
