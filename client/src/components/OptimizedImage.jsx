import React, { useState, useEffect } from 'react';

/**
 * OptimizedImage Component
 * 
 * Provides an "instant" image loading experience similar to Swiggy/Zomato.
 * Features:
 * - Appwrite image optimization (width/quality)
 * - Blur-up effect (low-res placeholder -> high-res image)
 * - Shimmer/Grey background while loading
 * - Prevents layout shifting
 * - Lazy loading
 */

const getOptimizedUrl = (url, width = 300, quality = 60) => {
    if (!url) return url;
    // Support both old URLs and Appwrite URLs
    if (!url.includes('/storage/buckets/') || !url.includes('/files/')) return url;
    
    try {
        const u = new URL(url);
        // Appwrite preview API supports width and quality
        // Replace /view with /preview if it exists
        u.pathname = u.pathname.replace(/\/view$/, '/preview');
        // Ensure /preview is there if neither view nor preview was present
        if (!u.pathname.endsWith('/preview')) {
            u.pathname = u.pathname + '/preview';
        }
        
        u.searchParams.set('width', String(width));
        u.searchParams.set('quality', String(quality));
        return u.toString();
    } catch {
        return url;
    }
};

const OptimizedImage = ({ 
    src, 
    alt, 
    className = "", 
    containerClassName = "",
    width = 300, 
    quality = 60,
    aspectRatio = "aspect-square",
    objectFit = "object-cover",
    children
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState(false);

    // Optimized URLs
    const fullResUrl = getOptimizedUrl(src, width, quality);
    const blurUrl = getOptimizedUrl(src, 20, 10); // Very low res for blur effect

    useEffect(() => {
        setIsLoaded(false);
        setError(false);
    }, [src]);

    if (error || !src) {
        return (
            <div className={`w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-2xl ${containerClassName} ${aspectRatio}`}>
                🍔
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden bg-gray-100 dark:bg-gray-800/50 ${containerClassName} ${aspectRatio}`}>
            {/* Shimmer Placeholder */}
            {!isLoaded && (
                <div className="absolute inset-0 z-0">
                    <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-pulse" />
                </div>
            )}

            {/* Blurred Low-Res Image */}
            {src.includes('/storage/buckets/') && !isLoaded && (
                <img
                    src={blurUrl}
                    alt=""
                    className={`absolute inset-0 w-full h-full ${objectFit} blur-xl scale-110 opacity-70 transition-opacity duration-500`}
                />
            )}

            {/* Full-Res Image */}
            <img
                src={fullResUrl}
                alt={alt}
                loading="lazy"
                onLoad={() => setIsLoaded(true)}
                onError={() => setError(true)}
                className={`
                    w-full h-full ${objectFit} transition-all duration-700 ease-out
                    ${isLoaded ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-lg scale-105'}
                    ${className}
                `}
            />

            {/* Content Overlays */}
            {children}
        </div>
    );
};

export default OptimizedImage;
