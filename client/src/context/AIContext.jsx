import { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from './AuthContext';

const AIContext = createContext();

export const AIProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, text: "Hey! I'm Kagzso, your smart POS assistant. How can I help you today? 👋", sender: 'ai', timestamp: new Date() }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const prevPathRef = useRef(location.pathname);

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

    // Role-based mock responses
    const generateResponse = async (userText) => {
        setIsTyping(true);
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1000));
        
        const context = getPageContext();
        let response = "";
        const lowerText = userText.toLowerCase();

        // Basic personality-driven logic (In a real app, this would be an API call)
        if (lowerText.includes('hello') || lowerText.includes('hi')) {
            response = "Hey there! Ready to crush some orders? 🚀";
        } else if (lowerText.includes('help')) {
            response = `I'm here for you! On this ${context.page}, I can help you with ${context.help}. Just ask!`;
        } else if (lowerText.includes('order')) {
            response = context.role === 'waiter' 
                ? "To add an order, just tap a table, pick the food, and hit 'Confirm'. Easy! ✅"
                : "You can view all active orders in the current dashboard. Need anything else?";
        } else if (lowerText.includes('payment') || lowerText.includes('bill')) {
            response = "Head over to the Cashier section. Select the table, pick the payment method (Cash/QR), and you're set! 💸";
        } else if (lowerText.includes('status')) {
            response = "The kitchen updates statuses in real-time. Keep an eye on the colors – they'll tell you what's ready! 🎨";
        } else {
            response = "Got it! Check out the quick actions below if you're stuck, or just ask something specific. I'm quick! ⚡";
        }

        const newAiMsg = {
            id: Date.now(),
            text: response,
            sender: 'ai',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newAiMsg]);
        setIsTyping(false);
    };

    const sendMessage = (text) => {
        const newUserMsg = {
            id: Date.now(),
            text,
            sender: 'user',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, newUserMsg]);
        generateResponse(text);
    };

    const clearChat = () => {
        setMessages([{ id: 1, text: "Chat cleared! Ready for a fresh start? 🚀", sender: 'ai', timestamp: new Date() }]);
    };

    // Notify user when context changes
    useEffect(() => {
        if (prevPathRef.current !== location.pathname && isOpen) {
            const context = getPageContext();
            const notification = {
                id: Date.now(),
                text: `Switched to ${context.page}! Need help with ${context.help.split(',')[0]} here?`,
                sender: 'ai',
                timestamp: new Date(),
                isContextSwitch: true
            };
            setMessages(prev => [...prev, notification]);
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
            clearChat,
            context: getPageContext()
        }}>
            {children}
        </AIContext.Provider>
    );
};

export const useAI = () => useContext(AIContext);
