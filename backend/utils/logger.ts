import { createWriteStream, WriteStream } from 'fs';
import { join } from 'path';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: any;
}

export class Logger {
  private logFile: WriteStream | null = null;
  private logLevel: LogLevel;
  private enableFileLogging: boolean;

  constructor() {
    this.logLevel = process.env.LOG_LEVEL
      ? LogLevel[process.env.LOG_LEVEL.toUpperCase() as keyof typeof LogLevel]
      : LogLevel.INFO;

    this.enableFileLogging = process.env.ENABLE_FILE_LOGGING === 'true';

    if (this.enableFileLogging) {
      this.initializeFileLogging();
    }
  }

  private initializeFileLogging(): void {
    try {
      const logDir = process.env.LOG_DIR || 'logs';
      const logFile = join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`);

      this.logFile = createWriteStream(logFile, { flags: 'a' });

      // Handle file stream errors
      this.logFile.on('error', (error) => {
        console.error('Log file error:', error);
      });
    } catch (error) {
      console.error('Failed to initialize file logging:', error);
      this.enableFileLogging = false;
    }
  }

  private formatMessage(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp;
    const message = entry.message;

    let logLine = `[${timestamp}] [${levelName}] ${message}`;

    if (entry.meta) {
      logLine += ` | ${JSON.stringify(entry.meta)}`;
    }

    return logLine;
  }

  private writeLog(level: LogLevel, message: string, meta?: any): void {
    if (level > this.logLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
    };

    const formattedMessage = this.formatMessage(entry);

    // Console output with colors
    switch (level) {
      case LogLevel.ERROR:
        console.error(`\x1b[31m${formattedMessage}\x1b[0m`);
        break;
      case LogLevel.WARN:
        console.warn(`\x1b[33m${formattedMessage}\x1b[0m`);
        break;
      case LogLevel.INFO:
        console.log(`\x1b[36m${formattedMessage}\x1b[0m`);
        break;
      case LogLevel.DEBUG:
        console.debug(`\x1b[37m${formattedMessage}\x1b[0m`);
        break;
    }

    // File output
    if (this.enableFileLogging && this.logFile) {
      this.logFile.write(formattedMessage + '\n');
    }
  }

  error(message: string, meta?: any): void {
    this.writeLog(LogLevel.ERROR, message, meta);
  }

  warn(message: string, meta?: any): void {
    this.writeLog(LogLevel.WARN, message, meta);
  }

  info(message: string, meta?: any): void {
    this.writeLog(LogLevel.INFO, message, meta);
  }

  debug(message: string, meta?: any): void {
    this.writeLog(LogLevel.DEBUG, message, meta);
  }

  // Performance logging
  time(label: string): void {
    console.time(label);
    this.debug(`Timer started: ${label}`);
  }

  timeEnd(label: string): void {
    console.timeEnd(label);
  }

  // Request logging
  request(req: any, res: any, next: any): void {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
      };

      if (res.statusCode >= 400) {
        this.warn(`HTTP ${res.statusCode} ${req.method} ${req.url}`, logData);
      } else {
        this.info(`HTTP ${res.statusCode} ${req.method} ${req.url}`, logData);
      }
    });

    next();
  }

  // Database query logging
  query(query: string, params?: any, duration?: number): void {
    this.debug('Database query', {
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      params: params ? JSON.stringify(params).substring(0, 100) : null,
      duration: duration ? `${duration}ms` : null,
    });
  }

  // WebSocket event logging
  websocket(event: string, socketId: string, userId?: string, data?: any): void {
    this.debug(`WebSocket ${event}`, {
      socketId,
      userId,
      data: data ? JSON.stringify(data).substring(0, 200) : null,
    });
  }

  // Error logging with stack trace
  errorWithStack(message: string, error: Error, meta?: any): void {
    this.writeLog(LogLevel.ERROR, message, {
      error: error.message,
      stack: error.stack,
      ...meta,
    });
  }

  // Graceful shutdown
  close(): void {
    if (this.logFile) {
      this.logFile.end();
    }
  }
}

// Singleton instance
export const logger = new Logger();

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  logger.close();
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  logger.close();
});

// Uncaught exception handling
process.on('uncaughtException', (error) => {
  logger.errorWithStack('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason?.toString() || 'Unknown reason',
    promise: promise?.toString() || 'Unknown promise',
  });
  process.exit(1);
});