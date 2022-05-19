import { FirebaseApp, FirebaseOptions, getApp, initializeApp } from 'firebase/app';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { BehaviorSubject } from 'rxjs';
import { StateContextType, SyncOptions, ActionTypePartial, Region } from './types';
import { getFunctions as getFunctionsLib } from 'firebase/functions';
import { getStorage as getStorageLib } from 'firebase/storage';
import {  getAuth as getAuthLib } from 'firebase/auth';
import {  getFirestore as getFirestoreLib } from 'firebase/firestore';
import { getCollectionName } from './utils';

export class StateContext<T> implements StateContextType<T> {
private app: FirebaseApp;

  constructor(
    private ctx: BehaviorSubject<T>,
    private firebaseOptions: FirebaseOptions,
    private storeContext: Map<string, unknown>,
    private region: Region,
    private syncOptions?: SyncOptions,
  ) {
    this.app = initializeApp(this.firebaseOptions);
  }

  get functions() {
    const functionsLib = getFunctionsLib(this.app, this.region);
    return {
      ...functionsLib,
      baseUrl: `https://${functionsLib.region}-${this.firebaseOptions.projectId}.cloudfunctions.net/`,
    };
  }

  get firestore() {
    return getFirestoreLib(this.app);
  }

  get storage() {
    return getStorageLib(this.app);
  }

  get auth() {
    return getAuthLib(this.app);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch = (action: ActionTypePartial<T>) =>
    action.execute(this as any) as Promise<T>; // trick compiler here

  getContext<T2>(name: string) {
    return this.storeContext.get(name) as T2;
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
      this.storeState(state, this.syncOptions as unknown as SyncOptions);
    }
  };

  async getCustomState<T2>() {
    const app = initializeApp(this.firebaseOptions);
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
      return this.storeState(state, this.syncOptions as unknown as SyncOptions);
    } else {
      return Promise.resolve(this.ctx.getValue());
    }
  };
  storeCurrentState = () => {
    if (this.syncOptions?.collectionName) {
      return this.storeState(
        this.ctx.getValue(),
        this.syncOptions as unknown as SyncOptions
      );
    } else {
      return Promise.resolve(this.ctx.getValue());
    }
  };

  private async storeState(newState: any, syncOptions: SyncOptions) {
    const app = getApp() || initializeApp(this.firebaseOptions);
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

  restoreState = async () => {
    const app = initializeApp(this.firebaseOptions);
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
  }
}