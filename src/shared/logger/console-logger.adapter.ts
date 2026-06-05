import { ILogger } from './logger.interface';
import { EnvConfig } from '../config/environment.config';

export class ConsoleLogger implements ILogger {
  constructor(private readonly config: EnvConfig) {}

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.log(`[INFO] ${message}`, context ? JSON.stringify(context) : '');
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, context ? JSON.stringify(context) : '');
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    console.error(`[ERROR] ${message}`, context ? JSON.stringify(context) : '');
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, context ? JSON.stringify(context) : '');
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevel = levels.indexOf(this.config.LOG_LEVEL);
    const messageLevel = levels.indexOf(level);
    return messageLevel >= currentLevel;
  }
}
