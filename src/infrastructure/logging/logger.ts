/**
 * Structured Logging Service
 * Replaces direct console.log usage with a standardized interface.
 * Allows for future integration with external monitoring services (Sentry, LogRocket, etc.)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: Record<string, unknown>;
    error?: Error;
}

class Logger {
    private isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';

    private formatEntry(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): LogEntry {
        return {
            timestamp: new Date().toISOString(),
            level,
            message,
            context,
            error,
        };
    }

    debug(message: string, context?: Record<string, unknown>): void {
        if (this.isDevelopment) {
            console.debug(`[DEBUG] ${message}`, context || '');
        }
    }

    info(message: string, context?: Record<string, unknown>): void {
        const entry = this.formatEntry('info', message, context);
        console.info(`[INFO] ${entry.message}`, context || '');
        // Future: Send to analytics
    }

    warn(message: string, context?: Record<string, unknown>): void {
        const entry = this.formatEntry('warn', message, context);
        console.warn(`[WARN] ${entry.message}`, context || '');
    }

    error(message: string, error?: unknown, context?: Record<string, unknown>): void {
        const errObj = error instanceof Error ? error : new Error(String(error));
        const entry = this.formatEntry('error', message, context, errObj);

        console.error(`[ERROR] ${entry.message}`, errObj, context || '');
        // Future: Send to Sentry
    }
}

export const logger = new Logger();
