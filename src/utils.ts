import qs from 'qs';
import URL from 'url';
import { Path, State, To, Location } from './def';

export const createHref = (to: To) => {
  if (typeof to === 'string') return to;
  const { hash, pathname, query = {}, search } = to;

  const searchObject = qs.parse(search.replace(/^\?/, ''));

  const mergedSearch = {
    ...searchObject,
    ...query,
  };

  let mergedSearchStr = qs.stringify(mergedSearch);
  if (mergedSearchStr.length > 0) mergedSearchStr = `?${mergedSearchStr}`;

  return pathname + mergedSearchStr + hash;
};

export function createKey() {
  return Math.random().toString(36).substr(2, 8);
}

export const parseLocation = (to: To): Location<State> => {
  const url = URL.parse(createHref(to));
  const pathname = url.pathname || '';
  const search = url.search || '';
  const hash = url.hash || '';
  return { pathname, search, hash, query: qs.parse(search.replace(/^\?/, '')) };
};
