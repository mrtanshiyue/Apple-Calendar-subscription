import calendarWorker from './worker/index.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/health' || url.pathname.startsWith('/api/')) {
      return calendarWorker.fetch(request, env, ctx);
    }
    return env.ASSETS.fetch(request);
  },
};
