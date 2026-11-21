// Replace this demonstration adapter with your application's authentication client.
export const demoAuth = {
  async authenticate({ code }, { signal }) {
    signal.throwIfAborted();
    await new Promise(resolve => setTimeout(resolve, 320));
    signal.throwIfAborted();
    return code.trim() === 'demo';
  },
};
