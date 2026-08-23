/**
 * Structured logger using Pino.
 *
 * - In production: JSON logs (parseable by log aggregators)
 * - In development: pretty-printed console logs
 * - In test: silent
 */
const pino = require('pino');

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  ...(isTest ? { silent: true } : {}),
  transport: !isProd && !isTest ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
    },
  } : undefined,
});

module.exports = logger;
