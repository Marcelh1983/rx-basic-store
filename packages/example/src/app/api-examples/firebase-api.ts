import { DataApi, StoreSyncOptions } from 'rx-basic-store';
import { FirebaseOptions, FirebaseApp, initializeApp } from '@firebase/app';
import { getAuth } from '@firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from '@firebase/firestore';

export class FirebaseApi<T> implements DataApi<T> {
  private app!: FirebaseApp;

  constructor(
    public syncOptions: StoreSyncOptions,
    public firebaseOptions: FirebaseOptions
  ) {
    this.app = initializeApp(this.firebaseOptions);
  }

  getUserId = () => {
    const auth = getAuth(this.app);
    if (!auth) {
      console.error('cannot store state if firebase auth is not configured.');
    }
    return auth?.currentUser?.uid || '';
  };

  getState = async () => {
    const stateRef = await this.getStateRef();
    const state = (await (await getDoc(stateRef)).data()) as T;
    return state;
  };

  setState = async (document: T) => {
    const stateRef = await this.getStateRef();
    return await setDoc(stateRef, document);
  };

 
  storeAction = async (action: any) => {
    const collectionName = this.syncOptions?.actions?.collectionName || 'actions';
    const firestore = getFirestore(this.app);
    const actionRef = await doc(
      firestore,
      `${collectionName}/${dateId()}`
    );
    return setDoc(actionRef, action);
  };

  getStateRef = async () => {
    const collectionName = this.syncOptions?.state?.collectionName || 'state';
    const firestore = getFirestore(this.app);
    const userId = this.getUserId();
    return await doc(
      firestore,
      `${collectionName}/${userId}`
    );
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
