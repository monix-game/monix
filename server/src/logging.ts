import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const level = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

const transport = pino.transport({
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'SYS:d mmm h:MMtt',
    ignore: 'pid,hostname,component',
    messageFormat: '{component}: {msg}',
  },
});

export const logger = pino(
  {
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  transport
);

/**
 * Creates a child logger with a specific component name.
 * @param name The name of the component
 * @returns A child logger instance
 */
export function createLogger(name: string) {
  return logger.child({ component: name });
}
