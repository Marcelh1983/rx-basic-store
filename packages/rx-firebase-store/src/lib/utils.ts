import { getString } from 'rx-basic-store';

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

