import { spawn } from 'child_process';
import path from 'path';
import { logger } from '../utils/logger.ts';

export interface SignalOutcome {
  signalId: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'STOPPED_OUT' | 'TOOK_PROFIT' | 'ACTIVE';
  exitPrice?: number;
  profitLossPercent?: number;
}

export class FeedbackTracker {
  private pythonPath: string;
  private scriptPath: string;

  constructor() {
    this.pythonPath = 'python';
    this.scriptPath = path.join(process.cwd(), 'ml', 'feedback_collector.py');
  }

  /**
   * Record a generated signal for feedback tracking
   */
  async recordSignal(signal: any): Promise<boolean> {
    try {
      const result = await this.callPython('record', signal);
      logger.info(`📝 Recorded signal: ${signal.id}`);
      return result.success;
    } catch (error) {
      logger.error('Failed to record signal:', error);
      return false;
    }
  }

  /**
   * Update signal outcome after it completes
   */
  async updateOutcome(outcome: SignalOutcome): Promise<boolean> {
    try {
      const result = await this.callPython('update', outcome);
      logger.info(`✓ Updated signal ${outcome.signalId}: ${outcome.outcome}`);
      return result.success;
    } catch (error) {
      logger.error('Failed to update signal outcome:', error);
      return false;
    }
  }

  /**
   * Get performance statistics
   */
  async getStats(symbol?: string, timeframe?: string): Promise<any> {
    try {
      const result = await this.callPython('stats', { symbol, timeframe });
      return result.data;
    } catch (error) {
      logger.error('Failed to get stats:', error);
      return null;
    }
  }

  /**
   * Call Python feedback collector script
   */
  private callPython(action: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const input = JSON.stringify({ action, data });
      
      const pythonProcess = spawn(this.pythonPath, [this.scriptPath], {
        cwd: path.join(process.cwd(), 'ml')
      });

      let stdout = '';
      let stderr = '';

      // Write input to stdin
      pythonProcess.stdin.write(input);
      pythonProcess.stdin.end();

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python script failed: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse output: ${stdout}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to spawn Python: ${error.message}`));
      });

      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('Feedback operation timeout'));
      }, 10000);
    });
  }

  /**
   * Check if a signal should be closed based on current price
   */
  shouldCloseSignal(
    signal: any,
    currentPrice: number
  ): { shouldClose: boolean; outcome: string; profitLoss: number } {
    const entryPrice = signal.entryPrice;
    const stopLoss = signal.stopLoss;
    const takeProfit = signal.takeProfit;
    const signalType = signal.signalType;

    if (signalType === 'BUY') {
      // Check stop loss
      if (currentPrice <= stopLoss) {
        const profitLoss = ((currentPrice - entryPrice) / entryPrice) * 100;
        return {
          shouldClose: true,
          outcome: 'STOPPED_OUT',
          profitLoss
        };
      }

      // Check take profit
      if (currentPrice >= takeProfit) {
        const profitLoss = ((currentPrice - entryPrice) / entryPrice) * 100;
        return {
          shouldClose: true,
          outcome: 'TOOK_PROFIT',
          profitLoss
        };
      }
    } else if (signalType === 'SELL') {
      // Check stop loss
      if (currentPrice >= stopLoss) {
        const profitLoss = ((entryPrice - currentPrice) / entryPrice) * 100;
        return {
          shouldClose: true,
          outcome: 'STOPPED_OUT',
          profitLoss
        };
      }

      // Check take profit
      if (currentPrice <= takeProfit) {
        const profitLoss = ((entryPrice - currentPrice) / entryPrice) * 100;
        return {
          shouldClose: true,
          outcome: 'TOOK_PROFIT',
          profitLoss
        };
      }
    }

    return {
      shouldClose: false,
      outcome: 'ACTIVE',
      profitLoss: 0
    };
  }
}

export const feedbackTracker = new FeedbackTracker();
