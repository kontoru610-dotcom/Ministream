
import worker from "../src/worker.js";

export async function onRequest(context) {
  const env = {
    ...context.env,
    ASSETS: {
      fetch: () => context.next()
    }
  };

  return worker.fetch(context.request, env);
}
