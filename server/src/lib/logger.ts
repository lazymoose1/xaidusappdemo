import { env } from '../config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const currentLevel: LogLevel = env.NODE_ENV === 'production' ? 'info' : 'debug';

function shouldLog(level: LogLevel) {
  return levelPriority[level] >= levelPriority[currentLevel];
}

function write(level: LogLevel, data?: unknown, message?: string) {
  if (!shouldLog(level)) return;

  const timestamp = new Date().toISOString();
  const parts = [`[${timestamp}]`, level.toUpperCase()];

  if (message) {
    parts.push(message);
  }

  const line = parts.join(' ');

  if (data === undefined) {
    console[level](line);
    return;
  }

  console[level](line, data);
}

function normalizeArgs(first?: unknown, second?: unknown) {
  if (typeof first === 'string') {
    return { data: undefined, message: first };
  }

  if (typeof second === 'string') {
    return { data: first, message: second };
  }

  return { data: first, message: undefined };
}

export const logger = {
  debug(first?: unknown, second?: unknown) {
    const { data, message } = normalizeArgs(first, second);
    write('debug', data, message);
  },
  info(first?: unknown, second?: unknown) {
    const { data, message } = normalizeArgs(first, second);
    write('info', data, message);
  },
  warn(first?: unknown, second?: unknown) {
    const { data, message } = normalizeArgs(first, second);
    write('warn', data, message);
  },
  error(first?: unknown, second?: unknown) {
    const { data, message } = normalizeArgs(first, second);
    write('error', data, message);
  },
};
