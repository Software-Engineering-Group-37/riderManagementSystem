import dotenv from 'dotenv';
import pkg from 'pg';
dotenv.config(); // ✅ Load environment variables from .env file
const { Pool } = pkg; // ✅ Use Pool for queries

let pool;

if (process.env.NODE_ENV === 'development') {
    console.log('Connected to the database in development mode');
    pool = new Pool({
        user: process.env.DB_USER, // ✅ Your PostgreSQL username
        host: process.env.DB_HOST, // ✅ Your PostgreSQL host
        database: process.env.DB_NAME, // ✅ Now connecting to your database
        password: process.env.DB_PASSWORD, // ✅ Your PostgreSQL password
        port: process.env.DB_PORT, // ✅ Your PostgreSQL port
    });
} else {
    console.log('Connected to the database in production mode');
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
        // Add this for Render/Postgres SSL
    });
}

export default pool;