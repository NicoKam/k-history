import qs from 'qs';
import URL from 'url';
import type { Location, State, To } from './def';

export const createHref = (to: To) => {
  if (typeof to === 'string') return to;
  const { hash = '', pathname = '', query = {}, search = '' } = to;

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
  return Math.random().toString(36)
    .substr(2, 8);
}

export const parsePath = (to: To, state?: State): Location => {
  const url = URL.parse(createHref(to));
  const pathname = url.pathname ?? '';
  const search = url.search ?? '';
  const hash = url.hash ?? '';
  return {
    pathname,
    search,
    hash,
    query: qs.parse(search.replace(/^\?/, '')),
    state: typeof to === 'string' ? state : to.state,
  };
};

export const concatBasename = (basename: string = '/', pathname: string = '') => {
  const hasSuffix = basename.endsWith('/');
  const hasPrefix = pathname.startsWith('/');
  if (hasSuffix && hasPrefix) {
    return basename.replace(/\/$/, '') + pathname;
  }
  if (!hasPrefix && !hasSuffix) {
    return `${basename}/${pathname}`;
  }
  return basename + pathname;
};

export const removeBasename = (basename: string = '/', pathname: string = '') => {
  let p = pathname;
  if (p.startsWith(basename)) {
    p = p.replace(new RegExp(`^${basename}`), '');
  }

  if (!p.startsWith('/')) p = `/${p}`;
  return p;
};

export type CurrentLocationOptions = {
  hashRouter?: boolean;
  basename: string;
};
export const getCurrentLocationPath = (options: CurrentLocationOptions): Location => {
  const { hashRouter = false, basename } = options;
  const { pathname, search = '', hash = '' } = location;
  const state = window.history.state || {};
  if (hashRouter) {
    return parsePath(removeBasename(basename, hash.replace(/^#/, '')), state.state);
  }
  return parsePath({ hash, pathname: removeBasename(basename, pathname), query: {}, search, state: state.state });
};
