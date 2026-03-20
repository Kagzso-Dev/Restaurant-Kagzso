require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const hpp = require('hpp');
const { databases, databaseId, COLLECTIONS, Query } = require('./config/appwrite');
const logger = require('./utils/logger');
const { getCacheStats } = require('./utils/cache');
const { socketAuthMiddleware, authorizedRoomJoin, authorizedRoleJoin } = require('./middleware/socketAuth');
const { backfillDailyAnalytics } = require('./utils/dailyAnalytics');
const { syncSchema }             = require('./utils/schema_sync');

const app = express();
const server = http.createServer(app);

// ─── Resolve client/dist path (works both locally and on VPS) ────────────────
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
const hasFrontend = fs.existsSync(CLIENT_DIST);

// ─── CORS Configuration ───────────────────────────────────────────────────────
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5005",
    "https://kagzso-kot-appwrite.vercel.app",
    "https://kagzso-pos-frontend.onrender.com",
    "https://restaurant-five-zeta-13.vercel.app",
    process.env.CLIENT_URL
].filter(Boolean).map(o => o.trim().replace(/\/$/, '')); // Trim and remove trailing slashes

const corsOriginFn = (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    
    // Normalize incoming origin
    const normalizedOrigin = origin.trim().replace(/\/$/, '');
    
    const isAllowed = allowedOrigins.includes(normalizedOrigin) || 
                      process.env.NODE_ENV === 'development';

    if (isAllowed) {
        callback(null, true);
    } else {
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(null, false); // Don't throw error, just don't allow
    }
};

const corsOptions = {
    origin: corsOriginFn,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Set-Cookie'],
    preflightContinue: false,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('/{*splat}', cors(corsOptions)); // Explicitly handle preflight for all routes

// ─── Global Middleware ────────────────────────────────────────────────────────
// Helmet with relaxed CSP so the React SPA (inline scripts, WebSocket) works.
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc:  ["'self'", "'unsafe-inline'"],
            styleSrc:   ["'self'", "'unsafe-inline'"],
            imgSrc:     ["'self'", 'data:', 'blob:', 'https:'],
            connectSrc: ["'self'", 'ws:', 'wss:', 'http:', 'https:', "https://restaurant-kagzso-backend.onrender.com"],
            fontSrc:    ["'self'", 'data:'],
            workerSrc:  ["'self'", 'blob:'],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(hpp());
app.use(compression({ level: 6, threshold: 1024 })); // skip bodies < 1 KB
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(logger.requestLogger);
app.set('trust proxy', true);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please slow down.' },
    skip: (req) => req.path === '/' || req.path === '/health',
});

// Apply rate limits only in production to prevent 429 errors during local dev
if (process.env.NODE_ENV !== 'development') {
    app.use('/api', apiLimiter);
}

// ─── Socket.IO Server ─────────────────────────────────────────────────────────
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,  // reduced from 10s — less keepalive traffic
    pingTimeout: 20000,
    connectionStateRecovery: {
        maxDisconnectionDuration: 30 * 1000, // reduced from 2 min — free memory faster
        skipMiddlewares: true,
    },
    maxHttpBufferSize: 1e6,
});

io.use(socketAuthMiddleware);
app.set('io', io);

// ─── API Routes ───────────────────────────────────────────────────────────────
// Must be registered BEFORE static file serving so /api/* never falls through
// to index.html.

// ─── API Routes ───────────────────────────────────────────────
// Register specific routes BEFORE generic /api to avoid middleware conflicts
app.use('/api/auth',           require('./routes/authRoutes'));
app.use('/api/settings',       require('./routes/settingRoutes'));
app.use('/api/tables',         require('./routes/tableRoutes'));
app.use('/api/menu',           require('./routes/menuRoutes'));
app.use('/api/categories',     require('./routes/categoryRoutes'));
app.use('/api/dashboard',      require('./routes/dashboardRoutes'));
app.use('/api/analytics',      require('./routes/analyticsRoutes'));
app.use('/api/payments',       require('./routes/paymentRoutes'));
app.use('/api/notifications',  require('./routes/notificationRoutes'));
app.use('/api/webhooks',       require('./routes/webhookRoutes'));

// Generic /api route (contains /orders and global protect)
app.use('/api',                require('./routes/orderRoutes'));

// ─── Manual Backfill Endpoint (admin only) ───────────────────────────────────
// POST /api/analytics/backfill?force=true  → re-aggregate all historical dates
// POST /api/analytics/backfill             → aggregate only missing dates
// Useful after data imports or when daily_analytics falls out of sync.
const { protect, authorize } = require('./middleware/authMiddleware');
app.post('/api/analytics/backfill',
    protect,
    authorize('admin'),
    async (req, res) => {
        const forceAll = req.query.force === 'true';
        logger.info(`[backfill] Manual trigger by user ${req.userId} (forceAll=${forceAll})`);
        const result = await backfillDailyAnalytics(forceAll);
        res.json({ success: true, ...result });
    }
);

