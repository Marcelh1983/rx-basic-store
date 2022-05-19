import { BehaviorSubject } from 'rxjs';
import { Region, StateContextType, SyncOptions } from './types';
import { StateContext as StateContextBase } from 'rx-basic-store';
import { FirebaseOptions, FirebaseApp, initializeApp } from '@firebase/app';
import { getFunctions as getFunctionsLib } from '@firebase/functions';
import { getStorage as getStorageLib } from '@firebase/storage';
import { getAuth as getAuthLib } from '@firebase/auth';
import {
  doc,
  getFirestore as getFirestoreLib,
  setDoc,
} from '@firebase/firestore';
import { getCollectionName } from './utils';
import { getDoc } from 'firebase/firestore';

export class StateContext<T>
  extends StateContextBase<T>
  implements StateContextType<T>
{
  private app: FirebaseApp;

  constructor(
    subject: BehaviorSubject<T>,
    storeContext: Map<string, unknown>,
    app: FirebaseApp,
    private firebaseOptions: FirebaseOptions,
    private region: Region,
    private syncOptions?: SyncOptions
  ) {
    super(subject, storeContext);
    this.app = app;
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

  storeCustomState = (state: unknown) => {
    if (this.syncOptions?.collectionStateName) {
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
    } else if (!this.syncOptions?.collectionStateName) {
      console.error('cannot (re)store state if collection name is not set');
      return null;
    } else {
      const docRef = doc(
        firestore,
        `${getCollectionName(this.syncOptions?.collectionStateName)}/${
          auth.currentUser?.uid
        }`
      );
      const docSnap = await getDoc(docRef);
      const state = docSnap.data() as T2;
      return state;
    }
  }

  store = (state: Partial<T>) => {
    if (this.syncOptions?.collectionStateName) {
      return this.storeState(state, this.syncOptions as unknown as SyncOptions);
    } else {
      return Promise.resolve(this.ctx.getValue());
    }
  };
  storeCurrentState = () => {
    if (this.syncOptions?.collectionStateName) {
      return this.storeState(
        this.ctx.getValue(),
        this.syncOptions as unknown as SyncOptions
      );
    } else {
      return Promise.resolve(this.ctx.getValue());
    }
  };

  public async storeState(newState: any, syncOptions: SyncOptions) {
    const auth = getAuthLib(this.app);
    const firestore = getFirestoreLib(this.app);

    if (auth.currentUser && newState) {
      if (syncOptions.addUserId !== false) {
        newState = { ...newState, createdBy: auth.currentUser?.uid };
      }
      if (syncOptions.excludedFields) {
        for (const excludedField of syncOptions.excludedFields) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          delete (newState as any)[excludedField];
        }
      }
      const docRef = doc(
        firestore,
        `${getCollectionName(syncOptions.collectionStateName)}/${
          auth.currentUser.uid
        }`
      );
      await setDoc(docRef, newState);
      return newState;
    } else {
      console.error('cannot store state when user is not logged in.');
      return newState;
    }
  }

  restoreState = async () => {
    const auth = getAuthLib(this.app);
    const firestore = getFirestoreLib(this.app);
    if (!auth || !auth.currentUser?.uid) {
      console.error(
        'cannot (re)store state if firebase auth is not configured or user is not logged in.'
      );
      return this.getState();
    } else if (!this.syncOptions?.collectionStateName) {
      console.error('cannot (re)store state if collection name is not set');
      return this.getState();
    } else {
      // restore the state based on the current user. Make sure the user is already logged in before calling the createStore method.
      // return new Promise<T>((resolve) => {
      const docRef = doc(
        firestore,
        `${getCollectionName(this.syncOptions?.collectionStateName)}/${
          auth.currentUser?.uid
        }`
      );
      const docSnap = await getDoc(docRef);
      const state = docSnap.data() as T;
      return this.setState(state);
    }
  };
}
