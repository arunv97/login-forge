import { worker } from 'mocks/browser'

export const startServiceWorker = () => {
  worker.start({
    onUnhandledRequest: (req) => {
      // Ignore static asset requests
      const url = new URL(req.url);
      if (url.pathname.startsWith('/static/')) {
        return;
      }
    },
  });
};
