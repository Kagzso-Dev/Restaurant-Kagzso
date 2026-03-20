/**
 * Kagzso AI Controller
 * Works fully offline — no API key required.
 * All responses are handled locally by the frontend AIContext.
 * This endpoint is kept for future upgrade compatibility.
 */
exports.chat = async (_req, res) => {
    res.status(200).json({
        text: "I'm running in offline mode. Responses are handled locally.",
        sender: "ai",
        offline: true
    });
};
