const USE_STUDIO2 = process.env.STUDIO2_ENGINE !== '0';
const USE_STUDIO2_V4 = USE_STUDIO2 && process.env.STUDIO2_V4_ENGINE === '1';

module.exports = {
  USE_STUDIO2,
  USE_STUDIO2_V4,
  ...require('./characters'),
  ...require('./signals'),
  ...require('./memory'),
  ...require('./workflow'),
  ...require('./turnPlan'),
  ...require('./speakerSelection'),
  ...require('./spark'),
  ...require('./promptBuilder'),
  ...require('./validator'),
  ...require('./engine'),
  ...require('./v4')
};
