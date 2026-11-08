require('dotenv').config();

const logger = require('./utils/logger');
const { createApp } = require('./app');

const { server } = createApp();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.log(`Server running on port ${PORT}`);
});
