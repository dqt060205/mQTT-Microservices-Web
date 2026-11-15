require('dotenv').config();

module.exports = {
  port: Number(process.env.PORT) || 3006,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
};
