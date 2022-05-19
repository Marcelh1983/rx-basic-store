import { Functions } from 'firebase/functions';
import { Auth } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { Firestore } from 'firebase/firestore';
import {
  ActionType as ActionTypeBase,
  StoreType as StoreTypeBase,
  getString,
  StateContextType as StateContextTypeBase,
} from 'rx-basic-store';

export interface ActionType<T, P> extends ActionTypeBase<T, P> {
  neverStoreOrLog?: boolean;
}

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

  storeCustomState: (state: unknown) => void;
  getCustomState<T2>(): Promise<T2 | null>;
}

export interface StoreType<T> extends StoreTypeBase<T> {
  overrideSyncOptions: (newSyncOptions: Partial<SyncOptions>) => void;
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
