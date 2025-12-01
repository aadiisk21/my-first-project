"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = exports.LogLevel = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARN"] = 1] = "WARN";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor() {
        this.logFile = null;
        this.logLevel = process.env.LOG_LEVEL
            ? LogLevel[process.env.LOG_LEVEL.toUpperCase()]
            : LogLevel.INFO;
        this.enableFileLogging = process.env.ENABLE_FILE_LOGGING === 'true';
        if (this.enableFileLogging) {
            this.initializeFileLogging();
        }
    }
    initializeFileLogging() {
        try {
            const logDir = process.env.LOG_DIR || 'logs';
            const logFile = (0, path_1.join)(logDir, `app-${new Date().toISOString().split('T')[0]}.log`);
            this.logFile = (0, fs_1.createWriteStream)(logFile, { flags: 'a' });
            // Handle file stream errors
            this.logFile.on('error', (error) => {
                console.error('Log file error:', error);
            });
        }
        catch (error) {
            console.error('Failed to initialize file logging:', error);
            this.enableFileLogging = false;
        }
    }
    formatMessage(entry) {
        const levelName = LogLevel[entry.level];
        const timestamp = entry.timestamp;
        const message = entry.message;
        let logLine = `[${timestamp}] [${levelName}] ${message}`;
        if (entry.meta) {
            logLine += ` | ${JSON.stringify(entry.meta)}`;
        }
        return logLine;
    }
    writeLog(level, message, meta) {
        if (level > this.logLevel) {
            return;
        }
        const entry = {
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
    error(message, meta) {
        this.writeLog(LogLevel.ERROR, message, meta);
    }
    warn(message, meta) {
        this.writeLog(LogLevel.WARN, message, meta);
    }
    info(message, meta) {
        this.writeLog(LogLevel.INFO, message, meta);
    }
    debug(message, meta) {
        this.writeLog(LogLevel.DEBUG, message, meta);
    }
    // Performance logging
    time(label) {
        console.time(label);
        this.debug(`Timer started: ${label}`);
    }
    timeEnd(label) {
        console.timeEnd(label);
    }
    // Request logging
    request(req, res, next) {
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
            }
            else {
                this.info(`HTTP ${res.statusCode} ${req.method} ${req.url}`, logData);
            }
        });
        next();
    }
    // Database query logging
    query(query, params, duration) {
        this.debug('Database query', {
            query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
            params: params ? JSON.stringify(params).substring(0, 100) : null,
            duration: duration ? `${duration}ms` : null,
        });
    }
    // WebSocket event logging
    websocket(event, socketId, userId, data) {
        this.debug(`WebSocket ${event}`, {
            socketId,
            userId,
            data: data ? JSON.stringify(data).substring(0, 200) : null,
        });
    }
    // Error logging with stack trace
    errorWithStack(message, error, meta) {
        this.writeLog(LogLevel.ERROR, message, {
            error: error.message,
            stack: error.stack,
            ...meta,
        });
    }
    // Graceful shutdown
    close() {
        if (this.logFile) {
            this.logFile.end();
        }
    }
}
exports.Logger = Logger;
// Singleton instance
exports.logger = new Logger();
// Graceful shutdown
process.on('SIGINT', () => {
    exports.logger.info('Received SIGINT, shutting down gracefully');
    exports.logger.close();
});
process.on('SIGTERM', () => {
    exports.logger.info('Received SIGTERM, shutting down gracefully');
    exports.logger.close();
});
// Uncaught exception handling
process.on('uncaughtException', (error) => {
    exports.logger.errorWithStack('Uncaught Exception', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    exports.logger.error('Unhandled Rejection', {
        reason: (reason === null || reason === void 0 ? void 0 : reason.toString()) || 'Unknown reason',
        promise: (promise === null || promise === void 0 ? void 0 : promise.toString()) || 'Unknown promise',
    });
    process.exit(1);
});
//# sourceMappingURL=logger.js.map