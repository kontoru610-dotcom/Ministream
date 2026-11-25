
import worker from "../src/worker.js";

export async function onRequest(context) {
  context.env.ASSETS = {
    fetch: () => context.next()
  };

  return worker.fetch(context.request, context.env);
}
