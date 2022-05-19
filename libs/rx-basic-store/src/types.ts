import { Observable, Subscription } from 'rxjs';

export interface ActionType<T, P> {
  neverStoreOrLog?: boolean;
  type: string;
  payload?: P;
  execute: (ctx: StateContextType<T>) => Promise<T>;
}

export interface SyncOptions {
  collectionName?: string | getString;
  autoStore: boolean;
  addUserId: boolean;
  logAction?: boolean;
  excludedFields?: Array<string>;
}

export interface StateContextType<T> {
  getContext: <ContextType>(name: string) => ContextType;
  dispatch: (action: ActionTypePartial<T>) => Promise<T>;
  getState: () => T;
  setState: (state: T) => Promise<T>;
  patchState: (state: Partial<T>) => Promise<T>;
}

export type ActionTypePartial<T> =
  | ActionType<Partial<T>, unknown>
  | ActionType<T, unknown>;

export type getString = () => string;

export interface StoreType<T> {
  subscribe: (setState: (state: T) => void) => Subscription;
  asObservable: Observable<T>;
  dispatch: (action: ActionTypePartial<T>) => Promise<T>;
  currentState: () => T;
  addCallback: (
    callback: (
      action: ActionType<T, unknown>,
      oldState: T,
      newState: T,
      context: Map<string, unknown>
    ) => void
  ) => void;
}
