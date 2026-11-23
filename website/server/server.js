require('dotenv').config();
const { getConfig } = require('./config/env');
const { createApp } = require('./app');

try {
  const config = getConfig();
  const app = createApp(config);
  app.listen(config.port, () => console.log(`Connect API and frontend running at http://localhost:${config.port}`));
} catch (error) {
  console.error(`Connect server failed to start: ${error.message}`);
  process.exitCode = 1;
}
