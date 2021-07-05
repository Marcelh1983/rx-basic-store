import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import firebase from 'firebase/app';

let functionRegion: Region;
let app: firebase.app.App;
let functions: firebase.functions.Functions;
let firestore: firebase.firestore.Firestore;
let storage: firebase.storage.Storage;
let auth: firebase.auth.Auth;
let logActionOptions: SyncOptions;

const getCollectionName = (collectionName?: string | getString): string => {
    if (isFunction(collectionName)) {
        const f = collectionName as getString;
        return f();
    }
    return collectionName ? collectionName.toString() : '';
}

const isFunction = (functionToCheck: unknown) => {
    return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}

const getFirestore = () => {
    if (!app) { console.error('firebase not initialize') }
    if (!firestore) {
        firestore = app.firestore();
    }
    return firestore;
}

const getAuth = () => {
    if (!app) { console.error('firebase not initialize') }
    if (!auth) {
        auth = app.auth();
    }
    return auth;
}

export interface StoreType<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subscribe: (setState: ((state: T) => void)) => Subscription;
    asObservable: Observable<T>;
    dispatch: (action: ActionType<T, unknown>) => Promise<T>;
    currentState: () => T;
    addCallback: (callback: (action: ActionType<T, unknown>, oldState: T, newState: T, context: Map<string, unknown>) => void) => void
}

export interface ActionType<T, P> {
    neverStoreOrLog?: boolean;
    type: string;
    payload?: P;
    execute: (ctx: StateContextType<T>) => Promise<T>;
}

export interface StateContextType<T> {
    functions: firebase.functions.Functions;
    firestore: firebase.firestore.Firestore;
    storage: firebase.storage.Storage;
    auth: firebase.auth.Auth;

    getContext: <ContextType> (name: string) => ContextType;
    dispatch: (action: ActionType<T, unknown>) => Promise<T>;
    getState: () => T;
    store: (state: Partial<T>) => Promise<T>
    storeCurrentState: () => Promise<T>
    setState: (state: T) => Promise<T>;
    patchState: (state: Partial<T>) => Promise<T>;
    restoreState: () => Promise<T>;

    storeCustomState: (state: unknown) => void;
    getCustomState<T2>(): Promise<T2 | null>;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export const initStore = (firebaseApp: firebase.app.App, region?: Region, syncOptions?: SyncOptions) => {
    app = firebaseApp;
    if (region) {
        functionRegion = region;
    }
    if (syncOptions) {
        logActionOptions = syncOptions;
    }

};

const storeContext = new Map<string, unknown>();

export const setStoreContext = (context: { name: string, dependency: unknown }[]) => {
    context.forEach(c => {
        if (storeContext.get(c.name)) {
            console.warn(`${c.name} is already added in the store context. Overriding current value`);
        }
        storeContext.set(c.name, c.dependency);
    });
};

export class StateContext<T> implements StateContextType<T>  {
    constructor(public ctx: BehaviorSubject<T>, public syncOptions?: SyncOptions) { }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatch = (action: ActionType<T, unknown>) => action.execute(this as any); // trick compiler here
    getContext<T2>(name: string) {
        return storeContext.get(name) as T2;
    }
    getState = () => this.ctx.getValue();

    setState = (state: T) => {
        const updatedState = { ...state };
        this.ctx.next(updatedState);
        return Promise.resolve(updatedState);
    }
    patchState = (state: Partial<T>) => {
        const current = this.ctx.getValue();
        const merged = { ...current, ...state } as T;
        this.ctx.next(merged);
        return Promise.resolve(merged);
    }

    storeCustomState = (state: unknown) => {
        if (this.syncOptions?.collectionName) {
            storeState(state, this.syncOptions as unknown as SyncOptions);
        }
    }

    async getCustomState<T2>() {
        const authentication = getAuth();
        if (!authentication || !authentication.currentUser?.uid) {
            console.error('cannot (re)store state if firebase auth is not configured or user is not logged in.');
            return null;
        } else if (!this.syncOptions?.collectionName) {
            console.error('cannot (re)store state if collection name is not set');
            return null;
        } else {
            const fs = getFirestore();
            const ref = await fs.doc(`${getCollectionName(this.syncOptions?.collectionName)}/${authentication.currentUser?.uid}`).get();
            const state = ref.data() as T2;
            return state;
        }
    }

    store = (state: Partial<T>) => {
        if (this.syncOptions?.collectionName) {
            return storeState(state, this.syncOptions as unknown as SyncOptions);
        } else {
            return Promise.resolve(this.ctx.getValue());
        }
    }
    storeCurrentState = () => {
        if (this.syncOptions?.collectionName) {
            return storeState(this.ctx.getValue(), this.syncOptions as unknown as SyncOptions);
        } else {
            return Promise.resolve(this.ctx.getValue());
        }
    }