// ─── AI Assistant (Admin only) ───────────────────────────────────────────────
const aiController = require('./controllers/aiController');
app.post('/api/ai/chat', protect, authorize('admin'), aiController.chat);

// GET /api/analytics/daily?range=week|month|year → read from daily_analytics table
app.get('/api/analytics/daily',
    protect,
    authorize('admin'),
    async (req, res) => {
        try {
            const { range = 'month' } = req.query;
            let since;
            const now = new Date();
            switch (range) {
                case 'week':  since = new Date(now); since.setDate(now.getDate() - 7);   break;
                case 'year':  since = new Date(now); since.setFullYear(now.getFullYear() - 1); break;
                case 'month':
                default:      since = new Date(now); since.setDate(now.getDate() - 30);  break;
            }
            const isoSince = since.toISOString().slice(0, 10);
            
            const response = await databases.listDocuments(
                databaseId,
                COLLECTIONS.daily_analytics,
                [
                    Query.greaterThanEqual('date', isoSince),
                    Query.orderAsc('date'),
                    Query.limit(365)
                ]
            );

            logger.info(`[dailyAnalytics] GET /api/analytics/daily returned ${response.documents.length} rows for range=${range}`);
            res.json(response.documents.map(r => ({
                date:             r.date.slice(0, 10),
                totalOrders:      r.total_orders,
                completedOrders:  r.completed_orders,
                cancelledOrders:  r.cancelled_orders,
                totalRevenue:     parseFloat(r.revenue || 0),
                avgOrderValue:    parseFloat(r.avg_order_value || 0),
                dineInOrders:     r.dine_in_orders,
                takeawayOrders:   r.takeaway_orders,
                // cash_revenue and digital_revenue are currently not tracked in the simplified schema
                cashRevenue:      0,
                digitalRevenue:   0,
            })));
        } catch (err) {
            logger.error('[dailyAnalytics] GET /api/analytics/daily error:', { error: err.message });
            res.status(500).json({ message: err.message });
        }
    }
);

// ─── Socket.IO Events ────────────────────────────────────────────────────────
io.on('connection', (socket) => {
    logger.info('Socket connected', {
        socketId: socket.id,
        userId:   socket.userId,
        role:     socket.role,
    });

    socket.on('join_role', (role) => {
        if (!role) return;
        socket.join(`role_${role}`);
        logger.info(`User ${socket.id} joined room: role_${role}`);
    });

    socket.on('join_branch', () => {
        socket.join('restaurant_main');
        logger.info(`User ${socket.id} joined restaurant main room`);
    });

    socket.on('join_room', (room) => {
        socket.join(room);
        logger.debug(`Socket ${socket.id} joined room: ${room}`);
    });

    socket.on('disconnect', (reason) => {
        logger.info('Socket disconnected', { socketId: socket.id, reason });
    });

    socket.on('connect_error', (err) => {
        logger.error('Socket connect error', { socketId: socket.id, error: err.message });
    });
});

app.set('io', io);

// ─── Auto-Release Timer (reserved tables idle > 10 min) ──────────────────────
// The recurring interval starts immediately; the INITIAL run is deferred to
// startServer() so the DB connection is guaranteed to be ready first.
const { autoReleaseExpiredReservations } = require('./controllers/tableController');
setInterval(() => autoReleaseExpiredReservations(io), 2 * 60 * 1000);

// ─── Health Check (JSON — always available, even without frontend build) ──────
// DB ping result is cached for 30 s so load-balancer polling never hits Appwrite directly.
let _healthDbCache = { status: 'unknown', ts: 0 };
app.get('/health', async (req, res) => {
    const uptime   = process.uptime();
    const memUsage = process.memoryUsage();

    // Check Appwrite connectivity — cached 30 s to avoid DB load from LB probes
    let dbStatus = _healthDbCache.status;
    if (Date.now() - _healthDbCache.ts > 30_000) {
        try {
            await databases.listDocuments(databaseId, 'users', [require('./config/appwrite').Query.limit(1)]);
            dbStatus = 'connected';
        } catch (e) {
            dbStatus = 'error';
        }
        _healthDbCache = { status: dbStatus, ts: Date.now() };
    }

    // Guard against a missing or malformed package.json on the VPS
    let version = '1.0.0';
    try { version = require('./package.json').version || '1.0.0'; } catch { /* ignore */ }

    res.json({
        status:      dbStatus === 'connected' ? 'healthy' : 'degraded',
        timestamp:   new Date().toISOString(),
        uptime:      `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
        version,
        environment: process.env.NODE_ENV || 'development',
        node:        process.version,
        frontend:    hasFrontend ? 'built' : 'not built (run: npm run build in client/)',

        database: {
            state: dbStatus,
            endpoint: process.env.APPWRITE_ENDPOINT || 'N/A',
            projectId: process.env.APPWRITE_PROJECT_ID || 'N/A',
        },

        sockets: {
            connected: io.engine.clientsCount,
            rooms:     io.sockets.adapter.rooms.size,
        },

        memory: {
            rss:       `${(memUsage.rss       / 1024 / 1024).toFixed(1)} MB`,
            heapUsed:  `${(memUsage.heapUsed  / 1024 / 1024).toFixed(1)} MB`,
            heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(1)} MB`,
            external:  `${(memUsage.external  / 1024 / 1024).toFixed(1)} MB`,
        },

        cache: getCacheStats(),
        pid:   process.pid,
    });
});

