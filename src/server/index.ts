import { createApp } from './app.js';
import { config } from './config/config.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`[Mishkat Platform] Server running on port ${config.port} in ${config.nodeEnv} mode`);
});
