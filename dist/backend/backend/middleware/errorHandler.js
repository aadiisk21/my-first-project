"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.CustomError = void 0;
class CustomError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.CustomError = CustomError;
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    // Log error
    console.error(`❌ Error ${err.name}:`, {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });
    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map((val) => val.message).join(', ');
        error = new CustomError(message, 400);
    }
    // Mongoose duplicate key error
    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        error = new CustomError(message, 400);
    }
    // Mongoose cast error
    if (err.name === 'CastError') {
        const message = 'Invalid resource ID';
        error = new CustomError(message, 400);
    }
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token';
        error = new CustomError(message, 401);
    }
    if (err.name === 'TokenExpiredError') {
        const message = 'Token expired';
        error = new CustomError(message, 401);
    }
    // Database connection errors
    if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
        const message = 'Database connection error';
        error = new CustomError(message, 503);
    }
    // Rate limiting errors
    if (err.name === 'RateLimitError') {
        const message = 'Too many requests, please try again later';
        error = new CustomError(message, 429);
    }
    res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && {
            stack: error.stack,
            details: {
                name: error.name,
                statusCode: error.statusCode,
                isOperational: error.isOperational
            }
        })
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map