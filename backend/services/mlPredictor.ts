import { spawn } from 'child_process';
import path from 'path';
import { logger } from '../utils/logger.ts';

export interface MLPrediction {
  success: boolean;
  signalType: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  mlPrediction: {
    signal: string;
    confidence: number;
    probabilities: {
      SELL: number;
      HOLD: number;
      BUY: number;
    };
  };
  aiRationale: string;
  error?: string;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class MLPredictor {
  private pythonPath: string;
  private scriptPath: string;
  private modelPath: string;

  constructor(symbol: string = 'BTCUSDT', timeframe: string = '1h') {
    // Use python from PATH
    this.pythonPath = 'python';
    
    // Path to signal_generator.py
    this.scriptPath = path.join(process.cwd(), 'ml', 'signal_generator.py');
    
    // Path to trained model
    this.modelPath = path.join(
      process.cwd(),
      'ml',
      'models',
      `${symbol.toLowerCase()}_${timeframe}_ensemble.pkl`
    );
    
    logger.info(`MLPredictor initialized with model: ${this.modelPath}`);
  }

  /**
   * Generate ML prediction for given market data
   * @param candles - Array of OHLCV candles (minimum 100 required)
   * @returns ML prediction result
   */
  async predict(candles: CandleData[]): Promise<MLPrediction> {
    try {
      // Validate input
      if (!candles || candles.length < 100) {
        return {
          success: false,
          signalType: 'HOLD',
          confidence: 0,
          mlPrediction: {
            signal: 'HOLD',
            confidence: 0,
            probabilities: { SELL: 0, HOLD: 1, BUY: 0 }
          },
          aiRationale: 'Insufficient data for ML prediction (minimum 100 candles required)',
          error: 'Insufficient data'
        };
      }

      // Prepare input data
      const inputData = {
        data: candles.map(c => ({
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume
        })),
        model_path: this.modelPath
      };

      // Call Python ML script
      const result = await this.callPythonScript(inputData);

      return result;
    } catch (error) {
      logger.error('ML prediction error:', error);
      return {
        success: false,
        signalType: 'HOLD',
        confidence: 0,
        mlPrediction: {
          signal: 'HOLD',
          confidence: 0,
          probabilities: { SELL: 0, HOLD: 1, BUY: 0 }
        },
        aiRationale: 'ML prediction failed',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Call Python script to generate ML prediction
   * @param inputData - Input data for Python script
   * @returns Parsed ML prediction result
   */
  private callPythonScript(inputData: any): Promise<MLPrediction> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(this.pythonPath, [
        this.scriptPath,
        JSON.stringify(inputData)
      ]);

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          logger.error(`Python script exited with code ${code}`);
          logger.error(`stderr: ${stderr}`);
          reject(new Error(`Python script failed: ${stderr}`));
          return;
        }

        try {
          // Parse JSON output from Python
          const result = JSON.parse(stdout.trim());
          
          if (!result.success) {
            logger.warn('ML prediction unsuccessful:', result.error);
          }

          resolve(result);
        } catch (error) {
          logger.error('Failed to parse ML output:', stdout);
          reject(new Error(`Failed to parse ML output: ${error}`));
        }
      });

      // Handle spawn errors
      pythonProcess.on('error', (error) => {
        logger.error('Failed to spawn Python process:', error);
        reject(new Error(`Failed to spawn Python: ${error.message}`));
      });

      // Set timeout (30 seconds)
      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('ML prediction timeout'));
      }, 30000);
    });
  }

  /**
   * Check if ML model is available
   * @returns True if model file exists
   */
  isModelAvailable(): boolean {
    try {
      const fs = require('fs');
      return fs.existsSync(this.modelPath);
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const mlPredictor = new MLPredictor('BTCUSDT', '1h');
