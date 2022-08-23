import { Observable, Subscription } from 'rxjs';
import { DataApi } from './data-api';


export interface ActionType<T, P> {
  type: string;
  storeAction?: boolean;
  storeState?: boolean;
  neverStoreOrLog?: boolean;
  payload?: P;
  execute: (ctx: StateContextType<T>) => Promise<T>;
}

export interface StateContextType<T> {
  getContext: <ContextType>(name: string) => ContextType;
  setStoreContext: (context: { name: string; dependency: unknown }[]) => void;
  getState: () => T;
  setState: (state: T) => Promise<T>;
  patchState: (state: Partial<T>) => Promise<T>;
  dispatch<P> (action: ActionType<T, P>): Promise<T>; 

  initialState: T;
  dataApi?: DataApi<T>;
}

export interface StoreType<T> {
  ctx: StateContextType<T>;
  dispatch<P> (action: ActionType<T, P>): Promise<T>;
  addCallback: (
    callback: (
      action: ActionType<T, unknown>,
      oldState: T,
      newState: T,
      context: Map<string, unknown>
    ) => void
  ) => void;
  subscribe: (setState: (state: T) => void) => Subscription;
  asObservable: () => Observable<T>;
  currentState: () => T;
}

export interface StoreSyncOptions {
  state: SyncOptions;
  actions: SyncOptions;
}

export interface SyncOptions {
  sync: boolean;
  collectionName?: string;
  addUserId?: boolean;
  excludedFields?: Array<string>;
}
