import { ActionType, getString } from './types';

export const getCollectionName = (
  collectionName?: string | getString
): string => {
  if (isFunction(collectionName)) {
    const f = collectionName as getString;
    return f();
  }
  return collectionName ? collectionName.toString() : '';
};

export const isFunction = (functionToCheck: unknown) => {
  return (
    functionToCheck && {}.toString.call(functionToCheck) === '[object Function]'
  );
};

export function getDevToolsDispatcher<T>(currentState: T) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const devTools = (window as any).__REDUX_DEVTOOLS_EXTENSION__?.connect({});
  devTools?.init(currentState);

  return function (action: ActionType<T, unknown>, currentState: T) {
    devTools?.send(action.type, currentState);
  };
}
