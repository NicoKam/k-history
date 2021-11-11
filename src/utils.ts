import qs from 'qs';
import URL from 'url';
import type { HistoryOptions, Location, State, To } from './def';

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

export const getCurrentLocation = (options: HistoryOptions): Location => {
  const { hashRouter = false, window: _window = window } = options;
  let { basename = '/' } = options;
  if (basename === '') {
    basename = '/';
  }
  const { pathname, search = '', hash = '' } = _window.location;
  const state = _window.history.state || {};

  function removeBasename(pathname: string = '') {
    let p = pathname;
    if (p.startsWith(basename)) {
      p = p.replace(new RegExp(`^${basename}`), '');
    }

    // 如果 pathname 不是 / 开头，则补上
    if (!p.startsWith('/')) p = `/${p}`;
    return p;
  }

  if (hashRouter) {
    return parsePath(removeBasename(hash.replace(/^#/, '')), state.state);
  }
  return parsePath({ hash, pathname: removeBasename(pathname), query: {}, search, state: state.state });
};

export const toPathAndState = (
  options: HistoryOptions,
  _location: To,
  selfState?: Object,
): { pathname: string; state: Record<string, unknown> } => {
  const { hashRouter = false } = options;
  let { basename = '/' } = options;
  if (basename === '') {
    basename = '/';
  }

  // parse location
  const location: Location =
    typeof _location === 'string' ? { pathname: _location, hash: '', query: {}, search: '' } : _location;

  const { state } = location;
  let { pathname, search = '', query = {}} = location;

  // add basename
  if (pathname.startsWith('/') && basename.endsWith('/')) {
    // remove double slash
    pathname = basename + pathname.slice(1);
  } else {
    pathname = basename + pathname;
  }

  // hash router
  if (hashRouter) {
    pathname = `#${pathname}`;
  }

  // check query is object
  if (!(query instanceof Object)) query = {};

  // remove ?
  if (search.startsWith('?')) search = search.slice(1);

  // parse search
  query = {
    ...qs.parse(search),
    ...query,
  };

  return {
    pathname,
    state: {
      ...selfState,
      state,
    },
  };
};
