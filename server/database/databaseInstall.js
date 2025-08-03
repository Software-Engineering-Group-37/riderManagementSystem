import dotenv from 'dotenv';
import pkg from 'pg';
import createTables from './relationalDB.js';
import seedSuperAdmin from './seedSuperAdmin.js';

dotenv.config(); // ✅ Load environment variables from .env file
const { Pool } = pkg;

// const pool = new Pool({
//     user: process.env.DB_USER, // ✅ Your PostgreSQL username
//     host: process.env.DB_HOST, // ✅ Your PostgreSQL host
//     password: process.env.DB_PASSWORD, // ✅ Your PostgreSQL password
//     port: process.env.DB_PORT, // ✅ Your PostgreSQL port
// });
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Add this for Render/Postgres SSL
});

async function createDatabase() {
    const client = await pool.connect(); // Get a client from the pool
    try {
        console.log("Connected to PostgreSQL");

        // Check if the database exists before creating it
        const dbExists = await client.query(`SELECT 1 FROM pg_database WHERE datname = 'rms'`);
        if (dbExists.rowCount === 0) {
            await client.query("CREATE DATABASE rms");
            console.log("Database 'rms' created successfully");
        } else {
            console.log("Database 'rms' already exists");
        }

    } catch (error) {
        console.error("Error creating database:", error);
    } finally {
        client.release(); // Release client back to the pool
        await pool.end(); // Close the pool
        console.log("Initial database connection closed");
    }

    // Now create tables and seed data using the rms database
    try {
        console.log("Creating tables...");
        await createTables();
        
        console.log("Seeding superadmin...");
        await seedSuperAdmin();
        
    } catch (error) {
        console.error("Error in database setup:", error);
    }
}

export default createDatabase;