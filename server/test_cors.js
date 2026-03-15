const express = require('express');
const cors = require('cors');
const app = express();

const allowedOrigins = ["http://localhost:5173"];
const corsOriginFn = (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(null, false);
};

app.use(cors({ origin: corsOriginFn, credentials: true }));
app.get('/', (req, res) => res.json({ ok: true }));

const server = app.listen(5006, () => {
    console.log('Test OK');
    server.close();
});
