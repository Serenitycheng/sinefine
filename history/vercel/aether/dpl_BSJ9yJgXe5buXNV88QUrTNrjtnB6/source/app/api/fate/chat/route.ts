import { createFateChatHandler } from '@/lib/fate-chat';
export const runtime = 'nodejs';
export const maxDuration = 60;
export const POST = createFateChatHandler();
