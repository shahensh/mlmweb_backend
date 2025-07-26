const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://testdb:database@cluster0.unx0x.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_here',
}; 