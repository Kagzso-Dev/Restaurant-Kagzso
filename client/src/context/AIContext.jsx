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

    // ── Page Context ──────────────────────────────────────────────────────────
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

    // ── Security Check ────────────────────────────────────────────────────────
    const checkSecurity = useCallback((text) => {
        for (const { pattern, type } of SECURITY_PATTERNS) {
            if (pattern.test(text)) {
                return { type, response: SECURITY_RESPONSES[type] };
            }
        }
        return null;
    }, []);

    // ── Log Security Event (flag for admin) ───────────────────────────────────
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
        // Console warn for backend logging (can be wired to an API endpoint)
        console.warn('[Kagzso Security Alert]', event);
    }, [location.pathname, user]);

    // ── Response Engine ───────────────────────────────────────────────────────
    const generateResponse = useCallback(async (userText) => {
        setIsTyping(true);

        // ── 1. Security gate ──────────────────────────────────────────────────
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

        // ── 2. Simulate network delay ─────────────────────────────────────────
        await new Promise(r => setTimeout(r, 550 + Math.random() * 650));

        const ctx  = getPageContext();
        const role = ctx.role;
        const lower = userText.toLowerCase();
        let response = '';

        // ── 3. Intent matching ────────────────────────────────────────────────

        // Greeting
        if (/\b(hi|hey|hello|howdy|sup|yo|hiya)\b/.test(lower)) {
            const opts = [
                "Hey there! Ready to help you move fast today 🚀 What do you need?",
                "Hi! What can I help you with? Ask away! 👋",
                "Hey! What's up? I'm right here to help ✨",
            ];
            response = opts[Math.floor(Math.random() * opts.length)];
        }

        // Help / features
        else if (/\b(help|what.*(can|do)|feature|support|guide)\b/.test(lower)) {
            response = `I'm set up for ${ctx.page} right now. I can help with ${ctx.help}. Just ask anything specific! 💡`;
        }

        // ── ORDER INTENTS ─────────────────────────────────────────────────────
        else if (/(add|new|place|create|start).*(order)|(order).*(add|new|place|create|start)/.test(lower)) {
            if (role === 'waiter')
                response = "Easy! Go to Waiter Mode → tap a table → select items from the menu → hit **Confirm & Place Order**. That's it! ✅";
            else
                response = "Order creation is done by waiters. Head to your dashboard to see the current order list. 📋";
        }

        else if (/\border\b/.test(lower)) {
            if (role === 'waiter')        response = "Tap any table to view or manage its order, or hit 'New Order' to start fresh. 🍽️";
            else if (role === 'kitchen')  response = "All live orders show up on your Kitchen Display, sorted by time. Colors = priority! 🎨";
            else if (role === 'cashier')  response = "Go to Cashier dashboard to see orders ready for billing. Pick one and collect payment. 💸";
            else if (role === 'admin')    response = "Check Admin → Orders for full history and live status. Use filters to sort by status, date, or type. 📊";
            else                          response = "Orders are managed by waiters and tracked live across all stations. 📋";
        }

        // ── TABLE INTENTS ─────────────────────────────────────────────────────
        else if (/\btable\b/.test(lower)) {
            if (role === 'waiter')  response = "Tables are on your dashboard. Green = free, orange/red = occupied. Tap a table to manage its order! 🪑";
            else if (role === 'admin') response = "Manage tables under Admin → Tables. Add new tables, set capacity, and view occupancy stats. ⚙️";
            else                    response = "Table management is handled by waiters and admins. 🪑";
        }

        // ── PAYMENT INTENTS ───────────────────────────────────────────────────
        else if (/\b(payment|pay|bill|checkout|settle|receipt|billing)\b/.test(lower)) {
            if (role === 'cashier')
                response = "Go to Cashier Dashboard → pick the order → choose Cash or QR → confirm. Receipt auto-generates! 🧾";
            else
                response = "Payments happen at the Cashier terminal. Direct the customer there or call the cashier. 💳";
        }

        // ── QR INTENTS ────────────────────────────────────────────────────────
        else if (/\b(qr|scan|upi)\b/.test(lower)) {
            if (role === 'cashier')
                response = "Select the order → tap **QR Payment** → show the QR to the customer to scan. It auto-confirms once paid! 📱";
            else
                response = "QR payments are handled at the Cashier terminal using the restaurant's UPI ID. 📱";
        }

        // ── STATUS INTENTS ────────────────────────────────────────────────────
        else if (/\b(status|update|ready|preparing|pending|accepted)\b/.test(lower)) {
            if (role === 'kitchen')
                response = "Tap any order card to update: Pending → Accepted → Preparing → Ready. Waiter gets notified instantly! ✅";
            else if (role === 'waiter')
                response = "Watch the color codes on your dashboard — orange = preparing, green = ready, blue = accepted. Real-time! 🎨";
            else
                response = "Order statuses flow: Pending → Accepted → Preparing → Ready → Completed. All real-time! ⚡";
        }

        // ── KITCHEN INTENTS ───────────────────────────────────────────────────
        else if (/\b(kitchen|cook|chef|queue)\b/.test(lower)) {
            response = "The Kitchen Display shows all active orders sorted by time received. Status updates are instant and push notifications to waiters. 🍳";
        }

        // ── CANCEL INTENTS ────────────────────────────────────────────────────
        else if (/\bcancel\b/.test(lower)) {
            if (role === 'waiter')
                response = "Open the order → tap **Cancel Order** → confirm the reason. Only pending or accepted orders can be cancelled. ❌";
            else if (role === 'admin')
                response = "Go to Admin → Orders → open the order → cancel. You can cancel any non-completed order. ❌";
            else
                response = "Order cancellations are handled by the waiter or admin. Open the order and use the Cancel option. ❌";
        }

        // ── MENU INTENTS ──────────────────────────────────────────────────────
        else if (/\b(menu|item|food|dish|category|categories)\b/.test(lower)) {
            if (role === 'admin')
                response = "Head to Admin → Menu to add items, set prices, upload images, and toggle availability. Admin → Categories to manage categories. 🍕";
            else if (role === 'waiter')
                response = "The menu loads automatically when you open an order. Use the search bar or category filters to find items fast! 🔍";
            else
                response = "Menu items are configured by the admin under Admin → Menu. 🍽️";
        }

        // ── SETTINGS INTENTS ──────────────────────────────────────────────────
        else if (/\b(setting|config|setup|tax|discount|restaurant)\b/.test(lower)) {
            if (role === 'admin')
                response = "Go to Admin → Settings. Configure restaurant name, tax rate, UPI ID, receipt footer, and more. ⚙️";
            else
                response = "System settings are managed by admin only. Ask your admin to make configuration changes. ⚙️";
        }

        // ── ANALYTICS INTENTS ─────────────────────────────────────────────────
        else if (/\b(report|analytic|stat|summary|graph|chart|dashboard)\b/.test(lower)) {
            if (role === 'admin')
                response = "Head to Admin → Analytics for daily, weekly, and monthly reports — top items, revenue trends, and order counts. 📊";
            else
                response = "Reports and analytics are for admins only. Your manager can pull those up for you. 📊";
        }

        // ── TAKEAWAY INTENTS ──────────────────────────────────────────────────
        else if (/\b(takeaway|take.?away|take.?out|token|parcel)\b/.test(lower)) {
            response = "Takeaway orders get a token number. Go to Waiter Mode → Take Away → add items. Cashier collects by matching the token at billing. 🥡";
        }

        // ── DINE-IN INTENTS ───────────────────────────────────────────────────
        else if (/\b(dine.?in|sit.?in|dine|table\s*order)\b/.test(lower)) {
            response = "Dine-in orders link to a table. Open Waiter Mode → tap the table → add items → confirm. The kitchen gets it instantly! 🪑";
        }

        // ── PRINT INTENTS ─────────────────────────────────────────────────────
        else if (/\b(print|receipt|invoice)\b/.test(lower)) {
            response = "After billing, a receipt auto-generates. Hit the **Print** button on the bill preview. Works with any connected printer. 🖨️";
        }

        // ── NOTIFICATION INTENTS ──────────────────────────────────────────────
        else if (/\bnotif/.test(lower)) {
            response = "Notifications are in the 🔔 bell (top right). Admins see all alerts; staff see role-relevant updates. Red badge = unread! 🔔";
        }

        // ── THANKS ────────────────────────────────────────────────────────────
        else if (/\b(thank|thanks|great|awesome|nice|good job|perfect|cool)\b/.test(lower)) {
            response = "Anytime! You're doing great 💪 Anything else I can help with?";
        }

        // ── FALLBACK ──────────────────────────────────────────────────────────
        else {
            const fallbacks = [
                `Hmm, I'm not sure about that one. Try asking something specific about ${ctx.help}! ⚡`,
                "Could you rephrase that? I work best with specific questions about the POS. 🤔",
                `Try one of the quick buttons below, or ask something specific about ${ctx.page}. 💡`,
            ];
            response = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        }

        setMessages(prev => [...prev, {
            id: Date.now(),
            text: response,
            sender: 'ai',
            timestamp: new Date(),
        }]);
        setIsTyping(false);
    }, [checkSecurity, flagSecurityEvent, getPageContext]);

    // ── Send Message ──────────────────────────────────────────────────────────
    const sendMessage = useCallback((text) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        setMessages(prev => [...prev, {
            id: Date.now(),
            text: trimmed,
            sender: 'user',
            timestamp: new Date(),
        }]);
        generateResponse(trimmed);
    }, [generateResponse]);

    // ── Clear Chat ────────────────────────────────────────────────────────────
    const clearChat = useCallback(() => {
        setMessages([{
            id: Date.now(),
            text: "Fresh start! What do you need help with? 🚀",
            sender: 'ai',
            timestamp: new Date(),
        }]);
    }, []);

    // ── Dismiss Security Alert ────────────────────────────────────────────────
    const dismissSecurityAlert = useCallback((id) => {
        setSecurityAlerts(prev => prev.filter(a => a.id !== id));
    }, []);

    // ── Page context switch notification ─────────────────────────────────────
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
            isOpen, setIsOpen,
            messages, sendMessage,
            isTyping, clearChat,
            context: getPageContext(),
            securityAlerts, dismissSecurityAlert,
        }}>
            {children}
        </AIContext.Provider>
    );
};

export const useAI = () => useContext(AIContext);
