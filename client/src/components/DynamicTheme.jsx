import { useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * DynamicTheme
 *
 * Applies admin-configured stage/status colors as CSS custom properties
 * directly on <html> via style.setProperty(). This is more reliable than
 * injecting a <style> tag because React's reconciler updates it
 * synchronously and every browser handles setProperty correctly.
 *
 * Hex alpha trick:  colorHex + '26' = 15% opacity  (0x26 / 0xFF ≈ 0.149)
 *                   colorHex + '40' = 25% opacity  (0x40 / 0xFF ≈ 0.251)
 */
function hexAlpha(hex, alpha) {
    // hex = '#rrggbb' — strip leading # if present
    const h = hex.startsWith('#') ? hex.slice(1) : hex;
    // Expand 3-digit shorthand to 6-digit
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

const DynamicTheme = () => {
    const { settings } = useContext(AuthContext);

    useEffect(() => {
        const root = document.documentElement;

        const pending   = (settings?.pendingColor   || '#3b82f6').trim();
        const accepted  = (settings?.acceptedColor  || '#8b5cf6').trim();
        const preparing = (settings?.preparingColor || '#f59e0b').trim();
        const ready     = (settings?.readyColor     || '#10b981').trim();

        // Solid color tokens
        root.style.setProperty('--status-pending',   pending);
        root.style.setProperty('--status-accepted',  accepted);
        root.style.setProperty('--status-preparing', preparing);
        root.style.setProperty('--status-ready',     ready);

        // Background variants (15% opacity)
        root.style.setProperty('--status-pending-bg',   hexAlpha(pending,   0.15));
        root.style.setProperty('--status-accepted-bg',  hexAlpha(accepted,  0.15));
        root.style.setProperty('--status-preparing-bg', hexAlpha(preparing, 0.15));
        root.style.setProperty('--status-ready-bg',     hexAlpha(ready,     0.15));

        // Border variants (25% opacity)
        root.style.setProperty('--status-pending-border',   hexAlpha(pending,   0.35));
        root.style.setProperty('--status-accepted-border',  hexAlpha(accepted,  0.35));
        root.style.setProperty('--status-preparing-border', hexAlpha(preparing, 0.35));
        root.style.setProperty('--status-ready-border',     hexAlpha(ready,     0.35));

    }, [settings]);

    return null;
};

export default DynamicTheme;
