/**
 * 구조화된 로깅 시스템
 * 
 * 프로덕션 환경에서는 외부 로깅 서비스(예: Sentry, LogRocket)로 확장 가능
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  error?: Error;
  metadata?: Record<string, any>;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, error?: Error, metadata?: Record<string, any>): string {
    const timestamp = new Date().toISOString();
    const entry: LogEntry = {
      level,
      message,
      timestamp,
      error,
      metadata,
    };

    // 콘솔 출력
    const logMessage = `[${level}] ${timestamp} - ${message}`;
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, metadata || '');
        break;
      case LogLevel.INFO:
        console.log(logMessage, metadata || '');
        break;
      case LogLevel.WARN:
        console.warn(logMessage, metadata || '');
        break;
      case LogLevel.ERROR:
        console.error(logMessage, error || '', metadata || '');
        // 프로덕션에서는 여기서 외부 로깅 서비스로 전송
        // 예: Sentry.captureException(error, { extra: metadata });
        break;
    }

    return logMessage;
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.formatMessage(LogLevel.DEBUG, message, undefined, metadata);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.formatMessage(LogLevel.INFO, message, undefined, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.formatMessage(LogLevel.WARN, message, undefined, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.formatMessage(LogLevel.ERROR, message, error, metadata);
  }
}

// 싱글톤 인스턴스
export const logger = new Logger();

