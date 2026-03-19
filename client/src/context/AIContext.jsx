import { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from './AuthContext';

const AIContext = createContext();

// ── Security Threat Patterns ────────────────────────────────────────────────
const SECURITY_PATTERNS = [
    { pattern: /\bpassword\b|\bpasswd\b|\bpass\b|\bcredentials?\b|\blogin\s+details?\b/i, type: 'credentials' },
    { pattern: /api[_\s-]?key|secret[_\s-]?key|access[_\s-]?token|auth[_\s-]?token|\bjwt\b|bearer\s+token/i, type: 'api_secret' },
    { pattern: /\bhack\b|\bexploit\b|sql\s*inject|xss\b|cross.?site|script\s*inject|bypass\s*(auth|login|security|payment)/i, type: 'attack' },
    { pattern: /(customer|user|staff|employee)\s*(personal\s+)?details?|(customer|user)\s*(phone|email|address|contact)/i, type: 'personal_data' },
    { pattern: /payment\s*(card|account|cvv|pin|number)|card\s*details?|bank\s*account|upi\s*id\s*of/i, type: 'payment_data' },
    { pattern: /delete\s*(all|every|entire|database|order|user|account|customer|data|record)/i, type: 'destructive' },
    { pattern: /override\s*(security|auth|payment|access|permission)|disable\s*(auth|security|login)/i, type: 'bypass' },
    { pattern: /\.env\b|environment\s*variable|database\s*(url|connection|config)|server\s*config/i, type: 'system_info' },
    { pattern: /\bbrute\s*force\b|\bphish\b|\bmalware\b|\btrojan\b|\bddos\b|\bransomware\b/i, type: 'malicious' },
];

const SECURITY_RESPONSES = {
    credentials: "🔒 I can't share passwords or credentials — that's off-limits for everyone's safety! Need a password reset? Contact your admin directly.",
    api_secret: "🔒 API keys and secrets are restricted system data. I can't share those here. Reach out to your admin for access management.",
    attack: "🚨 That looks like a security concern. I'm blocking this request and it's been flagged for admin review. If this was a mistake, just ask something else!",
    personal_data: "🔒 Customer and staff personal details are private and protected. I'm not able to share that here. Contact admin for legitimate data requests.",
    payment_data: "🔒 Payment details (cards, CVV, UPI) are strictly confidential. Never share these in any chat. Contact admin if there's a billing issue.",
    destructive: "🚨 That action could cause serious, irreversible damage to the system! Request blocked and flagged for admin review.",
    bypass: "🚨 Security bypass attempts are not allowed. This has been flagged for admin review. If you have a legitimate issue, contact your manager.",
    system_info: "🔒 System configuration and server details are restricted to authorized technical staff only.",
    malicious: "🚨 That type of activity is not allowed on this system. This has been flagged and logged for admin review.",
};

// ── Role & Page Context ─────────────────────────────────────────────────────
const PAGE_CONTEXTS = {
    admin: { page: 'Admin Panel', help: 'menu management, analytics, settings, and orders' },
    waiter: { page: 'Waiter Dashboard', help: 'taking orders, table management, and order status' },
    kitchen: { page: 'Kitchen Display', help: 'order queue, status updates, and preparation tracking' },
    cashier: { page: 'Cashier Terminal', help: 'payments, billing, and QR collection' },
};

// ── Role-Specific Quick Suggestions ────────────────────────────────────────
export const ROLE_SUGGESTIONS = {
    admin:   ['How to manage menu?', 'View analytics?', 'Add a category?', 'Change settings?'],
    waiter:  ['How to add an order?', 'Check table status?', 'Takeaway process?', 'Cancel an order?'],
    cashier: ['How to collect payment?', 'QR payment help?', 'Print receipt?', 'Check active orders?'],
    kitchen: ['Update order status?', 'View order queue?', 'Mark order ready?', 'Kitchen shortcuts?'],
    guest:   ['How do I start?', 'What can you do?', 'Navigate the POS?'],
};

export const AIProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "Hey! I'm Kagzso — your smart POS assistant 🤖\n\nI can help with orders, tables, payments, kitchen, and more. What do you need?",
            sender: 'ai',
            timestamp: new Date(),
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const [securityAlerts, setSecurityAlerts] = useState([]);
    const prevPathRef = useRef(location.pathname);

    const getPageContext = useCallback(() => {
        const path = location.pathname;
        const role = user?.role || 'guest';
        let pageKey = 'guest';
        if (path.includes('/admin'))   pageKey = 'admin';
        else if (path.includes('/waiter') || path.includes('/dine-in') || path.includes('/take-away')) pageKey = 'waiter';
        else if (path.includes('/kitchen')) pageKey = 'kitchen';
        else if (path.includes('/cashier')) pageKey = 'cashier';
        const ctx = PAGE_CONTEXTS[pageKey] || { page: 'POS System', help: 'general navigation' };
        return { role, page: ctx.page, help: ctx.help, path };
    }, [location.pathname, user?.role]);

    const checkSecurity = useCallback((text) => {
        for (const { pattern, type } of SECURITY_PATTERNS) {
            if (pattern.test(text)) return { type, response: SECURITY_RESPONSES[type] };
        }
        return null;
    }, []);

    const flagSecurityEvent = useCallback((text, type) => {
        const event = {
            id: Date.now(),
            query: text,
            type,
            user: user?.name || user?.username || 'Unknown',
            role: user?.role || 'guest',
            page: location.pathname,
            timestamp: new Date(),
        };
        setSecurityAlerts(prev => [...prev, event]);
        console.warn('[Kagzso Security Alert]', event);
    }, [location.pathname, user]);

    const generateResponse = useCallback(async (userText) => {
        setIsTyping(true);
        const secIssue = checkSecurity(userText);
        if (secIssue) {
            await new Promise(r => setTimeout(r, 400));
            flagSecurityEvent(userText, secIssue.type);
            setMessages(prev => [...prev, {
                id: Date.now(),
                text: secIssue.response,
                sender: 'ai',
                timestamp: new Date(),
                isSecurityAlert: true,
            }]);
            setIsTyping(false);
            return;
        }

        await new Promise(r => setTimeout(r, 550 + Math.random() * 650));
        const ctx  = getPageContext();
        const role = ctx.role;
        const lower = userText.toLowerCase();
        let response = '';

        if (/\b(hi|hey|hello|yo)\b/.test(lower)) {
            response = "Hey there! Ready to help you move fast today 🚀 What do you need?";
        } else if (/\b(help|support|guide)\b/.test(lower)) {
            response = `I'm set up for ${ctx.page} right now. I can help with ${ctx.help}. Just ask! 💡`;
        } else if (/\border\b/.test(lower)) {
            if (role === 'waiter') response = "Tap any table to start an order, or use the 'New Order' button. Easy! 🍽️";
            else if (role === 'kitchen') response = "Live orders are on your screen. Tap to accept or mark as ready. 👨‍🍳";
            else response = "Orders are managed by waiters and tracked live across all stations. 📋";
        } else if (/\b(payment|bill)\b/.test(lower)) {
            response = "Payments are handled at the Cashier terminal. Direct the customer there or check the 'Billing' status. 💸";
        } else if (/\b(thank|thanks|nice)\b/.test(lower)) {
            response = "Anytime! You're doing great 💪 Anything else?";
        } else {
            response = `Got it! Check out the quick actions below, or ask something specific about ${ctx.page}. 💡`;
        }

        setMessages(prev => [...prev, {
            id: Date.now(),
            text: response,
            sender: 'ai',
            timestamp: new Date(),
        }]);
        setIsTyping(false);
    }, [checkSecurity, flagSecurityEvent, getPageContext]);

    const sendMessage = useCallback((text) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        setMessages(prev => [...prev, { id: Date.now(), text: trimmed, sender: 'user', timestamp: new Date() }]);
        generateResponse(trimmed);
    }, [generateResponse]);

    const clearChat = useCallback(() => {
        setMessages([{ id: Date.now(), text: "Fresh start! What do you need help with? 🚀", sender: 'ai', timestamp: new Date() }]);
    }, []);

    const dismissSecurityAlert = useCallback((id) => {
        setSecurityAlerts(prev => prev.filter(a => a.id !== id));
    }, []);

    useEffect(() => {
        if (prevPathRef.current !== location.pathname && isOpen) {
            const ctx = getPageContext();
            setMessages(prev => [...prev, {
                id: Date.now(),
                text: `Switched to ${ctx.page} — I'm ready to help with ${ctx.help.split(',')[0]} here! 🔄`,
                sender: 'ai',
                timestamp: new Date(),
                isContextSwitch: true,
            }]);
        }
        prevPathRef.current = location.pathname;
    }, [location.pathname, isOpen, getPageContext]);

    return (
        <AIContext.Provider value={{
            isOpen, setIsOpen, messages, sendMessage,
            isTyping, clearChat, context: getPageContext(),
            securityAlerts, dismissSecurityAlert,
        }}>
            {children}
        </AIContext.Provider>
    );
};

export const useAI = () => useContext(AIContext);
