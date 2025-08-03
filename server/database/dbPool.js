import dotenv from 'dotenv';
import pkg from 'pg';
dotenv.config(); // ✅ Load environment variables from .env file
const { Pool } = pkg; // ✅ Use Pool for queries

const pool = new Pool({
    user: process.env.DB_USER, // ✅ Your PostgreSQL username
    host: process.env.DB_HOST, // ✅ Your PostgreSQL host
    database: process.env.DB_NAME, // ✅ Now connecting to your database
    password: process.env.DB_PASSWORD, // ✅ Your PostgreSQL password
    port: process.env.DB_PORT, // ✅ Your PostgreSQL port
});

export default pool;