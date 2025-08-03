import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import pool from './dbPool.js';
dotenv.config();

async function seedSuperAdmin() {
    const client = await pool.connect();
    try {
        console.log("Checking for superadmin...");

        // Check if any user exists
        const userCount = await client.query('SELECT COUNT(*) FROM users');

        if (parseInt(userCount.rows[0].count) > 0) {
            console.log('superadmin already exists, skipping creation.');
            return;
        }
        
        await client.query("BEGIN");
        
        // Create or get superadmin role
        let roleResult = await client.query(
            "SELECT id FROM roles WHERE name = 'superadmin'"
        );
        
        if (roleResult.rows.length === 0) {
            roleResult = await client.query(
                "INSERT INTO roles (name) VALUES ('superadmin') RETURNING id"
            );
            console.log("Superadmin role created");
        }
        
        const superAdminRoleId = roleResult.rows[0].id;
        
        // Create superadmin with default credentials
        const hashedPassword = await bcrypt.hash('superadmin123', 10);
        const result = await client.query(
            'INSERT INTO users (name, email, password, role_id) VALUES ($1, $2, $3, $4) RETURNING *',
            ['superadmin', 'superadmin@example.com', hashedPassword, superAdminRoleId]
        );
        
        await client.query("COMMIT");
        
        console.log('✅ superadmin created successfully!');
        console.log('📧 Email: superadmin@example.com');
        console.log('🔑 Password: superadmin123');
        console.log('⚠️  Please change this password after first login!');
        
    } catch (error) {
        await client.query("ROLLBACK");
        console.error('❌ Error creating superadmin:', error);
    } finally {
        client.release();
    }
}

export default seedSuperAdmin;