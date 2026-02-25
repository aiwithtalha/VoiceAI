/**
 * Logger Utility
 * Structured logging for the voice engine service
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: Record<string, unknown>;
}

export class Logger {
  private static logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  
  private readonly component: string;
  
  constructor(component: string) {
    this.component = component;
  }
  
  /**
   * Set global log level
   */
  static setLogLevel(level: LogLevel): void {
    Logger.logLevel = level;
  }
  
  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    return levels[level] >= levels[Logger.logLevel];
  }
  
  /**
   * Format and output log entry
   */
  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) {
      return;
    }
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      message,
      data
    };
    
    const output = JSON.stringify(entry);
    
    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }
  
  /**
   * Log debug message
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }
  
  /**
   * Log info message
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }
  
  /**
   * Log warning message
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }
  
  /**
   * Log error message
   */
  error(message: string, data?: Record<string, unknown>): void {
    this.log('error', message, data);
  }
}

/**
 * Create a child logger with additional context
 */
export function createChildLogger(parent: Logger, context: string): Logger {
  return new Logger(`${parent['component']}.${context}`);
}
