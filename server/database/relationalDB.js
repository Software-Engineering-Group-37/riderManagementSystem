import pool from './dbPool.js';

async function createTables() {
    const client = await pool.connect(); // Get a client from the pool
    try {
        console.log("Connected to database");
        const createExtension = `
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        `;
        const createUsers = `
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
                user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(150) UNIQUE NOT NULL,
                password TEXT NOT NULL,
                photo_url TEXT,
                photo_public_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            );
        `;

        const createRoles = `
            CREATE TABLE IF NOT EXISTS roles (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(100) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        const createRiders = `
            CREATE TABLE IF NOT EXISTS riders (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                password TEXT NOT NULL,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(40) NOT NULL,
                phone VARCHAR(15),
                photo_url TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        const createZones = `
            CREATE TABLE IF NOT EXISTS zones (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(100) NOT NULL,
                latitude DOUBLE PRECISION,
                longitude DOUBLE PRECISION,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        const createShifts = `
            CREATE TABLE IF NOT EXISTS shifts (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                rider_id UUID REFERENCES riders(id) ON DELETE CASCADE,
                zone_id UUID REFERENCES zones(id),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
                assigned_by UUID REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        const createNotifications = `
            CREATE TABLE IF NOT EXISTS notifications (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES users(id),
                rider_id UUID REFERENCES riders(id),
                shift_id UUID REFERENCES shifts(id),
                message TEXT NOT NULL,
                type VARCHAR(20) CHECK (type IN ('info', 'success', 'error', 'warning')),
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        const createShiftsDeletion = `
            CREATE TABLE IF NOT EXISTS shifts_deletion (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE NOT NULL,
                deleted_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
                deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        //Announcements table
        const createAnnouncements = `
            CREATE TABLE IF NOT EXISTS announcements (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'info', -- 'info', 'warning', 'urgent', 'maintenance'
                priority VARCHAR(50) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
                target_audience VARCHAR(100) DEFAULT 'all', -- 'all', 'admins', 'riders', 'specific_zones'
                is_active BOOLEAN DEFAULT TRUE,
                expires_at TIMESTAMP,
                created_by UUID NOT NULL REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        //System configuration table
        const createSystemConfig = `
            CREATE TABLE IF NOT EXISTS system_config (
                id SERIAL PRIMARY KEY,
                key VARCHAR(100) UNIQUE NOT NULL,
                value TEXT NOT NULL,
                description TEXT,
                data_type VARCHAR(20) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_by_admin VARCHAR(255)
            );`;



        await client.query(createExtension);
        console.log("Extension created successfully");
        await client.query(createRoles);
        console.log("Table0 created successfully");
        await client.query(createUsers);
        console.log("Table1 created successfully");
        await client.query(createRiders);
        console.log("Table2 created successfully");
        await client.query(createZones);
        console.log("Table3 created successfully");
        await client.query(createShifts);
        console.log("Table4 created successfully");
        await client.query(createNotifications);
        console.log("Table5 created successfully");
        await client.query(createShiftsDeletion);
        console.log("Table6 created successfully");
        await client.query(createAnnouncements);
        console.log("Table7 created successfully");
        await client.query(createSystemConfig);
        console.log("Table8 created successfully");

    } catch (error) {
        console.error("Error creating table:", error);
    } finally {
        client.release();
        console.log("Database connection closed");
    }
}
export default createTables;