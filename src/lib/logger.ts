/**
 * Logger Utility
 * Provides conditional logging based on environment
 * Only logs in development mode to prevent console pollution in production
 */

const isDev = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface LoggerConfig {
    enabled: boolean;
    showTimestamp: boolean;
    showLevel: boolean;
}

const config: LoggerConfig = {
    enabled: isDev,
    showTimestamp: true,
    showLevel: true,
};

/**
 * Format timestamp for logs
 */
const getTimestamp = (): string => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
};

/**
 * Format log message with optional timestamp and level
 */
const formatMessage = (level: LogLevel, args: unknown[]): unknown[] => {
    const parts: string[] = [];

    if (config.showTimestamp) {
        parts.push(`[${getTimestamp()}]`);
    }

    if (config.showLevel) {
        parts.push(`[${level.toUpperCase()}]`);
    }

    return parts.length > 0 ? [...parts, ...args] : args;
};

/**
 * Logger object with conditional logging methods
 */
export const logger = {
    /**
     * Log general information (development only)
     */
    log: (...args: unknown[]) => {
        if (config.enabled) {
            console.log(...formatMessage('log', args));
        }
    },

    /**
     * Log informational messages (development only)
     */
    info: (...args: unknown[]) => {
        if (config.enabled) {
            console.info(...formatMessage('info', args));
        }
    },

    /**
     * Log warning messages (always shown)
     */
    warn: (...args: unknown[]) => {
        console.warn(...formatMessage('warn', args));
    },

    /**
     * Log error messages (always shown)
     */
    error: (...args: unknown[]) => {
        console.error(...formatMessage('error', args));
    },

    /**
     * Log debug messages (development only)
     */
    debug: (...args: unknown[]) => {
        if (config.enabled) {
            console.debug(...formatMessage('debug', args));
        }
    },

    /**
     * Group logs together
     */
    group: (label: string) => {
        if (config.enabled) {
            console.group(label);
        }
    },

    /**
     * End log group
     */
    groupEnd: () => {
        if (config.enabled) {
            console.groupEnd();
        }
    },

    /**
     * Log a table (development only)
     */
    table: (data: unknown) => {
        if (config.enabled) {
            console.table(data);
        }
    },

    /**
     * Start a timer
     */
    time: (label: string) => {
        if (config.enabled) {
            console.time(label);
        }
    },

    /**
     * End a timer
     */
    timeEnd: (label: string) => {
        if (config.enabled) {
            console.timeEnd(label);
        }
    },

    /**
     * Configure logger settings
     */
    configure: (newConfig: Partial<LoggerConfig>) => {
        Object.assign(config, newConfig);
    },

    /**
     * Check if logger is enabled
     */
    isEnabled: () => config.enabled,
};

/**
 * Production-safe error logger
 * Always logs errors but sanitizes sensitive data
 */
export const logError = (
    error: Error | unknown,
    context?: string,
    additionalData?: Record<string, unknown>
) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    if (isProduction) {
        // In production, log only sanitized error info
        // You can send this to an error tracking service (Sentry, LogRocket, etc.)
        console.error('Error:', {
            message: errorMessage,
            context,
            timestamp: new Date().toISOString(),
            // Don't include stack or additional data in production
        });
    } else {
        // In development, log everything
        console.group(`🔴 Error${context ? ` in ${context}` : ''}`);
        console.error('Message:', errorMessage);
        if (errorStack) console.error('Stack:', errorStack);
        if (additionalData) console.error('Additional Data:', additionalData);
        console.groupEnd();
    }
};

/**
 * Auth-specific logger with emoji prefixes
 */
export const authLogger = {
    init: (...args: unknown[]) => logger.log('🔐', ...args),
    login: (...args: unknown[]) => logger.log('🔑', ...args),
    logout: (...args: unknown[]) => logger.log('🚪', ...args),
    signup: (...args: unknown[]) => logger.log('📝', ...args),
    success: (...args: unknown[]) => logger.log('✅', ...args),
    warning: (...args: unknown[]) => logger.warn('⚠️', ...args),
    error: (...args: unknown[]) => logger.error('❌', ...args),
    info: (...args: unknown[]) => logger.info('ℹ️', ...args),
    masterKey: (...args: unknown[]) => logger.log('⚡', ...args),
};

/**
 * API-specific logger
 */
export const apiLogger = {
    request: (method: string, url: string, data?: unknown) => {
        logger.group(`📤 API Request: ${method} ${url}`);
        if (data) logger.log('Data:', data);
        logger.groupEnd();
    },

    response: (method: string, url: string, status: number, data?: unknown) => {
        const emoji = status >= 200 && status < 300 ? '✅' : '❌';
        logger.group(`${emoji} API Response: ${method} ${url} (${status})`);
        if (data) logger.log('Data:', data);
        logger.groupEnd();
    },

    error: (method: string, url: string, error: unknown) => {
        logger.group(`🔴 API Error: ${method} ${url}`);
        logger.error('Error:', error);
        logger.groupEnd();
    },
};

export default logger;
