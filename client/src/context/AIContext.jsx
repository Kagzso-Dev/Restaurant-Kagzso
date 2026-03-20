import { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from './AuthContext';

// We'll lazy-load Transformers.js only when needed to save initial bundle size
let pipeline = null;

const AIContext = createContext();

export const AIProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, text: "Hey! I'm Kagzso, your smart POS assistant. I now support all languages locally! 👋", sender: 'ai', timestamp: new Date() }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const [isModelLoading, setIsModelLoading] = useState(false);
    const prevPathRef = useRef(location.pathname);

    // ─── Local AI Translation Engine (No API required) ──────────────────
    const initTranslator = useCallback(async () => {
        if (pipeline) return pipeline;
        try {
            setIsModelLoading(true);
            const { pipeline: getPipeline } = await import('@xenova/transformers');
            // Opus-MT supports many languages and is very small (~30MB)
            pipeline = await getPipeline('translation', 'Xenova/opus-mt-mul-en', {
                progress_callback: (p) => {
                    if (p.status === 'progress') {
                        console.log(`[AI] Loading model: ${p.progress.toFixed(1)}%`);
                    }
                }
            });
            setIsModelLoading(false);
            return pipeline;
        } catch (error) {
            console.error('[AI] model load failed:', error);
            setIsModelLoading(false);
            return null;
        }
    }, []);

    // Context-aware logic
    const getPageContext = useCallback(() => {
        const path = location.pathname;
        const role = user?.role || 'guest';
        
        if (path.includes('/admin')) return { role, page: 'Admin Panel', help: 'reports, menu management, and settings' };
        if (path.includes('/waiter')) return { role, page: 'Waiter Dashboard', help: 'taking orders and table management' };
        if (path.includes('/kitchen')) return { role, page: 'Kitchen Display', help: 'order queue and status updates' };
        if (path.includes('/cashier')) return { role, page: 'Cashier Terminal', help: 'payments and billing' };
        
        return { role, page: 'Global', help: 'general navigation' };
    }, [location.pathname, user?.role]);

    const generateResponse = async (userText) => {
        setIsTyping(true);
        
        let processedText = userText.toLowerCase();
        let sourceLanguage = 'en';

        // ── Step 1: Local Translation (Local AI) ──────────────────
        // Only run if the text looks non-English (simple check for non-ASCII or just try it)
        const isLikelyEnglish = /^[\x00-\x7F]*$/.test(userText);
        if (!isLikelyEnglish) {
            const translator = await initTranslator();
            if (translator) {
                try {
                    const output = await translator(userText);
                    processedText = output[0].translation_text.toLowerCase();
                    console.log(`[AI] Translated non-English input: "${processedText}"`);
                } catch (e) {
                    console.warn('[AI] Translation failed, falling back to raw text');
                }
            }
        }

        const context = getPageContext();
        let response = "";

        // Standard Logic (Internal Knowledge Base)
        if (processedText.includes('hello') || processedText.includes('hi')) {
            response = "Hey there! Ready to crush some orders? 🚀";
        } else if (processedText.includes('help')) {
            response = `I'm here for you! On this ${context.page}, I can help you with ${context.help}. Just ask!`;
        } else if (processedText.includes('order')) {
            response = context.role === 'waiter' 
                ? "To add an order, just tap a table, pick the food, and hit 'Confirm'. Easy! ✅"
                : "You can view all active orders in the current dashboard. Need anything else?";
        } else if (processedText.includes('payment') || processedText.includes('bill')) {
            response = "Head over to the Cashier section. Select the table, pick the payment method (Cash/QR), and you're set! 💸";
        } else if (processedText.includes('status')) {
            response = "The kitchen updates statuses in real-time. Keep an eye on the colors – they'll tell you what's ready! 🎨";
        } else {
            response = "Got it! Check out the quick actions below if you're stuck, or just ask something specific. I'm quick! ⚡";
        }

        // ── Optional: Translate response back locally if input was non-English ─────
        // (This would require another model or m2m100, for now we respond in English 
        //  but understand everything). To support FULL "all-to-all", we'd use Xenova/m2m100.

        await new Promise(resolve => setTimeout(resolve, 800));

        setMessages(prev => [...prev, {
            id: Date.now(),
            text: response,
            sender: 'ai',
            timestamp: new Date()
        }]);
        setIsTyping(false);
    };

    const sendMessage = (text) => {
        setMessages(prev => [...prev, { id: Date.now(), text, sender: 'user', timestamp: new Date() }]);
        generateResponse(text);
    };

    const clearChat = () => {
        setMessages([{ id: Date.now(), text: "Chat cleared! Ready for a fresh start? 🚀", sender: 'ai', timestamp: new Date() }]);
    };

    useEffect(() => {
        if (prevPathRef.current !== location.pathname && isOpen) {
            const ctx = getPageContext();
            setMessages(prev => [...prev, {
                id: Date.now(),
                text: `Switched to ${ctx.page}! Need help with ${ctx.help.split(',')[0]} here?`,
                sender: 'ai',
                timestamp: new Date(),
                isContextSwitch: true
            }]);
        }
        prevPathRef.current = location.pathname;
    }, [location.pathname, isOpen, getPageContext]);

    return (
        <AIContext.Provider value={{
            isOpen,
            setIsOpen,
            messages,
            sendMessage,
            isTyping,
            isModelLoading,
            clearChat,
            context: getPageContext()
        }}>
            {children}
        </AIContext.Provider>
    );
};

export const useAI = () => useContext(AIContext);

