import express from 'express';
import { signalRateLimiter } from '../middleware/rateLimiter.ts';
import { CustomError } from '../middleware/errorHandler.ts';
import type { TradingSignal } from '../../src/types/index';
import { SignalGenerator } from '../services/signalGenerator.ts';

const router = express.Router();
const signalGenerator = new SignalGenerator();

// Get all signals
router.get('/', signalRateLimiter, async (req, res) => {
  try {
    const {
      page = '1',
      limit = '20',
      pair,
      signalType,
      confidenceMin,
      riskLevel,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    const options = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      pair: pair as string,
      signalType: signalType as 'BUY' | 'SELL' | 'HOLD',
      confidenceMin: confidenceMin ? parseInt(confidenceMin as string) : undefined,
      riskLevel: riskLevel as 'LOW' | 'MEDIUM' | 'HIGH',
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
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
  } catch (error) {
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
      throw new CustomError('Signal not found', 404);
    }

    res.json({
      success: true,
      data: {
        signal,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const statusCode = error instanceof CustomError ? error.statusCode : 500;
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch signal'
    });
  }
});

// Generate new signal
router.post('/generate', signalRateLimiter, async (req, res) => {
  try {
    const {
      symbols,
      timeframes = ['1h'],
      riskTolerance = 'MODERATE',
      minConfidence = 70
    } = req.body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      throw new CustomError('Symbols array is required', 400);
    }

    if (!timeframes || !Array.isArray(timeframes) || timeframes.length === 0) {
      throw new CustomError('Timeframes array is required', 400);
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
  } catch (error) {
    const statusCode = error instanceof CustomError ? error.statusCode : 500;
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
      throw new CustomError('Signal not found', 404);
    }

    res.json({
      success: true,
      data: {
        signal: updatedSignal,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const statusCode = error instanceof CustomError ? error.statusCode : 500;
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
      throw new CustomError('Signal not found', 404);
    }

    res.json({
      success: true,
      data: {
        message: 'Signal deleted successfully',
        id,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const statusCode = error instanceof CustomError ? error.statusCode : 500;
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete signal'
    });
  }
});

// Get signal performance statistics
router.get('/stats/performance', async (req, res) => {
  try {
    const {
      timeframe = '7d',
      pair,
      signalType,
      minConfidence = '70'
    } = req.query;

    const stats = await signalGenerator.getSignalStats({
      timeframe: timeframe as string,
      pair: pair as string,
      signalType: signalType as 'BUY' | 'SELL' | 'HOLD',
      minConfidence: parseInt(minConfidence as string)
    });

    res.json({
      success: true,
      data: {
        ...stats,
        timeframe,
        filters: {
          pair,
          signalType,
          minConfidence: parseInt(minConfidence as string)
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
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

    const accuracyData = await signalGenerator.getAccuracyByConfidence(timeframe as string);

    res.json({
      success: true,
      data: {
        accuracy: accuracyData,
        timeframe,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch accuracy data'
    });
  }
});

// Get active signals (not expired)
router.get('/active', signalRateLimiter, async (req, res) => {
  try {
    const {
      pair,
      signalType,
      limit = '50'
    } = req.query;

    const activeSignals = await signalGenerator.getActiveSignals({
      pair: pair as string,
      signalType: signalType as 'BUY' | 'SELL' | 'HOLD',
      limit: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: {
        signals: activeSignals,
        count: activeSignals.length,
        filters: {
          pair,
          signalType,
          limit: parseInt(limit as string)
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
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
    const {
      timeframe = '7d',
      limit = '100',
      signalType
    } = req.query;

    const signals = await signalGenerator.getSignalsForPair(pair, {
      timeframe: timeframe as string,
      limit: parseInt(limit as string),
      signalType: signalType as 'BUY' | 'SELL' | 'HOLD'
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
          limit: parseInt(limit as string)
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
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
      throw new CustomError('Valid outcome (SUCCESS, FAILURE, PARTIAL) is required', 400);
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
  } catch (error) {
    const statusCode = error instanceof CustomError ? error.statusCode : 500;
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate signal'
    });
  }
});

export default router;