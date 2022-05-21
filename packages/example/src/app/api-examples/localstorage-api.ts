import { DataApi, StoreSyncOptions } from 'rx-basic-store';
import { FirebaseOptions, FirebaseApp, initializeApp } from '@firebase/app';

export class FirebaseApi<T> implements DataApi<T> {
  private app!: FirebaseApp;

  constructor(
    public syncOptions: StoreSyncOptions,
    public firebaseOptions: FirebaseOptions
  ) {
    this.app = initializeApp(this.firebaseOptions);
  }

  getUserId = () => 'default_user';

  getState = async () => {
    const state = await this.getStateFromLocalStorage();
    return Promise.resolve(state);
  };

  setState = async (document: T) => {
    const state = await this.setStateFromLocalStorage(document);
    return Promise.resolve(state);
  };

  storeAction = async (action: any) => {
    const collectionName =
      this.syncOptions?.actions?.collectionName || 'actions';
      const userId = this.getUserId();
      let actions:any[] = []
      try {
       const rawActions = localStorage.getItem(`${collectionName}_${userId}`);
       if (rawActions) {
         actions = JSON.parse(rawActions) as any[];
       }
      } catch {
        // ignore
      }
      if (!actions) actions = [];
      actions.push(action);
      localStorage.setItem(`${collectionName}_${userId}`, JSON.stringify(actions));
      return Promise.resolve();
  };

  getStateFromLocalStorage = () => {
    const collectionName = this.syncOptions?.state?.collectionName || 'state';
    const userId = this.getUserId();
    const state = localStorage.getItem(`${collectionName}_${userId}`);
    try {
      if (state) {
        return JSON.parse(state) as T;
      }
    } catch {
      // ignore error
    }
    return null;
  };

  setStateFromLocalStorage = (doc: T) => {
    const collectionName = this.syncOptions?.state?.collectionName || 'state';
    const userId = this.getUserId();
    localStorage.setItem(`${collectionName}_${userId}`, JSON.stringify(doc));
  };
}


