import { EventEmitter } from 'events';
import { createHref, createKey, getCurrentLocationPath, parsePath } from './utils';
import { Action, BlockerListener, History, Listener, State, To } from './def';
import Blocker from './Blocker';

export const HISTORY_INDEX_NAME = '_historyIndex';
export const HISTORY_KEY_NAME = 'key';

// const HashChangeEventType = 'hashchange';
const PopStateEventType = 'popstate';

export type HistoryOptions = { window?: Window; basename?: string; hashRouter?: boolean };

export const createHistory = (options: HistoryOptions = {}): History => {
  const { window = document.defaultView!, basename: _basename = '', hashRouter = false } = options;
  const basename = _basename === '/' ? '' : _basename;

  const globalHistory = window.history;
  const emitter = new EventEmitter();

  const blocker = new Blocker();


  let globalState = globalHistory.state || {};
  let globalPath = getCurrentLocationPath();
  // 是否主动触发跳转
  let isInitiative = false;
  // 是否还原Location
  let isRevert = false;

  let historyLength = (globalState.index || 0) + 1;

  const getGlobalIndex = () => globalState[HISTORY_INDEX_NAME] || 0;

  const go = async (delta: number) => {
    const globalIndex = getGlobalIndex();
    let max = historyLength - 1 - globalIndex;
    let min = -globalIndex;
    const realDelta = Math.min(max, Math.max(min, delta));
    if (delta !== realDelta) {
      console.warn(`history.go(${delta}) failed because the delta range is [${min}, ${max}]`);
    }

    if (delta === 0) return;

    const canLeave = await blocker.canLeave(delta, delta > 0 ? Action.Push : Action.Pop);

    // 被拦截
    if (!canLeave) return false;

    // 标记为主动操作
    isInitiative = true;
    globalHistory.go(delta);
    return true;
  };

  function getHashPrefix() {
    return hashRouter ? '#' : '';
  }

  const push = async (to: To, state?: State) => {
    const globalIndex = getGlobalIndex();
    const nextPath = parsePath(to);
    const url = getHashPrefix() + basename + createHref(to);

    const canLeave = await blocker.canLeave({
      ...nextPath,
      state,
    }, Action.Push);

    // 被拦截
    if (!canLeave) return false;

    // 标记为主动操作
    isInitiative = true;
    globalHistory.pushState(
      {
        [HISTORY_INDEX_NAME]: globalIndex + 1,
        // key保持和原来一致
        [HISTORY_KEY_NAME]: createKey(),
        state,
      },
      '',
      url,
    );
    return true;
  };

  const replace = async (to: To, state?: State) => {
    const globalIndex = getGlobalIndex();
    const nextPath = parsePath(to);
    const url = getHashPrefix() + basename + createHref(to);

    const canLeave = await blocker.canLeave({
      ...nextPath,
      state,
    }, Action.Push);

    // 被拦截
    if (!canLeave) return false;

    // 标记为主动操作
    isInitiative = true;
    globalHistory.replaceState(
      {
        [HISTORY_INDEX_NAME]: globalIndex,
        // key保持和原来一致
        [HISTORY_KEY_NAME]: createKey(),
        state,
      },
      '',
      url,
    );
    return true;
  };

  // 当检测到触发跳转
  const handleHistoryChange = () => {
    if (isRevert) {
      // 检测到当前的变化是 revert 操作，忽略后面的所有动作
      isRevert = false;
      isInitiative = false;
      return;
    }
    const currentPath = getCurrentLocationPath();
    const currentState = globalHistory.state || {};
    const globalIndex = getGlobalIndex();
    const { [HISTORY_INDEX_NAME]: index = globalIndex } = currentState;

    // 计算出当前跳转的动作
    let action = (() => {
      if (index === globalIndex) return Action.Replace;
      return index > globalIndex ? Action.Push : Action.Pop;
    })();

    if (!isInitiative) {
      // 如果是被动触发的跳转（如前进、后退、物理按键返回等），需要判断 blocker 是否需要拦截
      if (blocker.listener.length > 0) {
        // 有拦截监听，需要还原，交给主动操作
        isRevert = true;
        if (action === Action.Replace) {
          // 如果是 Replace 的，则需要通过 Replace 返回
          globalHistory.replaceState(globalState, '', getHashPrefix() + createHref(globalPath));
        } else if (action === Action.Push) {
          globalHistory.go(-1);
        } else {
          globalHistory.go(1);
        }
        return;
      }
    }
    isInitiative = false;

    // 如果是 Push 操作，则历史记录长度为当前index
    if (action === Action.Push) {
      historyLength = index + 1;
    }

    // 更新 path 和 state
    globalState = currentState;
    globalPath = currentPath;

    // 触发事件
    const { pathname } = currentPath;
    emitter.emit('historychanged', {
      ...currentPath,
      pathname: basename ? pathname.replace(new RegExp('^' + basename), '') : pathname,
      state: currentState.state,
    }, action);
  };

  window.addEventListener(PopStateEventType, handleHistoryChange);

  // window.addEventListener(HashChangeEventType, () => {
  //   if(hashRouter){
  //     handleHistoryChange();
  //   }
  // });

  const listen = (listener: Listener) => {
    emitter.on('historychanged', listener);
    return () => {
      emitter.off('historychanged', listener);
    };
  };

  const block = (listener: BlockerListener) => {
    return blocker.block(listener);
  };

  const history: History = {
    get location() {
      return {
        ...globalPath,
        state: globalState.state,
      };
    },
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
    listen,
    block,
  };

  return history;
};

export const createBrowserHistory = (options: Omit<HistoryOptions, 'hashRouter'> = {}): History => createHistory({
  ...options,
  hashRouter: false,
});

export const createHashHistory = (options: Omit<HistoryOptions, 'hashRouter'> = {}): History => createHistory({
  ...options,
  hashRouter: true,
});

export const createMemoryHistory = () => {
  console.warn('`createMemoryHistory` is not implemented.');
  return null;
}
