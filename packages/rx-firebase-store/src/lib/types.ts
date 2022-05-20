import { Functions } from 'firebase/functions';
import { Auth } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { Firestore } from 'firebase/firestore';
import {
  ActionTypeBase,
  StoreTypeBase,
  getString,
  StateContextTypeBase,
} from 'rx-basic-store';

export interface ActionType<T, P> extends ActionTypeBase<P> {
  neverStoreOrLog?: boolean;
  execute: (ctx: StateContextType<T>) => Promise<T>
}

export type ActionTypePartial<T> =
  | ActionType<Partial<T>, unknown>
  | ActionType<T, unknown>;

export interface SyncOptions {
  collectionStateName?: string | getString;
  collectionActionName?: string | getString;
  autoStore: boolean;
  addUserId: boolean;
  logAction?: boolean;
  excludedFields?: Array<string>;
}

export interface StateContextType<T> extends StateContextTypeBase<T> {
  functions: Functions & { baseUrl: string };
  firestore: Firestore;
  storage: FirebaseStorage;
  auth: Auth;
  store: (state: Partial<T>) => Promise<T>;
  storeCurrentState: () => Promise<T>;
  restoreState: () => Promise<T>;
  dispatch: (action: ActionTypePartial<T>) => Promise<T>;
  storeCustomState: (state: unknown) => void;
  getCustomState<T2>(): Promise<T2 | null>;
}

export interface StoreType<T> extends StoreTypeBase<T> {
  overrideSyncOptions: (newSyncOptions: Partial<SyncOptions>) => void;
  dispatch: (action: ActionTypePartial<T>) => Promise<T>;
  addCallback: (
    callback: (
      action: ActionType<T, unknown>,
      oldState: T,
      newState: T,
      context: Map<string, unknown>
    ) => void
  ) => void;
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
