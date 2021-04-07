import { BehaviorSubject } from 'rxjs';
import * as baseStore from 'rx-basic-store';
import firebase from 'firebase/app';
import { StateContext, StoreAction } from 'rx-basic-store';

let functionRegion: Region;
let app: firebase.app.App;
let functions: firebase.functions.Functions;
let firestore: firebase.firestore.Firestore;
let storage: firebase.storage.Storage;
let auth: firebase.auth.Auth;
let logActionOptions: SyncOptions;

export interface FirebaseStateContextType<T> extends baseStore.StateContextBaseType<T, FirebaseStoreAction<T, unknown>>  {

}

// eslint-disable-next-line @typescript-eslint/ban-types
export const initStore = (firebaseApp: firebase.app.App, region?: Region, logOptions?: SyncOptions) => {
    app = firebaseApp;
    if (region) {
        functionRegion = region;
    }
    if (logOptions) {
        logActionOptions = logOptions;
    }
};

export const setStoreContext = (context: { name: string, dependency: unknown }[]) => {
    baseStore.setStoreContext(context);
};

export interface FirebaseStore<T> extends basicStore.Store<T> {
    dispatch: (action: FirebaseStoreAction<T, unknown>) => Promise<T>;
    addCallback: (callback: (action: FirebaseStoreAction<T, unknown>, oldState: T, newState: T, context: Map<string, unknown>) => void) => void
}

export interface FirebaseStoreAction<M, T> extends StoreAction<M, T> {
    type: string;
    payload?: T;
    execute(ctx: FirebaseStateContext<M>): | Promise<M>;
}

export class FirebaseStateContext<T> {
    private baseStore: StateContext<T>;
   
    constructor(subject: BehaviorSubject<T>) {
        this.baseStore = new baseStore.StateContext(subject);
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
        if (!app) { console.error('firebase not initialize') }
        if (!firestore) {
            firestore = app.firestore();
        }
        return firestore;
    }

    get storage() {
        if (!app) { console.error('firebase not initialize') }
        if (!storage) {
            storage = app.storage();
        }
        return storage;
    }

    get auth() {
        if (!app) { console.error('firebase not initialize') }
        if (!auth) {
            auth = app.auth();
        }
        return auth;
    }

    getContext<T2>(name: string) {
        return this.baseStore.getContext<T2>(name);
    }
    getState = () => this.baseStore.getState();

    setState = (state: T) => {
       return this.baseStore.setState(state);
    }
    patchState = (state: Partial<T>) => {
        return this.baseStore.patchState(state);
    }
}

export type Region = 'us-central1' | 'us-east1' | 'us-east4' | 'europe-west1' | 'europe-west2' | 'asia-east2' | 'asia-northeast1' |
    'asia-northeast2' | 'us-west2' | 'us-west3' | 'us-west4' | 'europe-west3' | 'europe-west6' | 'northamerica-northeast1' |
    'southamerica-east1' | 'australia-southeast1' | 'asia-south1' | 'asia-southeast2' | 'asia-northeast3';

export interface SyncOptions {
    collectionName?: string;
    addUserId: boolean;
}

export function createStore<T>(initialState: T, devTools = false, syncOption?: SyncOptions): FirebaseStore<T> {
    const subject = new BehaviorSubject<T>(initialState);
    const ctx = new FirebaseStateContext(subject);
    const store = basicStore.createStore<T>(initialState, devTools, ctx) as FirebaseStore<T>;
    if (syncOption) {
        if (!auth || !auth.currentUser?.uid) { console.error('cannot (re)store state if firebase auth is not configured or user is not logged in.'); }
        // restore the state based on the current user. Make sure the user is already logged in before calling the createStore method.

        auth.onAuthStateChanged(user => {
            if (user) {
                firestore.doc(`${syncOption.collectionName}/${user.uid}`).get().then(ref => {
                    const state = ref.data() as T;
                    ctx.setState(state);
                });
            }
        })

        store.addCallback((_action: FirebaseStoreAction<T, unknown>, _oldState: T, newState: T) => {
            if (auth.currentUser) {
                if (syncOption.addUserId !== false) {
                    newState = { ...newState, createdBy: auth.currentUser?.uid };
                }
                firestore.doc(`${syncOption.collectionName}/${auth.currentUser.uid}`).set(newState);
            } else {
                console.error('cannot store state when user is not logged in.')
            }
        });
        if (logActionOptions) {
            store.addCallback((action: FirebaseStoreAction<T, unknown>) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let actionToStore = action as any;
                if (logActionOptions.addUserId) {
                    if (!auth) { console.error('cannot store state if firebase auth is not configured.'); }
                    const currentUser = auth.currentUser;
                    if (currentUser?.uid) {
                        if (syncOption.addUserId !== false) {
                            actionToStore = { ...actionToStore, createdBy: currentUser?.uid };
                        }
                    }
                }
                firestore.doc(`${logActionOptions.collectionName}/${dateId()}`).set(actionToStore);
            });
        }
    }
    return store;
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
