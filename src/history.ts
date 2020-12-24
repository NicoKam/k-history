import { EventEmitter } from 'events';
import { createHref, createKey, parseLocation } from './utils';
import { History, State, To } from './def';

export const HISTORY_INDEX_NAME = '_historyIndex';
export const HISTORY_KEY_NAME = 'key';

export type HistoryOptions = { window?: Window; basename?: string; hashRouter?: boolean };

export const createHistory = (options: HistoryOptions = {}): History => {
  const { window = document.defaultView!, basename = '', hashRouter = false } = options;
  const globalHistory = window.history;
  const emitter = new EventEmitter();

  function getHashPrefix() {
    return hashRouter ? '#' : '';
  }

  const push = (to: To, state?: State) => {
    const { [HISTORY_INDEX_NAME]: index = 0 } = globalHistory.state || {};
    const nextLocation = parseLocation(to);
    const url = getHashPrefix() + createHref(to);

    

    globalHistory.pushState(
      {
        [HISTORY_INDEX_NAME]: index + 1,
        // key保持和原来一致
        [HISTORY_KEY_NAME]: createKey(),
        state,
      },
      '',
      url,
    );
  };

  const replace = (to: To, state?: State) => {
    const { [HISTORY_INDEX_NAME]: index = 0 } = globalHistory.state || {};
    const nextLocation = parseLocation(to);
    const url = getHashPrefix() + createHref(to);
    globalHistory.replaceState(
      {
        [HISTORY_INDEX_NAME]: index,
        // key保持和原来一致
        [HISTORY_KEY_NAME]: createKey(),
        state,
      },
      '',
      url,
    );
  };

  
  const go = (delta: number) => {
    globalHistory.go(delta);
  }

  const history: History = {
    createHref,
    push,
    replace,
    go,
    back() {
      go(-1);
    },
    forward() {
      go(1);
    },
  };

  return history;
};