    restoreState = async () => {
        const authentication = getAuth();
        if (!authentication || !authentication.currentUser?.uid) {
            console.error('cannot (re)store state if firebase auth is not configured or user is not logged in.');
            return this.getState();
        } else if (!this.syncOptions?.collectionName) {
            console.error('cannot (re)store state if collection name is not set');
            return this.getState();
        } else {
            // restore the state based on the current user. Make sure the user is already logged in before calling the createStore method.
            // return new Promise<T>((resolve) => {
            const fs = getFirestore();
            const ref = await fs.doc(`${getCollectionName(this.syncOptions?.collectionName)}/${authentication.currentUser?.uid}`).get();
            const state = ref.data() as T;
            return this.setState(state);
        }
    }

    get functions() {
        if (!app) { console.error('firebase not initialize') }
        if (!functions) {
            functions = app.functions();
            if (functionRegion) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (functions as any)['region'] = functionRegion;
            }
        }
        return functions;
    }
    get firestore() {
        return getFirestore();
    }

    get storage() {
        if (!app) { console.error('firebase not initialize') }
        if (!storage) {
            storage = app.storage();
        }
        return storage;
    }

    get auth() {
        return getAuth();
    }
}

export type Region = 'us-central1' | 'us-east1' | 'us-east4' | 'europe-west1' | 'europe-west2' | 'asia-east2' | 'asia-northeast1' |
    'asia-northeast2' | 'us-west2' | 'us-west3' | 'us-west4' | 'europe-west3' | 'europe-west6' | 'northamerica-northeast1' |
    'southamerica-east1' | 'australia-southeast1' | 'asia-south1' | 'asia-southeast2' | 'asia-northeast3';

type getString = () => string

export interface SyncOptions {
    collectionName?: string | getString;
    autoStore: boolean;
    addUserId: boolean;
    logAction?: boolean;
    excludedFields?: Array<string>;
}

export function createStore<T>(initialState: T, devTools = false, syncOptions?: SyncOptions): StoreType<T> {
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
    const callbacks: ((action: ActionType<T, unknown>, oldState: T, newState: T, context: Map<string, unknown>) => void)[] = [];

    const store: StoreType<T> = {
        subscribe: (setState) => subject.subscribe(setState),
        asObservable: subject.asObservable(),
        dispatch: async (action: ActionType<T, unknown>) => {
            const newState = await action.execute(ctx);
            if (devTools && devToolsDispacher) {
                devToolsDispacher(action, newState);
            }
            for (const callback of callbacks) {
                callback(JSON.parse(JSON.stringify(action)) as ActionType<T, unknown>, ctx.getState(), newState, storeContext);
            }
            return newState;

        },
        currentState: () => subject.getValue(),
        addCallback: (callback: (action: ActionType<T, unknown>, oldState: T, newState: T, context: Map<string, unknown>) => void) => {
            callbacks.push(callback);
        }

    }
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
                if (action.neverStoreOrLog !== true && logActionOptions) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    let actionToStore = action as any;
                    if (!actionToStore['created']) {
                        actionToStore = { ...actionToStore, created: new Date() };
                    }
                    if (logActionOptions.excludedFields) {
                        for(const excludedField of logActionOptions.excludedFields) {
                            delete actionToStore[excludedField];
                        }
                    }
                    if (logActionOptions.addUserId) {
                        const authentication = getAuth();
                        if (!authentication) { console.error('cannot store state if firebase auth is not configured.'); }
                        const currentUser = authentication.currentUser;
                        if (currentUser?.uid) {
                            if (nonNullableSyncOptions.addUserId !== false) {
                                actionToStore = { ...actionToStore, createdBy: currentUser?.uid };
                            }
                        }
                    }
                    if (!app) { console.error('firebase not initialize') }
                    const fs = getFirestore();
                    fs.doc(`${getCollectionName(logActionOptions.collectionName)}/${dateId()}`).set(actionToStore);
                }
            });
        }
    }
    return store;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function storeState(newState: any, syncOptions: SyncOptions) {
    const authentication = getAuth();
    if (authentication.currentUser && newState) {
        if (syncOptions.addUserId !== false) {
            newState = { ...newState, createdBy: authentication.currentUser?.uid };
        }
        const fs = getFirestore();
        await fs.doc(`${getCollectionName(syncOptions.collectionName)}/${authentication.currentUser.uid}`).set(newState);
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
    const month = (dt.getMonth() + 1).toString().padStart(2, "0");
    const day = dt.getDate().toString().padStart(2, "0");
    const hour = (dt.getHours()).toString().padStart(2, "0");
    const minutes = (dt.getMinutes()).toString().padStart(2, "0");
    const seconds = (dt.getSeconds()).toString().padStart(2, "0");
    const milliseconds = (dt.getMilliseconds()).toString().padStart(3, "0");
    return `${year}${month}${day}${hour}${minutes}${seconds}${milliseconds}`;
}

