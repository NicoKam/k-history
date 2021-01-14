import type { Action, BlockerListener, Location, State } from './def';

export default class Blocker {
  blocking?: Promise<boolean> = undefined;
  listener: BlockerListener[] = [];

  block = (listener: BlockerListener | string) => {
    // 兼容 v4 block('string')
    const l = typeof listener === 'string' ? () => window.confirm(listener) : listener;

    this.listener.push(l);

    return () => {
      this.listener = this.listener.filter(cb => cb !== l);
    };
  };

  _emitListener = async (location: number | Location<State>, action: Action) => {
    for(let i = 0; i < this.listener.length; i++) {
      const cb = this.listener[i];
      try {
        const res = await cb(location, action);
        if (res === false) return false;
      } catch (err) {
        console.error(err);
        return false;
      }
    }
    return true;
  };

  canLeave = (location: number | Location<State>, action: Action) => {
    if (this.listener.length === 0) {
      return Promise.resolve(true);
    }

    if (this.blocking) {
      return Promise.resolve(false);
    }

    const blocking = this._emitListener(location, action);

    if (blocking instanceof Promise) {
      this.blocking = blocking;
      blocking.then(() => {
        this.blocking = undefined;
      });
    }

    return blocking;
  };
}
