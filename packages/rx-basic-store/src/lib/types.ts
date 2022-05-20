import { ContextType } from 'react';
import { Observable, Subscription } from 'rxjs';

export interface ActionTypeBase<P> {
  type: string;
  payload?: P;
}

export interface ActionType<T, P> extends ActionTypeBase<P> {
  execute: (ctx: StateContextType<T>) => Promise<T>;
}

export interface StateContextTypeBase<T> {
  getContext: <ContextType>(name: string) => ContextType;
  setStoreContext: (context: { name: string; dependency: unknown }[]) => void;
  getState: () => T;
  setState: (state: T) => Promise<T>;
  patchState: (state: Partial<T>) => Promise<T>;
}

export interface StateContextType<T> extends StateContextTypeBase<T> {
  dispatch: (action: ActionTypePartial<T>) => Promise<T>;
}

export type ActionTypePartial<T> =
  | ActionType<Partial<T>, unknown>
  | ActionType<T, unknown>;

export type getString = () => string;

export interface StoreTypeBase<T> {
  subscribe: (setState: (state: T) => void) => Subscription;
  asObservable: () => Observable<T>;
  currentState: () => T;
}

export interface StoreType<T> extends StoreTypeBase<T> {
  dispatch: (action: ActionTypePartial<T>) => Promise<T>;
  addCallback: (
    callback: (
      action: ActionType<T, unknown>,
      oldState: T,
      newState: T,
      context: Map<string, unknown>
    ) => void
  ) => void;
}
