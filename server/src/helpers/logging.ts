import { discordClient } from '../constants';
import { LogEntry, LogLevel } from '../../common/models/logEntry';
import { DiscordEmbed } from './discord';
import { createLogEntry } from '../db';
import type { Request } from 'express';
import { titleCase } from '../../common/math';

const colorMap: Record<LogLevel, number> = {
  info: 0x3498db, // blue
  warn: 0xf1c40f, // yellow
  error: 0xe74c3c, // red
};

type LogFieldInput = {
  key: string;
  value?: string | number | boolean | null;
  inline?: boolean;
};

export function getRequestIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].split(',')[0]?.trim();
  }

  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim() !== '') {
    return realIp.trim();
  }

  return req.ip || req.socket.remoteAddress || undefined;
}

export function buildRequestLogData(req: Request, fields: LogFieldInput[] = []) {
  const data: NonNullable<LogEntry['data']> = [];

  const pushField = (field: LogFieldInput) => {
    if (field.value === undefined || field.value === null) return;
    const value = String(field.value);
    if (value.trim() === '') return;

    field.key = titleCase(field.key);

    data.push({
      key: field.key,
      value,
      inline: field.inline ?? true,
    });
  };

  pushField({ key: 'method', value: req.method });
  pushField({ key: 'path', value: req.originalUrl });
  pushField({ key: 'ip', value: getRequestIp(req) });
  pushField({
    key: 'userAgent',
    value: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    inline: false,
  });

  fields.forEach(pushField);

  return data.length > 0 ? data : undefined;
}

export async function logToDiscord(entry: LogEntry) {
  const embed: DiscordEmbed = {
    title: `[${entry.level.toUpperCase()}] ${entry.type}`,
    description: entry.message,
    color: colorMap[entry.level],
    timestamp: new Date().toISOString(),
    url: 'https://monixga.me/staff',
    author: {
      name: entry.username ? `Moderator/User: ${entry.username}` : 'N/A',
    },
    fields: entry.data?.map(d => ({
      name: d.key,
      value: d.value,
      inline: d.inline,
    })),
  };

  await discordClient.sendMessage({
    embeds: [embed],
  });
}

export async function logToDatabase(entry: LogEntry) {
  await createLogEntry(entry);
}

export async function log(entry: LogEntry) {
  await logToDatabase(entry);
  await logToDiscord(entry);
}
