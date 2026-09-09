import { createFateChatHandler } from '@/lib/fate-chat';
import { resolveCloudKey } from '@/lib/fate-cloud';
export const runtime = 'nodejs';
export const maxDuration = 60;
export const POST = createFateChatHandler(fetch, resolveCloudKey);
