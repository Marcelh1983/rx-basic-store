import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { Auth, getAuth as getAuthLib } from 'firebase/auth';
import { Functions, getFunctions as getFunctionsLib } from 'firebase/functions';
import { FirebaseStorage, getStorage as getStorageLib } from 'firebase/storage';
import {
  doc,
  Firestore,
  getDoc,
  getFirestore as getFirestoreLib,
  setDoc,
} from 'firebase/firestore';
import { FirebaseOptions, getApp, initializeApp } from 'firebase/app';

let logActionOptions: SyncOptions;
let firebaseOption: FirebaseOptions;
let configuratedRegion: Region;

const getCollectionName = (collectionName?: string | getString): string => {
  if (isFunction(collectionName)) {
    const f = collectionName as getString;
    return f();
  }
  return collectionName ? collectionName.toString() : '';
};

const isFunction = (functionToCheck: unknown) => {
  return (
    functionToCheck && {}.toString.call(functionToCheck) === '[object Function]'
  );
};

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

export interface ActionType<T, P> {
  neverStoreOrLog?: boolean;
  type: string;
  payload?: P;
  execute: (ctx: StateContextType<T>) => Promise<T>;
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

// eslint-disable-next-line @typescript-eslint/ban-types
export const initStore = (
  options: FirebaseOptions,
  region?: Region,
  syncOptions?: SyncOptions
) => {
  if (syncOptions) {
    logActionOptions = syncOptions;
  }
  if (options) {
    firebaseOption = options;
  }
  if (region) {
    configuratedRegion = region;
  }
};

const storeContext = new Map<string, unknown>();

export const setStoreContext = (
  context: { name: string; dependency: unknown }[]
) => {
  context.forEach((c) => {
    if (storeContext.get(c.name)) {
      console.warn(
        `${c.name} is already added in the store context. Overriding current value`
      );
    }
    storeContext.set(c.name, c.dependency);
  });
};

export class StateContext<T> implements StateContextType<T> {
  constructor(
    public ctx: BehaviorSubject<T>,
    public syncOptions?: SyncOptions
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch = (action: ActionTypePartial<T>) => action.execute(this as any) as Promise<T>; // trick compiler here
  getContext<T2>(name: string) {
    return storeContext.get(name) as T2;
  }
  getState = () => this.ctx.getValue();

  setState = (state: T) => {
    const updatedState = { ...state };
    this.ctx.next(updatedState);
    return Promise.resolve(updatedState);
  };
  patchState = (state: Partial<T>) => {
    const current = this.ctx.getValue();
    const merged = { ...current, ...state } as T;
    this.ctx.next(merged);
    return Promise.resolve(merged);
  };

  storeCustomState = (state: unknown) => {
    if (this.syncOptions?.collectionName) {
      storeState(state, this.syncOptions as unknown as SyncOptions);
    }
  };

  async getCustomState<T2>() {
    const app = initializeApp(firebaseOption);
    const auth = getAuthLib(app);
    const firestore = getFirestoreLib(app);
    if (!auth || !auth.currentUser?.uid) {
      console.error(
        'cannot (re)store state if firebase auth is not configured or user is not logged in.'
      );
      return null;
    } else if (!this.syncOptions?.collectionName) {
      console.error('cannot (re)store state if collection name is not set');
      return null;
    } else {
      const docRef = doc(
        firestore,
        `${getCollectionName(this.syncOptions?.collectionName)}/${
          auth.currentUser?.uid
        }`
      );
      const docSnap = await getDoc(docRef);
      const state = docSnap.data() as T2;
      return state;
    }
  }

  store = (state: Partial<T>) => {
    if (this.syncOptions?.collectionName) {
      return storeState(state, this.syncOptions as unknown as SyncOptions);
    } else {
      return Promise.resolve(this.ctx.getValue());
    }
  };
  storeCurrentState = () => {
    if (this.syncOptions?.collectionName) {
      return storeState(
        this.ctx.getValue(),
        this.syncOptions as unknown as SyncOptions
      );
    } else {
      return Promise.resolve(this.ctx.getValue());
    }
  };

  restoreState = async () => {
    const app = initializeApp(firebaseOption);
    const auth = getAuthLib(app);
    const firestore = getFirestoreLib(app);
    if (!auth || !auth.currentUser?.uid) {
      console.error(
        'cannot (re)store state if firebase auth is not configured or user is not logged in.'
      );
      return this.getState();
    } else if (!this.syncOptions?.collectionName) {
      console.error('cannot (re)store state if collection name is not set');
      return this.getState();
    } else {
      // restore the state based on the current user. Make sure the user is already logged in before calling the createStore method.
      // return new Promise<T>((resolve) => {
      const docRef = doc(
        firestore,
        `${getCollectionName(this.syncOptions?.collectionName)}/${
          auth.currentUser?.uid
        }`
      );
      const docSnap = await getDoc(docRef);
      const state = docSnap.data() as T;
      return this.setState(state);
    }
  };

  get functions() {
    const app = initializeApp(firebaseOption);
    const functionsLib = getFunctionsLib(app, configuratedRegion);
    return {...functionsLib, baseUrl: `https://${functionsLib.region}-${firebaseOption.projectId}.cloudfunctions.net/` };
  }

  get firestore() {
    const app = initializeApp(firebaseOption);
    return getFirestoreLib(app);
  }

  get storage() {
    const app = initializeApp(firebaseOption);
    return getStorageLib(app);
  }

  get auth() {
    const app = initializeApp(firebaseOption);
    return getAuthLib(app);
  }
}

type ActionTypePartial<T> = ActionType<Partial<T>, unknown>| ActionType<T, unknown>
type getString = () => string;

export interface SyncOptions {
  collectionName?: string | getString;
  autoStore: boolean;
  addUserId: boolean;
  logAction?: boolean;
  excludedFields?: Array<string>;
}

export function createStore<T>(
  initialState: T,
  devTools = false,
  syncOptions?: SyncOptions
): StoreType<T> {
  const subject = new BehaviorSubject<T>(initialState);
  const ctx = new StateContext(subject, syncOptions);
  if (syncOptions?.collectionName) {
    syncOptions = { ...logActionOptions, ...syncOptions };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let devToolsDispacher: any = null;
  if (devTools) {
    devToolsDispacher = getDevToolsDispatcher(subject.getValue());
  }
  const callbacks: ((
    action: ActionType<T, unknown>,
    oldState: T,
    newState: T,
    context: Map<string, unknown>
  ) => void)[] = [];

  const store: StoreType<T> = {
    subscribe: (setState) => subject.subscribe(setState),
    asObservable: subject.asObservable(),
    dispatch: async (action: ActionTypePartial<T>) => {
      const newState: T = (await action.execute(ctx as any)) as any;      // trick compiler here to be able to pass a partial of T
      if (devTools && devToolsDispacher) {
        devToolsDispacher(action, newState);
      }
      for (const callback of callbacks) {
        callback(
          JSON.parse(JSON.stringify(action)) as ActionType<T, unknown>,
          ctx.getState(),
          newState,
          storeContext
        );
      }
      return newState;
    },
    overrideSyncOptions: (newSyncOptions: Partial<SyncOptions>) => {
        if (syncOptions && newSyncOptions) {
            syncOptions = { ...syncOptions, ...newSyncOptions };
        }
    },
    currentState: () => subject.getValue(),
    addCallback: (
      callback: (
        action: ActionType<T, unknown>,
        oldState: T,
        newState: T,
        context: Map<string, unknown>
      ) => void
    ) => {
      callbacks.push(callback);
    },
  };
  ctx.dispatch = store.dispatch;
  if (syncOptions?.collectionName && syncOptions.autoStore) {
    const nonNullableSyncOptions = syncOptions as unknown as SyncOptions;
    store.addCallback((_action: ActionType<T, unknown>) => {
      if (_action.neverStoreOrLog !== true) {
        storeState(ctx.getState(), nonNullableSyncOptions);
      }
    });
    if (!(syncOptions?.logAction === false)) {
      store.addCallback((action: ActionType<T, unknown>) => {
        const app = getApp() || initializeApp(firebaseOption);
        const auth = getAuthLib(app);
        const firestore = getFirestoreLib(app);
        if (action.neverStoreOrLog !== true && logActionOptions) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let actionToStore = action as any;
          if (!actionToStore['time']) {
            actionToStore = { ...actionToStore, time: new Date().getTime() };
          }
          if (syncOptions?.addUserId && !actionToStore['createdBy']) {
            const currentUser = auth.currentUser;
            actionToStore = { ...actionToStore, createdBy: currentUser?.uid };
          }
          if (logActionOptions.excludedFields) {
            for (const excludedField of logActionOptions.excludedFields) {
              delete actionToStore[excludedField];
            }
          }
          if (logActionOptions.addUserId) {
            if (!auth) {
              console.error(
                'cannot store state if firebase auth is not configured.'
              );
            }
            const currentUser = auth.currentUser;
            if (currentUser?.uid) {
              if (nonNullableSyncOptions.addUserId !== false) {
                actionToStore = {
                  ...actionToStore,
                  createdBy: currentUser?.uid,
                };
              }
            }
          }
          const docRef = doc(
            firestore,
            `${getCollectionName(logActionOptions.collectionName)}/${dateId()}`
          );
          setDoc(docRef, actionToStore);
        }
      });
    }
  }
  return store;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function storeState(newState: any, syncOptions: SyncOptions) {
  const app = getApp() || initializeApp(firebaseOption);
  const auth = getAuthLib(app);
  const firestore = getFirestoreLib(app);

  if (auth.currentUser && newState) {
    if (syncOptions.addUserId !== false) {
      newState = { ...newState, createdBy: auth.currentUser?.uid };
    }
    if (syncOptions.excludedFields) {
      for (const excludedField of syncOptions.excludedFields) {
        delete newState[excludedField];
      }
    }
    const docRef = doc(
      firestore,
      `${getCollectionName(syncOptions.collectionName)}/${auth.currentUser.uid}`
    );
    await setDoc(docRef, newState);
    return newState;
  } else {
    console.error('cannot store state when user is not logged in.');
    return newState;
  }
}

function getDevToolsDispatcher<T>(currentState: T) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const devTools = (window as any).__REDUX_DEVTOOLS_EXTENSION__?.connect({});
  devTools?.init(currentState);

  return function (action: ActionType<T, unknown>, currentState: T) {
    devTools?.send(action.type, currentState);
  };
}

export const dateId = () => {
  const dt = new Date();
  const year = dt.getFullYear();
  const month = (dt.getMonth() + 1).toString().padStart(2, '0');
  const day = dt.getDate().toString().padStart(2, '0');
  const hour = dt.getHours().toString().padStart(2, '0');
  const minutes = dt.getMinutes().toString().padStart(2, '0');
  const seconds = dt.getSeconds().toString().padStart(2, '0');
  const milliseconds = dt.getMilliseconds().toString().padStart(3, '0');
  return `${year}${month}${day}${hour}${minutes}${seconds}${milliseconds}`;
};
