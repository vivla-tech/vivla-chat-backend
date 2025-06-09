import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_PUBLIC_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

async function verifyConnection() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    console.log('Database URL:', process.env.DATABASE_PUBLIC_URL ? process.env.DATABASE_PUBLIC_URL.replace(/:[^:@]*@/, ':****@') : 'not set');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

verifyConnection(); 