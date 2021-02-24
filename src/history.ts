/* eslint-disable @typescript-eslint/no-use-before-define */
import { EventEmitter } from 'events';
import { createHref, createKey, getCurrentLocationPath, parsePath } from './utils';
import type { BlockerListener, History, Listener, State, To } from './def';
import { Action } from './def';
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
  let globalPath = getCurrentLocationPath(hashRouter);
  // 是否用户触发跳转
  let isUserAction = false;
  // 是否主动触发跳转
  let isInitiative = false;
  let initiativeActionType: Action | 'GO' | undefined = undefined;
  // 是否还原Location
  let isRevert = false;
  let revertCallback: Function = () => undefined;

  let lastAction: Action = Action.Push;

  let historyLength = (globalState[HISTORY_INDEX_NAME] || 0) + 1;

  const getGlobalIndex = () => globalState[HISTORY_INDEX_NAME] || 0;

  const go = async (delta: number) => {
    const globalIndex = getGlobalIndex();
    const max = Math.max(0, historyLength - 1 - globalIndex);
    const min = -globalIndex;
    const realDelta = Math.min(max, Math.max(min, delta));
    if (delta !== realDelta) {
      console.warn(`history.go(${delta}) failed because the delta range is [${min}, ${max}]`);
    }

    if (realDelta === 0) return false;

    const canLeave = await blocker.canLeave(realDelta, realDelta > 0 ? Action.Push : Action.Pop);

    // 被拦截
    if (!canLeave) return false;

    // 标记为主动操作
    isInitiative = true;
    initiativeActionType = 'GO';
    await Promise.resolve().then();
    globalHistory.go(realDelta);
    return true;
  };

  function getHashPrefix() {
    return hashRouter ? '#' : '';
  }

  const push = async (to: To, state?: State) => {
    const globalIndex = getGlobalIndex();
    const nextLocation = parsePath(to, state);
    const url = getHashPrefix() + basename + createHref(to);

    const canLeave = await blocker.canLeave({ ...nextLocation }, Action.Push);

    // 被拦截
    if (!canLeave) return false;

    // 标记为主动操作
    isInitiative = true;
    initiativeActionType = Action.Push;
    globalHistory.pushState(
      {
        [HISTORY_INDEX_NAME]: globalIndex + 1,
        // key保持和原来一致
        [HISTORY_KEY_NAME]: createKey(),
        state: nextLocation.state,
      },
      '',
      url,
    );

    // push 需要主动触发事件
    handleHistoryChange();
    return true;
  };

  const replace = async (to: To, state?: State) => {
    const globalIndex = getGlobalIndex();
    const nextLocation = parsePath(to, state);
    const url = getHashPrefix() + basename + createHref(to);

    const canLeave = await blocker.canLeave({ ...nextLocation }, Action.Push);

    // 被拦截
    if (!canLeave) return false;

    // 标记为主动操作
    isInitiative = true;
    initiativeActionType = Action.Replace;
    globalHistory.replaceState(
      {
        [HISTORY_INDEX_NAME]: globalIndex,
        // key保持和原来一致
        [HISTORY_KEY_NAME]: createKey(),
        state: nextLocation.state,
      },
      '',
      url,
    );
    // replace 需要主动触发事件
    handleHistoryChange();
    return true;
  };

  // 当检测到触发跳转
  const handleHistoryChange = () => {
    if (isRevert) {
      // 检测到当前的变化是 revert 操作，忽略后面的所有动作
      isRevert = false;
      isInitiative = false;
      typeof revertCallback === 'function' && revertCallback();
      return;
    }
    const currentPath = getCurrentLocationPath(hashRouter);
    const currentState = globalHistory.state || {};
    const globalIndex = getGlobalIndex();
    const { [HISTORY_INDEX_NAME]: index = 0 } = currentState;

    // 计算出当前跳转的动作
    const action = (() => {
      if (index === globalIndex) return Action.Replace;
      return index > globalIndex ? Action.Push : Action.Pop;
    })();

    if (!isInitiative) {
      // 如果是被动触发的跳转（如前进、后退、物理按键返回等），需要判断 blocker 是否需要拦截
      if (blocker.listener.length > 0) {
        // 有拦截监听，需要还原，交给主动操作
        isRevert = true;

        const nextLocation = {
          ...currentPath,
          state: currentState.state,
        };

        const canGo = () =>
          blocker.canLeave(nextLocation, action).then((ok) => {
            if (ok) {
              isInitiative = true;
              initiativeActionType = 'GO';
              isRevert = false;
            }
            return ok;
          });

        if (action === Action.Replace) {
          // 如果是 Replace 的，则需要通过 Replace 返回
          globalHistory.replaceState(globalState, '', getHashPrefix() + createHref(globalPath));
          // 重新触发
          replace(currentPath, currentState);
        } else if (action === Action.Push) {
          revertCallback = () => {
            canGo().then((ok) => {
              if (ok) {
                globalHistory.go(1);
                // history.go(1);
              }
            });
          };
          globalHistory.go(-1);
        } else {
          revertCallback = () => {
            canGo().then((ok) => {
              if (ok) {
                globalHistory.go(-1);
                // history.go(-1);
              }
            });
          };
          globalHistory.go(1);
        }

        return;
      }
    }

    // 如果是用户主动的 Push 操作，则历史记录长度为当前index
    if (isUserAction && initiativeActionType === Action.Push) {
      historyLength = index + 1;
    }

    // 前进时更新长度
    historyLength = Math.max(historyLength, index);

    // 相应处理结束，更新状态及触发事件

    isInitiative = false;
    isUserAction = false;

    globalState = currentState;
    globalPath = currentPath;

    // 触发事件
    const { pathname } = currentPath;
    const finalLocation = {
      ...currentPath,
      pathname: basename ? pathname.replace(new RegExp(`^${basename}`), '') : pathname,
      state: currentState.state,
    };
    lastAction = action;
    emitter.emit('historychanged', finalLocation, action);
  };

  let listenerCount = 0;
  const listenState = () => {
    if (listenerCount === 0) {
      window.addEventListener(PopStateEventType, handleHistoryChange);
    }
    listenerCount += 1;
    return () => {
      listenerCount -= 1;
      if (listenerCount === 0) {
        window.removeEventListener(PopStateEventType, handleHistoryChange);
      }
    };
  };

  // window.addEventListener(HashChangeEventType, () => {
  //   if(hashRouter){
  //     handleHistoryChange();
  //   }
  // });

  const listen = (listener: Listener) => {
    const removeListener = listenState();
    emitter.on('historychanged', listener);
    return () => {
      removeListener();
      emitter.off('historychanged', listener);
    };
  };

  const block = (listener: BlockerListener) => {
    const removeListener = listenState();
    const removeBlocker = blocker.block(listener);
    return () => {
      removeListener();
      removeBlocker();
    };
  };

  const history: History = {
    get length() {
      return historyLength;
    },
    get action() {
      return lastAction;
    },
    get location() {
      return {
        ...globalPath,
        state: globalState.state,
      };
    },
    createHref,
    push(to, state) {
      isUserAction = true;
      return push(to, state);
    },
    replace(to, state) {
      isUserAction = true;
      return replace(to, state);
    },
    go(delta) {
      isUserAction = true;
      return go(delta);
    },
    back() {
      isUserAction = true;
      return go(-1);
    },
    goBack() {
      isUserAction = true;
      return go(-1);
    },
    forward() {
      isUserAction = true;
      return go(1);
    },
    goForward() {
      isUserAction = true;
      return go(1);
    },
    listen,
    block,
  };

  return history;
};

export const createBrowserHistory = (options: Omit<HistoryOptions, 'hashRouter'> = {}): History =>
  createHistory({
    ...options,
    hashRouter: false,
  });

export const createHashHistory = (options: Omit<HistoryOptions, 'hashRouter'> = {}): History =>
  createHistory({
    ...options,
    hashRouter: true,
  });

export const createMemoryHistory = () => {
  console.warn('`createMemoryHistory` is not implemented.');
  return null;
};
