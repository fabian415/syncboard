import { env } from './config/env.js';
import { createApp } from './app.js';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`SyncBoard server listening on http://localhost:${env.PORT}`);
});
