const logger = require('./utils/logger');
try {
  console.log('Checking notificationRoutes...');
  require('./routes/notificationRoutes');
  console.log('notificationRoutes OK');

  console.log('Checking tableController...');
  require('./controllers/tableController');
  console.log('tableController OK');

  console.log('Checking dailyAnalytics...');
  const { backfillDailyAnalytics } = require('./utils/dailyAnalytics');
  console.log('dailyAnalytics OK');
} catch (e) {
  console.error('FAIL DETECTED:', e);
  process.exit(1);
}
console.log('ALL MODULES LOADED OK');
