import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContextStore {
  requestId: string;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContextStore>();

export function runWithRequestId<T>(requestId: string, callback: () => T): T {
  return asyncLocalStorage.run({ requestId }, callback);
}

export function getRequestId(): string | undefined {
  return asyncLocalStorage.getStore()?.requestId;
}
