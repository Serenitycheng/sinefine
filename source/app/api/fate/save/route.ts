import { createCloudSaveHandlers } from '@/lib/fate-cloud-save';
import { connectCloudSave } from '@/lib/fate-cloud-save-server';

export const runtime = 'nodejs';
export const maxDuration = 60;
const handlers = createCloudSaveHandlers(connectCloudSave);
export function GET(request: Request) {
  return handlers.GET(request);
}
export function PUT(request: Request) {
  return handlers.PUT(request);
}
