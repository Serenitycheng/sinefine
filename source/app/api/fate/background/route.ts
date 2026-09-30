import {
  configureBackground,
  readBackground,
} from '@/lib/fate-background-server';
export const runtime = 'nodejs';
export const GET = readBackground;
export const PUT = configureBackground;
