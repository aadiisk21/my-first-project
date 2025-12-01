"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const rateLimiter_1 = require("../middleware/rateLimiter");
const errorHandler_1 = require("../middleware/errorHandler");
const signalGenerator_1 = require("../services/signalGenerator");
const router = express_1.default.Router();
const signalGenerator = new signalGenerator_1.SignalGenerator();
// Get all signals
router.get('/', rateLimiter_1.signalRateLimiter, async (req, res) => {
    try {
        const { page = '1', limit = '20', pair, signalType, confidenceMin, riskLevel, sortBy = 'timestamp', sortOrder = 'desc' } = req.query;
        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            pair: pair,
            signalType: signalType,
            confidenceMin: confidenceMin ? parseInt(confidenceMin) : undefined,
            riskLevel: riskLevel,
            sortBy: sortBy,
            sortOrder: sortOrder
        };
        const signals = await signalGenerator.getSignals(options);
        res.json({
            success: true,
            data: {
                signals: signals.data,
                pagination: {
                    page: options.page,
                    limit: options.limit,
                    total: signals.total,
                    totalPages: Math.ceil(signals.total / options.limit)
                },
                filters: options,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch signals'
        });
    }
});
// Get signal by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const signal = await signalGenerator.getSignalById(id);
        if (!signal) {
            throw new errorHandler_1.CustomError('Signal not found', 404);
        }
        res.json({
            success: true,
            data: {
                signal,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        const statusCode = error instanceof errorHandler_1.CustomError ? error.statusCode : 500;
        res.status(statusCode).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch signal'
        });
    }
});
// Generate new signal
router.post('/generate', rateLimiter_1.signalRateLimiter, async (req, res) => {
    try {
        const { symbols, timeframes = ['1h'], riskTolerance = 'MODERATE', minConfidence = 70 } = req.body;
        if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
            throw new errorHandler_1.CustomError('Symbols array is required', 400);
        }
        if (!timeframes || !Array.isArray(timeframes) || timeframes.length === 0) {
            throw new errorHandler_1.CustomError('Timeframes array is required', 400);
        }
        const generatedSignals = await signalGenerator.generateSignals({
            symbols,
            timeframes,
            riskTolerance,
            minConfidence
        });
        res.json({
            success: true,
            data: {
                signals: generatedSignals,
                generated: generatedSignals.length,
                request: {
                    symbols,
                    timeframes,
                    riskTolerance,
                    minConfidence
                },
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        const statusCode = error instanceof errorHandler_1.CustomError ? error.statusCode : 500;
        res.status(statusCode).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate signals'
        });
    }
});
// Update signal
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const updatedSignal = await signalGenerator.updateSignal(id, updates);
        if (!updatedSignal) {
            throw new errorHandler_1.CustomError('Signal not found', 404);
        }
        res.json({
            success: true,
            data: {
                signal: updatedSignal,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        const statusCode = error instanceof errorHandler_1.CustomError ? error.statusCode : 500;
        res.status(statusCode).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update signal'
        });
    }
});
// Delete signal
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await signalGenerator.deleteSignal(id);
        if (!deleted) {
            throw new errorHandler_1.CustomError('Signal not found', 404);
        }
        res.json({
            success: true,
            data: {
                message: 'Signal deleted successfully',
                id,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        const statusCode = error instanceof errorHandler_1.CustomError ? error.statusCode : 500;
        res.status(statusCode).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete signal'
        });
    }
});
// Get signal performance statistics
router.get('/stats/performance', async (req, res) => {
    try {
        const { timeframe = '7d', pair, signalType, minConfidence = '70' } = req.query;
        const stats = await signalGenerator.getSignalStats({
            timeframe: timeframe,
            pair: pair,
            signalType: signalType,
            minConfidence: parseInt(minConfidence)
        });
        res.json({
            success: true,
            data: {
                ...stats,
                timeframe,
                filters: {
                    pair,
                    signalType,
                    minConfidence: parseInt(minConfidence)
                },
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch signal statistics'
        });
    }
});
// Get signal accuracy by confidence level
router.get('/stats/accuracy', async (req, res) => {
    try {
        const { timeframe = '30d' } = req.query;
        const accuracyData = await signalGenerator.getAccuracyByConfidence(timeframe);
        res.json({
            success: true,
            data: {
                accuracy: accuracyData,
                timeframe,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch accuracy data'
        });
    }
});
// Get active signals (not expired)
router.get('/active', rateLimiter_1.signalRateLimiter, async (req, res) => {
    try {
        const { pair, signalType, limit = '50' } = req.query;
        const activeSignals = await signalGenerator.getActiveSignals({
            pair: pair,
            signalType: signalType,
            limit: parseInt(limit)
        });
        res.json({
            success: true,
            data: {
                signals: activeSignals,
                count: activeSignals.length,
                filters: {
                    pair,
                    signalType,
                    limit: parseInt(limit)
                },
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch active signals'
        });
    }
});
// Get signals for a specific pair
router.get('/pair/:pair', async (req, res) => {
    try {
        const { pair } = req.params;
        const { timeframe = '7d', limit = '100', signalType } = req.query;
        const signals = await signalGenerator.getSignalsForPair(pair, {
            timeframe: timeframe,
            limit: parseInt(limit),
            signalType: signalType
        });
        res.json({
            success: true,
            data: {
                pair,
                signals,
                count: signals.length,
                timeframe,
                filters: {
                    signalType,
                    limit: parseInt(limit)
                },
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch signals for pair'
        });
    }
});
// Validate signal (mark as successful/failed)
router.post('/:id/validate', async (req, res) => {
    try {
        const { id } = req.params;
        const { outcome, actualEntryPrice, actualExitPrice, notes } = req.body;
        if (!outcome || !['SUCCESS', 'FAILURE', 'PARTIAL'].includes(outcome)) {
            throw new errorHandler_1.CustomError('Valid outcome (SUCCESS, FAILURE, PARTIAL) is required', 400);
        }
        const validatedSignal = await signalGenerator.validateSignal(id, {
            outcome,
            actualEntryPrice,
            actualExitPrice,
            notes
        });
        res.json({
            success: true,
            data: {
                signal: validatedSignal,
                validation: {
                    outcome,
                    actualEntryPrice,
                    actualExitPrice,
                    notes
                },
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        const statusCode = error instanceof errorHandler_1.CustomError ? error.statusCode : 500;
        res.status(statusCode).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to validate signal'
        });
    }
});
exports.default = router;
//# sourceMappingURL=signals.js.map