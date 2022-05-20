import { DataApi } from './data-api';
import { StoreSyncOptions, ActionType } from './types';

export class MockedDataApi<T> implements DataApi<T> {
  userId: string;
  latestState: T;
  
  private actions: ActionType<T, unknown>[] = [];
  
  constructor(public syncOptions: StoreSyncOptions, userId: string, initialState: T) {
    this.userId = userId;
    this.latestState = initialState;
  }

  getUserId = () => this.userId;

  getState = () => Promise.resolve(this.latestState);

  setState = (doc: T) => {
    this.latestState = doc;
    return Promise.resolve();
  };

  storeAction<P>(action: ActionType<T, P>): void {
    this.actions.push(action);
  }
}
