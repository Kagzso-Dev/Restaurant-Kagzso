import { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from './AuthContext';

const AIContext = createContext();

/* ─────────────────────────────────────────────────────────────────────────
   LOCAL RESPONSE ENGINE  — no API key, no server call, fully offline
   ───────────────────────────────────────────────────────────────────────── */
const localAIEngine = (message, context) => {
    const msg = message.toLowerCase().trim();
    const page = context?.page || '';

    const match = (...keywords) => keywords.some(k => msg.includes(k));

    // ── Greetings ──────────────────────────────────────────────────────────
    if (/^(hi|hello|hey|helo|hii|hiii|hai|namaste|good\s*(morning|evening|afternoon|day)|howdy|yo\b|sup\b)/i.test(msg)) {
        const greets = [
            "Hey there! 👋 I'm Kagzso AI. Ask me about orders, menu, tables, payments, or reports — I'm here to help!",
            "Hello! 😊 How can I assist you with your POS today? Try asking about orders, menu items, or daily sales.",
            "Hi! I'm your Kagzso assistant. What would you like to know? I can help with orders, billing, kitchen, and more.",
        ];
        return greets[Math.floor(Math.random() * greets.length)];
    }

    // ── How are you ────────────────────────────────────────────────────────
    if (match('how are you', 'how r u', 'how do you do', 'how is it going', 'whats up', "what's up")) {
        return "I'm running perfectly — ready to help your restaurant run smoothly! 🚀 What do you need?";
    }

    // ── Thank you ──────────────────────────────────────────────────────────
    if (match('thank', 'thanks', 'ty', 'thx', 'shukriya', 'shukriyaa', 'dhanyawad')) {
        return "You're welcome! 😊 Let me know if you need anything else.";
    }

    // ── Who are you / what are you ─────────────────────────────────────────
    if (match('who are you', 'what are you', 'about you', 'introduce yourself', 'your name', 'what is kagzso ai')) {
        return "I'm **Kagzso AI** — your built-in smart assistant for the Kagzso Restaurant POS. I can answer questions about orders, menu, tables, payments, kitchen, analytics, and general restaurant operations. All offline, no internet needed! 💡";
    }

    // ── Orders ─────────────────────────────────────────────────────────────
    if (match('new order', 'place order', 'create order', 'start order', 'take order')) {
        return "To place a new order:\n• **Waiter** → Go to Waiter Mode → choose Dine-In or Takeaway → select items → Confirm Order.\n• **Admin** → Orders page → New Order button.\nEach order gets a unique ORD number automatically. 🍽️";
    }
    if (match('cancel order', 'delete order', 'remove order')) {
        return "To cancel an order:\n• Open the order → click the **Cancel Order** button (available for admin/kitchen roles).\n• Individual items can be cancelled if they are still **PENDING**.\n• Orders that are already READY or COMPLETED cannot be cancelled. ⚠️";
    }
    if (match('order status', 'check order', 'order progress', 'track order', 'where is order')) {
        return "Order statuses flow like this:\n🟡 **Pending** → ✅ **Accepted** → 🔵 **Preparing** → 🟢 **Ready** → ⚫ **Completed**\n\nYou can check live status on the Kitchen Display or Orders page.";
    }
    if (match('add item', 'add food', 'add more', 'extra item', 'new item to order')) {
        return "To add items to an existing order:\n• Open the order → tap **+ ADD NEW** → select items → confirm.\n• Already PREPARING or READY items stay locked. Only new PENDING items go through the kitchen process. 🛒";
    }
    if (match('order history', 'past order', 'previous order', 'completed order')) {
        return "View completed orders on the **Orders** or **Working Process** page. You can filter by date, status, or order type. Admins can also see analytics and revenue breakdowns.";
    }
    if (match('takeaway', 'take away', 'take-away', 'token')) {
        return "For **Takeaway** orders:\n• Waiter Mode → Takeaway → select items → confirm.\n• A **Token Number** is assigned automatically.\n• Kitchen sees the token on the Kitchen Display. Customer picks up when ready. 🎫";
    }
    if (match('dine in', 'dine-in', 'dinein', 'table order')) {
        return "For **Dine-In** orders:\n• Waiter Mode → Dine-In → select table → add items → confirm.\n• The table status changes to **Occupied** automatically.\n• Order is sent to kitchen instantly. 🪑";
    }

    // ── Menu ───────────────────────────────────────────────────────────────
    if (match('add menu', 'new dish', 'new food', 'add dish', 'create menu item')) {
        return "To add a menu item:\n• Admin Panel → **Menu** → **+ Add Item**.\n• Fill in name, price, category, image (optional), and availability.\n• Set **Veg/Non-Veg** indicator.\n• The item appears in POS immediately after saving. 🥗";
    }
    if (match('edit menu', 'update menu', 'change price', 'update price', 'edit dish', 'edit item')) {
        return "To edit a menu item:\n• Admin → Menu → click the **edit (pencil)** icon on any item.\n• Change price, name, category, or availability.\n• Changes reflect instantly across all active POS sessions. ✏️";
    }
    if (match('delete menu', 'remove menu', 'remove dish', 'delete dish', 'delete item')) {
        return "To delete a menu item:\n• Admin → Menu → click the **trash** icon on the item.\n• ⚠️ Deleted items are removed from POS immediately.\n• Consider marking as **Unavailable** instead to preserve order history.";
    }
    if (match('category', 'categories', 'food category')) {
        return "To manage categories:\n• Admin → Menu → **Categories** tab.\n• Add, edit or delete categories with custom colors.\n• Items auto-filter by category on the POS order screen. 🏷️";
    }
    if (match('unavailab', 'available', 'stock', 'out of stock', 'sold out')) {
        return "To mark an item as unavailable:\n• Admin → Menu → toggle the **Available / Unavailable** button on the item.\n• Unavailable items are hidden from the waiter POS screen automatically. 🚫";
    }

    // ── Tables ─────────────────────────────────────────────────────────────
    if (match('table', 'tables', 'seat', 'seating')) {
        if (match('add table', 'new table', 'create table')) {
            return "To add a table:\n• Admin → **Tables** → **+ Add Table**.\n• Set table number and capacity.\n• Tables show on the waiter POS for dine-in orders. 🪑";
        }
        if (match('table status', 'table available', 'occupied', 'free table')) {
            return "Table statuses:\n🟢 **Available** — free to seat guests\n🔴 **Occupied** — active order running\n🟡 **Reserved** — held for booking\n🟠 **Billing** — awaiting payment\n⚫ **Cleaning** — being cleaned after service";
        }
        return "Tables are managed under **Admin → Tables**. You can add, edit, or track occupancy. Table status updates automatically when orders are placed or completed. 🗺️";
    }

    // ── Payments ───────────────────────────────────────────────────────────
    if (match('payment', 'pay', 'billing', 'bill', 'invoice', 'settle', 'cash', 'upi', 'card')) {
        if (match('process payment', 'complete payment', 'how to pay', 'collect payment')) {
            return "To process payment:\n• Open the order → tap **Complete Payment**.\n• Select payment method (Cash, UPI, Card).\n• Bill is marked as **Paid** and table is freed automatically. 💳";
        }
        if (match('print', 'receipt', 'kot', 'invoice')) {
            return "To print a bill/KOT:\n• Open the order → tap **Print KOT / Invoice**.\n• Payment must be marked as **Paid** first.\n• Supports thermal printer via browser print dialog. 🖨️";
        }
        if (match('unpaid', 'pending payment', 'due payment')) {
            return "To view unpaid orders:\n• Admin/Cashier → **Orders** page → filter by **Unpaid**.\n• Or check the **Working Process** section for orders awaiting payment. 💰";
        }
        if (match('discount', 'coupon', 'offer')) {
            return "Discounts can be applied at the order level before payment. Check the order details modal for the discount field. Admin can set discount values per order. 🎁";
        }
        return "Payments are processed from the Order Details modal — click **Complete Payment**. Supports Cash, UPI, and Card. Paid orders are marked SETTLED and can then be printed. 💳";
    }

    // ── Kitchen ─────────────────────────────────────────────────────────────
    if (match('kitchen', 'chef', 'cook', 'preparing', 'prepare')) {
        if (match('kitchen display', 'kot', 'kitchen screen', 'kitchen view')) {
            return "The **Kitchen Display** shows all active orders in real-time.\n• New orders appear as **PENDING**.\n• Kitchen marks them → Accepted → Preparing → Ready.\n• Completed orders auto-clear from the display. 🍳";
        }
        if (match('accept order', 'start cooking', 'begin order')) {
            return "On the Kitchen Display:\n• Tap an order card → **Accept** to start.\n• Status changes to **Preparing**.\n• When done, tap **Ready** to notify the waiter. ✅";
        }
        return "Kitchen staff uses the **Kitchen Display** to see and process orders. Orders flow: Pending → Accepted → Preparing → Ready. Real-time updates are powered by live sync. 🔔";
    }

    // ── Analytics / Reports ────────────────────────────────────────────────
    if (match('analytics', 'report', 'revenue', 'sales', 'earning', 'income', 'stat', 'chart', 'graph', 'dashboard')) {
        if (match('today', "today's", 'daily', 'day')) {
            return "Today's stats are on the **Admin Dashboard** — total orders, revenue, items sold, and top-selling dishes. Updates in real-time as orders come in. 📊";
        }
        if (match('week', 'weekly', 'month', 'monthly')) {
            return "Weekly and monthly analytics are in **Admin → Analytics**. Filter by date range to see revenue trends, order volume, popular items, and peak hours. 📈";
        }
        return "Access reports at **Admin → Analytics**. You'll find:\n• Total revenue and orders\n• Best-selling items\n• Payment method breakdown\n• Peak hours chart\n• Daily/weekly/monthly filters 📊";
    }

    // ── Staff / Users ──────────────────────────────────────────────────────
    if (match('staff', 'employee', 'user', 'account', 'role', 'waiter account', 'kitchen account', 'cashier account')) {
        if (match('add staff', 'create user', 'new staff', 'add waiter', 'add cashier', 'add kitchen')) {
            return "To add staff:\n• Admin → **Settings → Staff Management**.\n• Add name, email, password, and assign a role (Admin, Waiter, Kitchen, Cashier).\n• Each role has specific access permissions. 👤";
        }
        if (match('role', 'permission', 'access')) {
            return "Staff roles and access:\n👑 **Admin** — full access, settings, analytics\n🍽️ **Waiter** — take orders, view tables\n👨‍🍳 **Kitchen** — kitchen display, order status\n💰 **Cashier** — billing, payments, working process";
        }
        return "Staff accounts are managed under **Admin → Settings → Staff**. Assign roles to control what each staff member can access. 🧑‍💼";
    }

    // ── Settings ───────────────────────────────────────────────────────────
    if (match('setting', 'config', 'configure', 'setup', 'tax', 'gst', 'restaurant name', 'business')) {
        if (match('tax', 'gst', 'vat')) {
            return "Tax rate is configured in **Admin → Settings → Tax Settings**. Set GST/VAT percentage — it's automatically applied to all new orders. 🧾";
        }
        if (match('restaurant name', 'business name', 'logo', 'brand')) {
            return "Update your restaurant name, logo, and contact details in **Admin → Settings → Restaurant Profile**. 🏪";
        }
        return "All system settings are in **Admin → Settings**. You can configure:\n• Restaurant profile\n• Tax rates (GST/VAT)\n• Staff accounts\n• Menu view preferences\n• Dine-In / Takeaway toggle ⚙️";
    }

    // ── Live / Socket / Real-time ───────────────────────────────────────────
    if (match('live', 'real time', 'realtime', 'sync', 'update', 'notification', 'offline')) {
        return "Kagzso POS uses **live real-time sync** — all orders, status changes, and notifications appear instantly across all devices without refreshing. The LIVE indicator (top bar) shows the connection status. 🟢";
    }

    // ── Login / Logout ──────────────────────────────────────────────────────
    if (match('login', 'log in', 'sign in', 'signin', 'password', 'forgot password')) {
        return "To login, use your assigned email and password at the login page. If you forgot your password, contact your Admin to reset it from **Settings → Staff Management**. 🔐";
    }
    if (match('logout', 'log out', 'sign out', 'signout')) {
        return "To logout, scroll to the bottom of the sidebar and click **Sign Out**. Your session will be cleared securely. 👋";
    }

    // ── Help ───────────────────────────────────────────────────────────────
    if (match('help', 'how to', 'guide', 'tutorial', 'what can you do', 'what do you do')) {
        return "I can help you with:\n📦 **Orders** — place, cancel, track, add items\n🍽️ **Menu** — add, edit, delete items & categories\n🪑 **Tables** — manage dine-in tables\n💳 **Payments** — billing, printing, payment methods\n👨‍🍳 **Kitchen** — kitchen display, order flow\n📊 **Analytics** — sales, revenue, reports\n👤 **Staff** — user roles and accounts\n⚙️ **Settings** — tax, profile, config\n\nJust ask me anything! 💬";
    }

    // ── Context-aware page hints ────────────────────────────────────────────
    if (match('what is this', 'what page', 'where am i', 'current page', 'this screen')) {
        const hints = {
            'Admin Panel': "You're on the **Admin Dashboard** — overview of today's orders, revenue, and live activity. Navigate using the sidebar.",
            'Waiter Dashboard': "You're on the **Waiter Dashboard** — manage dine-in tables, takeaway orders, and view active orders here.",
            'Kitchen Display': "You're on the **Kitchen Display** — see incoming orders and update their cooking status in real-time.",
            'Cashier Terminal': "You're on the **Cashier Terminal** — process payments, view working orders, and print bills.",
        };
        return hints[page] || "You're using the **Kagzso POS** system. Use the sidebar to navigate between modules.";
    }

    // ── Numbers / How many ──────────────────────────────────────────────────
    if (match('how many order', 'total order', 'count order')) {
        return "Check your total orders on **Admin → Dashboard** for today's count, or **Admin → Analytics** for historical totals filtered by date range. 📊";
    }

    // ── Fallback ────────────────────────────────────────────────────────────
    const fallbacks = [
        `I'm not sure about that, but I can help with **orders, menu, tables, payments, kitchen, analytics, or settings**. Try asking something specific! 💬`,
        `Hmm, I didn't quite catch that. Try asking about: orders, menu items, table management, billing, or kitchen display. 🤔`,
        `I work best with POS-related questions! Ask me about placing orders, managing your menu, processing payments, or viewing reports. 📋`,
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
};

/* ─────────────────────────────────────────────────────────────────────────
   AI CONTEXT PROVIDER
   ───────────────────────────────────────────────────────────────────────── */
export const AIProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "Hey! 👋 I'm Kagzso AI, your smart POS assistant. Ask me about orders, menu, payments, kitchen, or anything else!",
            sender: 'ai',
            timestamp: new Date()
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const prevPathRef = useRef(location.pathname);

    const getPageContext = useCallback(() => {
        const path = location.pathname;
        const role = user?.role || 'guest';

        if (path.includes('/admin'))   return { role, page: 'Admin Panel',       help: 'reports, menu management, and settings' };
        if (path.includes('/waiter'))  return { role, page: 'Waiter Dashboard',  help: 'taking orders and table management' };
        if (path.includes('/kitchen')) return { role, page: 'Kitchen Display',   help: 'order queue and status updates' };
        if (path.includes('/cashier')) return { role, page: 'Cashier Terminal',  help: 'payments and billing' };

        return { role, page: 'Global', help: 'general navigation' };
    }, [location.pathname, user?.role]);

    const generateResponse = useCallback(async (userText) => {
        setIsTyping(true);

        // Simulate a natural typing delay (300–800ms)
        const delay = 300 + Math.random() * 500;
        await new Promise(r => setTimeout(r, delay));

        const context = getPageContext();
        const responseText = localAIEngine(userText, context);

        setMessages(prev => [...prev, {
            id: Date.now(),
            text: responseText,
            sender: 'ai',
            timestamp: new Date()
        }]);

        setIsTyping(false);
    }, [getPageContext]);

    const sendMessage = useCallback((text) => {
        if (!text?.trim()) return;
        setMessages(prev => [...prev, {
            id: Date.now(),
            text,
            sender: 'user',
            timestamp: new Date()
        }]);
        generateResponse(text);
    }, [generateResponse]);

    const clearChat = useCallback(() => {
        setMessages([{
            id: Date.now(),
            text: "Chat cleared! Ready for a fresh start? 🚀",
            sender: 'ai',
            timestamp: new Date()
        }]);
    }, []);

    // Auto-notify when user navigates to a new page with the chat open
    useEffect(() => {
        if (prevPathRef.current !== location.pathname && isOpen) {
            const ctx = getPageContext();
            setMessages(prev => [...prev, {
                id: Date.now(),
                text: `Switched to **${ctx.page}**! Need help with ${ctx.help.split(',')[0]} here? 📍`,
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
            isModelLoading: false,
            clearChat,
            context: getPageContext()
        }}>
            {children}
        </AIContext.Provider>
    );
};

export const useAI = () => useContext(AIContext);
