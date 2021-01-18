/**
 * history 的三个动作
 */
export enum Action {
  Pop = 'POP',
  Push = 'PUSH',
  Replace = 'REPLACE',
}

/**
 * history上的状态信息
 */
export type State = object | null;

export interface Path {

  /**
   * 路径名称，剔除了routerBase
   */
  pathname: string;

  /**
   * location.search
   */
  search: string;

  /**
   * location.hash
   */
  hash: string;

  /**
   * location.search的object形式
   */
  query: object | null;
}

export interface Location<S extends State = State> extends Path {

  /**
   * history.state
   */
  state?: S;

  key?: string;
}

/**
 * history.listen 的回调函数定义
 */
export type Listener<S extends State = State> = (location: Location<S>, action: Action) => void;

/**
 * 拦截器回调
 */
export type BlockerListener<S extends State = State> = (
  location: number | Location<S>,
  action: Action,
) => Promise<boolean> | boolean | null | undefined;

export type To = string | Location;

/**
 * 抽象的history
 * 来源于 ReactTraining/history
 */
export interface History<S extends State = State> {
  readonly location: Location<S>;

  readonly action: Action;
  readonly length: number;

  /**
   * 将To对象/字符串，转换为url路径
   */
  createHref(to: To): string;

  /**
   * Pushes a new location onto the history stack, increasing its length by one.
   * If there were any entries in the stack after the current one, they are
   * lost.
   *
   * @param to - The new URL
   * @param state - Data to associate with the new location
   *
   * @see https://github.com/ReactTraining/history/tree/master/docs/api-reference.md#history.push
   */
  push(to: To, state?: S): void;

  /**
   * Replaces the current location in the history stack with a new one.  The
   * location that was replaced will no longer be available.
   *
   * @param to - The new URL
   * @param state - Data to associate with the new location
   *
   * @see https://github.com/ReactTraining/history/tree/master/docs/api-reference.md#history.replace
   */
  replace(to: To, state?: S): void;

  /**
   * Navigates `n` entries backward/forward in the history stack relative to the
   * current index. For example, a "back" navigation would use go(-1).
   *
   * @param delta - The delta in the stack index
   *
   * @see https://github.com/ReactTraining/history/tree/master/docs/api-reference.md#history.go
   */
  go(delta: number): void;

  /**
   * Navigates to the previous entry in the stack. Identical to go(-1).
   *
   * Warning: if the current location is the first location in the stack, this
   * will unload the current document.
   *
   * @see https://github.com/ReactTraining/history/tree/master/docs/api-reference.md#history.back
   */
  back(): void;
  goBack(): void;

  /**
   * Navigates to the next entry in the stack. Identical to go(1).
   *
   * @see https://github.com/ReactTraining/history/tree/master/docs/api-reference.md#history.forward
   */
  forward(): void;
  goForward(): void;

  /**
   * Sets up a listener that will be called whenever the current location
   * changes.
   *
   * @param listener - A function that will be called when the location changes
   * @returns unlisten - A function that may be used to stop listening
   *
   * @see https://github.com/ReactTraining/history/tree/master/docs/api-reference.md#history.listen
   */
  listen(listener: Listener<S>): () => void;

  /**
   * Prevents the current location from changing and sets up a listener that
   * will be called instead.
   *
   * @param blocker - A function that will be called when a transition is blocked
   * @returns unblock - A function that may be used to stop blocking
   *
   * @see https://github.com/ReactTraining/history/tree/master/docs/api-reference.md#history.block
   */
  block(blocker: BlockerListener<S>): () => void;
}

/**
 * A browser history stores the current location in regular URLs in a web
 * browser environment. This is the standard for most web apps and provides the
 * cleanest URLs the browser's address bar.
 *
 * @see https://github.com/ReactTraining/history/tree/master/docs/api-reference.md#browserhistory
 */
export interface BrowserHistory<S extends State = State> extends History<S> {}

/**
 * A hash history stores the current location in the fragment identifier portion
 * of the URL in a web browser environment.
 *
 * This is ideal for apps that do not control the server for some reason
 * (because the fragment identifier is never sent to the server), including some
 * shared hosting environments that do not provide fine-grained controls over
 * which pages are served at which URLs.
 *
 * @see https://github.com/ReactTraining/history/tree/master/docs/api-reference.md#hashhistory
 */
export interface HashHistory<S extends State = State> extends History<S> {}

/**
 * A memory history stores locations in memory. This is useful in stateful
 * environments where there is no web browser, such as node tests or React
 * Native.
 *
 * @see https://github.com/ReactTraining/history/tree/master/docs/api-reference.md#memoryhistory
 */
export interface MemoryHistory<S extends State = State> extends History<S> {
  index: number;
}
