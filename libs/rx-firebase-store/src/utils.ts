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

export function getDevToolsDispatcher<T>(currentState: T) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const devTools = (window as any).__REDUX_DEVTOOLS_EXTENSION__?.connect({});
  devTools?.init(currentState);

  return function (action: ActionType<T, unknown>, currentState: T) {
    devTools?.send(action.type, currentState);
  };
}
