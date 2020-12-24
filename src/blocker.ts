import { Action, BlockerListener, State, Location } from './def';

export default class Blocker {
  listener: BlockerListener[] = [];

  block = (listener: BlockerListener | string) => {
    // 兼容 v4 block('string')
    const l =
      typeof listener === 'string'
        ? () => {
            window.alert(listener);
            return false;
          }
        : listener;

    this.listener.push(l);

    return () => {
      this.listener = this.listener.filter((cb) => cb !== l);
    };
  };

  canLeave = (location: Location<State>, action: Action) => {
    if (this.listener.length === 0) {
      return true;
    }

    return (async () => {
      for (let i = 0; i < this.listener.length; i++) {
        const cb = this.listener[i];
        const res = await cb(location, action);
        if (res === false) return false;
      }
      return true;
    })();
  };
}
