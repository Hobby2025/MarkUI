export type VscodeApi = {
  getState: () => unknown;
  setState: (state: unknown) => void;
  postMessage: (message: unknown) => void;
};

declare global {
  interface Window {
    acquireVsCodeApi?: () => VscodeApi;
  }
}

let cachedApi: VscodeApi | undefined;

export function getVscodeApi(): VscodeApi | undefined {
  if (!cachedApi && window.acquireVsCodeApi) {
    cachedApi = window.acquireVsCodeApi();
  }

  return cachedApi;
}
