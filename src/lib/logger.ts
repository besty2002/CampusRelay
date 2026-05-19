type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isBrowser = typeof window !== 'undefined';

const isDebugEnabled = () => {
  if (import.meta.env.DEV) return true;
  if (!isBrowser) return false;
  return window.localStorage.getItem('campusrelay:debug') === 'true';
};

const write = (level: LogLevel, scope: string, ...args: unknown[]) => {
  if (level === 'debug' && !isDebugEnabled()) return;
  if ((level === 'info' || level === 'warn') && !import.meta.env.DEV && !isDebugEnabled()) return;

  const prefix = `[CampusRelay:${scope}]`;
  const method = level === 'debug' ? console.debug : console[level];
  method(prefix, ...args);
};

export const logger = {
  debug: (scope: string, ...args: unknown[]) => write('debug', scope, ...args),
  info: (scope: string, ...args: unknown[]) => write('info', scope, ...args),
  warn: (scope: string, ...args: unknown[]) => write('warn', scope, ...args),
  error: (scope: string, ...args: unknown[]) => write('error', scope, ...args),
};
