import { createApp } from "./app";
import { env } from "./env";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`KANIO API demarree sur http://localhost:${env.PORT} (${env.NODE_ENV})`);
});