// ─── Serve React Frontend (production build) ──────────────────────────────────
// MUST come after all /api/* routes so API calls never return index.html.
if (hasFrontend) {
    // Static assets (JS, CSS, images) — 1-day browser cache
    app.use(express.static(CLIENT_DIST, {
        maxAge: '1d',
        etag:   true,
        setHeaders: (res, filePath) => {
            // Never cache index.html so new deployments take effect immediately
            if (filePath.endsWith('index.html')) {
                res.setHeader('Cache-Control', 'no-store');
            }
        },
    }));

    // SPA catch-all: every non-asset GET returns index.html for React Router.
    //
    // FIX (Express v5): Express v5 uses path-to-regexp v8, which requires all
    // wildcards to be named.  The old bare '*' pattern throws at startup:
    //   TypeError: Missing parameter name at index 1: *
    // Solution: use the named wildcard syntax '/{*splat}'.
    app.get('/{*splat}', (_req, res) => {
        res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    });

    logger.info(`Frontend: serving React build from ${CLIENT_DIST}`);
} else {
    // No frontend build yet — return a helpful JSON message at root
    app.get('/', (req, res) => res.json({
        status:  'ok',
        message: 'KOT API is running. Frontend not built yet.',
        hint:    'Run: cd client && npm install && npm run build',
        health:  '/health',
        api:     '/api',
    }));
}

// ─── Global Error Handler ─────────────────────────────────────────────────────
// Express v5: async route errors are automatically forwarded here without
// needing an explicit next(err) call.
// Checks both err.statusCode (custom errors) and err.status (set by Express).
app.use((err, req, res, next) => {
    logger.error('Unhandled route error', {
        error:     err.message,
        stack:     err.stack,
        method:    req.method,
        url:       req.originalUrl,
        requestId: req.requestId,
    });
    const statusCode = err.statusCode || err.status || 500;
    res.status(statusCode).json({
        success:   false,
        message:   err.message || 'Internal Server Error',
        requestId: req.requestId,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully...`);

    // Force-exit fallback in case something hangs.
    // .unref() lets the event loop exit naturally if everything closes before
    // the 10-second deadline without needing this timer to fire.
    const forceExit = setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
    forceExit.unref();

    server.close(() => logger.info('HTTP server closed'));
    io.close(()     => logger.info('Socket.IO server closed'));

    // Appwrite SDK is stateless, no pool to close

    clearTimeout(forceExit);
    process.exit(0);
};

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise Rejection', {
        reason: reason?.message || reason,
        stack:  reason?.stack,
    });
});

process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
    if (err.code === 'EADDRINUSE') process.exit(1);
});

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ─── Start ────────────────────────────────────────────────────────────────────
const startServer = async () => {
    try {
        logger.info('Initializing Appwrite Database connectivity...');
        
        // ── Schema Sync ───────────────────────────────────────────────────────────
        // Ensures all collections and attributes exist in the target database.
        // Useful after changing APPWRITE_DATABASE_ID in .env
        await syncSchema();

        // ── Backfill daily_analytics from all existing order data ─────────────
        backfillDailyAnalytics(false).then(({ processed, skipped }) => {
            logger.info(`[dailyAnalytics] Startup backfill complete`, { processed, skipped });
        }).catch(err => {
            logger.warn('[dailyAnalytics] Startup backfill failed', { error: err.message });
        });

        const PORT = parseInt(process.env.PORT) || 5005;
        server.listen(PORT, '0.0.0.0', () => {
            logger.info(`Server started on port ${PORT} (PID: ${process.pid})`);
            logger.info(`Ready: http://localhost:${PORT}`);
        });

        // Run the FIRST auto-release check now that DB is confirmed ready.
        // Subsequent checks run via setInterval above.
        autoReleaseExpiredReservations(io).catch((err) =>
            logger.warn('Initial auto-release check failed', { error: err.message })
        );
    } catch (err) {
        console.error('CRITICAL: Server startup failed', err);
        process.exit(1);
    }
};

startServer();
