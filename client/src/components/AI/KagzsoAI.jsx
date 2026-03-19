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
        isTyping, clearChat, context 
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
                md:bottom-24 md:right-6 md:w-[380px] md:h-[550px] 
                md:rounded-3xl md:border md:border-[var(--theme-border)] 
                md:shadow-2xl md:overflow-hidden md:bg-[var(--theme-bg-card)] md:backdrop-blur-xl
                
                /* Mobile Stylings (Bottom Sheet) */
                bottom-0 right-0 left-0 h-[85vh] rounded-t-[40px] border-t border-[var(--theme-border)] 
                bg-[var(--theme-bg-card)] shadow-[0_-20px_50px_rgba(0,0,0,0.5)]
                pb-[env(safe-area-inset-bottom)]
            `}>
                
                {/* Header */}
                <div className="px-6 py-5 border-b border-[var(--theme-border)] bg-gradient-to-r from-orange-600/10 to-transparent flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg transform -rotate-3">
                            <Utensils size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-[var(--theme-text-main)] leading-none italic uppercase tracking-tighter">Kagzso AI</h3>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{context.page} mode</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={clearChat} className="p-2.5 text-[var(--theme-text-muted)] hover:text-rose-400 bg-[var(--theme-bg-hover)] rounded-xl transition-colors">
                            <RotateCcw size={16} />
                        </button>
                        <button onClick={() => setIsOpen(false)} className="md:hidden p-2.5 text-[var(--theme-text-muted)] hover:text-white bg-[var(--theme-bg-hover)] rounded-xl transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5 custom-scrollbar h-[calc(100%-160px)] md:h-[calc(100%-145px)]" ref={scrollRef}>
                    {messages.map((m, idx) => (
                        <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                            <div className={`
                                max-w-[85%] px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed shadow-sm
                                ${m.sender === 'user' 
                                    ? 'bg-orange-600 text-white rounded-tr-none' 
                                    : m.isContextSwitch 
                                        ? 'bg-violet-600/10 text-violet-400 border border-violet-500/20 rounded-tl-none italic'
                                        : 'bg-[var(--theme-bg-muted)] text-[var(--theme-text-main)] border border-[var(--theme-border)] rounded-tl-none'
                                }
                            `}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start animate-fade-in">
                            <div className="bg-[var(--theme-bg-muted)] border border-[var(--theme-border)] px-4 py-3 rounded-2xl rounded-tl-none flex gap-1 items-center">
                                <span className="w-1 h-1 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1 h-1 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                                <span className="w-1 h-1 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Input Area */}
                <div className="absolute bottom-0 left-0 right-0 p-5 bg-[var(--theme-bg-card)] border-t border-[var(--theme-border)] shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
                    
                    {/* Suggestions Area */}
                    {showSuggestions && !inputValue && messages.length < 5 && (
                        <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar snap-x">
                            {suggestions.map((s, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => sendMessage(s)}
                                    className="flex-shrink-0 snap-start px-3.5 py-2 bg-[var(--theme-bg-dark)] border border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-white hover:border-orange-500/50 rounded-xl text-[11px] font-bold transition-all active:scale-95"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <div className="flex-1 relative">
                            <textarea
                                ref={inputRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type your message..."
                                rows="1"
                                className="w-full bg-[var(--theme-bg-dark)] text-[var(--theme-text-main)] border border-[var(--theme-border)] rounded-2xl pl-4 pr-12 py-3.5 text-sm resize-none focus:ring-2 focus:ring-orange-500/30 transition-all hide-scrollbar"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!inputValue.trim() || isTyping}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl transition-all shadow-lg active:scale-90"
                            >
                                <Send size={16} />
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
