import qs from 'qs';
import { Path } from './def';

export const createHref = (path: string | Path) => {
  if (typeof path === 'string') return path;
  const { hash, pathname, query = {}, search } = path;

  const searchObject = qs.parse(search.replace(/^\?/, ''));

  const mergedSearch = {
    ...searchObject,
    ...query,
  };

  let mergedSearchStr = qs.stringify(mergedSearch);
  if (mergedSearchStr.length > 0) mergedSearchStr = `?${mergedSearchStr}`;

  return pathname + mergedSearchStr + hash;
};
