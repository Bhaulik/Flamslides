type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  level: LogLevel;
  timestamp: boolean;
}

class Logger {
  private options: LoggerOptions = {
    level: 'info',
    timestamp: true
  };

  private readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.options.level];
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = this.options.timestamp ? `[${new Date().toISOString()}]` : '';
    const dataString = data ? `\n${JSON.stringify(data, null, 2)}` : '';
    return `${timestamp} [${level.toUpperCase()}] ${message}${dataString}`;
  }

  setOptions(options: Partial<LoggerOptions>) {
    this.options = { ...this.options, ...options };
  }

  debug(message: string, data?: any) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: any) {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: any) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  error(message: string, data?: any) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, data));
    }
  }

  // Development helper to temporarily enable debug logs
  withDebug<T>(fn: () => T): T {
    const previousLevel = this.options.level;
    this.options.level = 'debug';
    try {
      return fn();
    } finally {
      this.options.level = previousLevel;
    }
  }
}

// Create a singleton instance
export const logger = new Logger();

// Set default options based on environment
if (process.env.NODE_ENV === 'development') {
  logger.setOptions({ level: 'debug' });
} else {
  logger.setOptions({ level: 'info' });
} 