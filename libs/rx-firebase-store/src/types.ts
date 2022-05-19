import { Functions } from 'firebase/functions';
import { Auth } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { Firestore } from 'firebase/firestore';
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
  functions: Functions & { baseUrl: string };
  firestore: Firestore;
  storage: FirebaseStorage;
  auth: Auth;

  getContext: <ContextType>(name: string) => ContextType;
  dispatch: (action: ActionTypePartial<T>) => Promise<T>;
  getState: () => T;
  store: (state: Partial<T>) => Promise<T>;
  storeCurrentState: () => Promise<T>;
  setState: (state: T) => Promise<T>;
  patchState: (state: Partial<T>) => Promise<T>;
  restoreState: () => Promise<T>;

  storeCustomState: (state: unknown) => void;
  getCustomState<T2>(): Promise<T2 | null>;
}
export type Region =
  | 'us-central1'
  | 'us-east1'
  | 'us-east4'
  | 'europe-west1'
  | 'europe-west2'
  | 'asia-east2'
  | 'asia-northeast1'
  | 'asia-northeast2'
  | 'us-west2'
  | 'us-west3'
  | 'us-west4'
  | 'europe-west3'
  | 'europe-west6'
  | 'northamerica-northeast1'
  | 'southamerica-east1'
  | 'australia-southeast1'
  | 'asia-south1'
  | 'asia-southeast2'
  | 'asia-northeast3';

export type ActionTypePartial<T> =
  | ActionType<Partial<T>, unknown>
  | ActionType<T, unknown>;

export type getString = () => string;

export interface StoreType<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subscribe: (setState: (state: T) => void) => Subscription;
    asObservable: Observable<T>;
    dispatch: (action: ActionTypePartial<T>) => Promise<T>;
    currentState: () => T;
    overrideSyncOptions: (newSyncOptions: Partial<SyncOptions>) => void;
    addCallback: (
      callback: (
        action: ActionType<T, unknown>,
        oldState: T,
        newState: T,
        context: Map<string, unknown>
      ) => void
    ) => void;
  }
