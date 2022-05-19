import { FirebaseApp, FirebaseOptions, initializeApp } from 'firebase/app';
import { BehaviorSubject } from 'rxjs';
import { StateContext } from './context';
import { ActionType, Region, StoreType, SyncOptions } from './types';
import { ActionTypePartial, Store as StoreBase } from 'rx-basic-store';
import { getAuth as getAuthLib } from '@firebase/auth';
import { getFirestore as getFirestoreLib } from '@firebase/firestore';
import { doc, setDoc } from 'firebase/firestore';
import { dateId, getCollectionName } from './utils';

const defaultSyncOptions: SyncOptions = {
  addUserId: true,
  autoStore: true,
  collectionStateName: 'state',
  collectionActionName: 'actions',
  excludedFields: [],
  logAction: true,
};

export class Store<T> implements StoreType<T> {
  private subject!: BehaviorSubject<T>;
  private storeContext = new Map<string, unknown>();
  private ctx!: StateContext<T>;
  private baseStore: StoreBase<T>;
  private app: FirebaseApp;

  constructor(
    initialState: T,
    devTools = false,
    private firebaseOptions: FirebaseOptions,
    private syncOptions = defaultSyncOptions,
    private region: Region = 'europe-west1'
  ) {
    this.baseStore = new StoreBase(initialState, devTools);
    this.app = initializeApp(this.firebaseOptions);
    this.ctx = new StateContext(
      this.subject,
      this.storeContext,
      this.app,
      firebaseOptions,
      region,
      syncOptions
    );
    // add call back to store state and action in firebase
    if (syncOptions?.collectionStateName && syncOptions.autoStore) {
      this.addCallback((_action: ActionType<T, unknown>) => {
        if (_action.neverStoreOrLog !== true) {
          this.ctx.storeCurrentState();
        }
      });
      if (!(syncOptions?.logAction === false)) {
        this.addCallback((action: ActionType<T, unknown>) => {
          const auth = getAuthLib(this.app);
          const firestore = getFirestoreLib(this.app);
          if (action.neverStoreOrLog !== true && syncOptions) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let actionToStore = action as any;
            if (!actionToStore['time']) {
              actionToStore = { ...actionToStore, time: new Date().getTime() };
            }
            if (syncOptions?.addUserId && !actionToStore['createdBy']) {
              const currentUser = auth.currentUser;
              actionToStore = { ...actionToStore, createdBy: currentUser?.uid };
            }
            if (syncOptions.excludedFields) {
              for (const excludedField of syncOptions.excludedFields) {
                delete actionToStore[excludedField];
              }
            }
            if (syncOptions.addUserId) {
              if (!auth) {
                console.error(
                  'cannot store state if firebase auth is not configured.'
                );
              }
              const currentUser = auth.currentUser;
              if (currentUser?.uid) {
                actionToStore = {
                  ...actionToStore,
                  createdBy: currentUser?.uid,
                };
              }
            }
            const docRef = doc(
              firestore,
              `${getCollectionName(
                syncOptions.collectionActionName
              )}/${dateId()}`
            );
            setDoc(docRef, actionToStore);
          }
        });
      }
    }
  }

  public subscribe = (setState: (state: T) => void) =>
    this.baseStore.subscribe(setState);

  public asObservable = () => this.subject.asObservable();

  public dispatch = async (action: ActionTypePartial<T>): Promise<T> => {
    return this.baseStore.dispatch(action);
  };

  public currentState = () => this.ctx.getState();

  public addCallback(
    callback: (
      action: ActionType<T, unknown>,
      oldState: T,
      newState: T,
      context: Map<string, unknown>
    ) => void
  ) {
    this.baseStore.addCallback(callback);
  }

  public overrideSyncOptions = (newSyncOptions: Partial<SyncOptions>) => {
    this.syncOptions = { ...this.syncOptions, ...newSyncOptions };
    this.ctx = new StateContext(
      this.subject,
      this.storeContext,
      this.app,
      this.firebaseOptions,
      this.region,
      this.syncOptions
    );
  };
}
