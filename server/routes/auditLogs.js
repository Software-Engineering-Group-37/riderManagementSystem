import express from 'express';
import pool from '../database/dbPool.js';
import { verifyAdmin, verifySuperAdmin, verifyToken } from '../middleware/auth.js';

const router = express.Router();

// // Get audit logs based on type with filtering and search
// router.get('/audit-logs/:type', verifyToken, verifyAdmin, async (req, res) => {
//     const { type } = req.params;
//     const { 
//         startDate, 
//         endDate, 
//         search = '', 
//         page = 1, 
//         limit = 25,
//         adminId 
//     } = req.query;
    
//     try {
//         let query = '';
//         let countQuery = '';
//         let queryParams = [];
//         let paramIndex = 1;
        
//         // Build different queries based on audit type
//         switch (type.toLowerCase()) {
//             case 'rider-shift-assignments':
//                 query = `
//                     SELECT 
//                         s.id as audit_id,
//                         'shift-assignment' as audit_type,
//                         s.created_at as audit_date,
//                         s.start_date,
//                         s.end_date,
//                         s.start_time,
//                         s.end_time,
//                         s.status,
//                         r.name as rider_name,
//                         r.email as rider_email,
//                         r.phone as rider_phone,
//                         z.name as zone_name,
//                         u.name as performed_by_admin,
//                         u.email as admin_email,
//                         CONCAT('Assigned ', r.name, ' to ', z.name, ' from ', s.start_date, ' to ', s.end_date) as description
//                     FROM shifts s
//                     JOIN riders r ON s.rider_id = r.id
//                     JOIN zones z ON s.zone_id = z.id
//                     JOIN users u ON s.user_id = u.id
//                     WHERE s.end_date < CURRENT_DATE
//                 `;
                
//                 countQuery = `
//                     SELECT COUNT(*) 
//                     FROM shifts s
//                     JOIN riders r ON s.rider_id = r.id
//                     JOIN zones z ON s.zone_id = z.id
//                     JOIN users u ON s.user_id = u.id
//                     WHERE s.end_date < CURRENT_DATE
//                 `;
//                 break;
                
//             case 'rider-registrations':
//                 query = `
//                     SELECT 
//                         r.id as audit_id,
//                         'rider-registration' as audit_type,
//                         r.created_at as audit_date,
//                         r.name as rider_name,
//                         r.email as rider_email,
//                         r.phone as rider_phone,
//                         r.is_active,
//                         u.name as performed_by_admin,
//                         u.email as admin_email,
//                         CONCAT('Registered new rider: ', r.name, ' (', r.email, ')') as description
//                     FROM riders r
//                     JOIN users u ON r.user_id = u.id
//                 `;
                
//                 countQuery = `
//                     SELECT COUNT(*) 
//                     FROM riders r
//                     JOIN users u ON r.user_id = u.id
//                 `;
//                 break;
                
//             case 'shift-deletions':
//                 query = `
//                     SELECT 
//                         sd.id as audit_id,
//                         'shift-deletion' as audit_type,
//                         sd.deleted_at as audit_date,
//                         s.start_date,
//                         s.end_date,
//                         s.start_time,
//                         s.end_time,
//                         r.name as rider_name,
//                         r.email as rider_email,
//                         z.name as zone_name,
//                         u.name as performed_by_admin,
//                         u.email as admin_email,
//                         CONCAT('Deleted shift: ', r.name, ' at ', z.name, ' (', s.start_date, ')') as description
//                     FROM shifts_deletion sd
//                     JOIN shifts s ON sd.shift_id = s.id
//                     JOIN riders r ON s.rider_id = r.id
//                     JOIN zones z ON s.zone_id = z.id
//                     JOIN users u ON sd.deleted_by = u.id
//                     WHERE 1=1
//             `;

//             countQuery = `
//                 SELECT COUNT(*) 
//                 FROM shifts_deletion sd
//                 JOIN shifts s ON sd.shift_id = s.id
//                 JOIN riders r ON s.rider_id = r.id
//                 JOIN zones z ON s.zone_id = z.id
//                 JOIN users u ON sd.deleted_by = u.id
//                 WHERE 1=1
//             `;
//             break;
            
// // Fix the admin-registrations case by removing the invalid SQL comment:

//             case 'admin-registrations':
//                 query = `
//                     SELECT 
//                         u.id as audit_id,
//                         'admin-registration' as audit_type,
//                         u.created_at as audit_date,
//                         u.name as admin_name,
//                         u.email as admin_email,
//                         r.name as role_name,
//                         creator.name as performed_by_admin,
//                         creator.email as registered_by_admin_email,
//                         CONCAT('Registered new admin: ', u.name, ' with role ', r.name) as description
//                     FROM users u
//                     JOIN roles r ON u.role_id = r.id
//                     LEFT JOIN users creator ON u.user_id = creator.id
//                     WHERE u.role_id IS NOT NULL
//                 `;
                
//                 countQuery = `
//                     SELECT COUNT(*) 
//                     FROM users u
//                     JOIN roles r ON u.role_id = r.id
//                     LEFT JOIN users creator ON u.user_id = creator.id
//                     WHERE u.role_id IS NOT NULL
//                 `;
//                 break;

//             default:
//                 return res.status(400).json({ error: 'Invalid audit type',
//                     validTypes: ['rider-shift-assignments', 'rider-registrations', 'shift-deletions', 'admin-registrations']
//                 });
//         }
        
//         // Add date filtering
//         if (startDate) {
//             const dateColumn = type === 'shift-deletions' ? 'sd.deleted_at' : 
//                              type === 'admin-registrations' ? 'u.created_at' : 
//                              type === 'rider-registrations' ? 'r.created_at' : 's.created_at';
            
//             query += ` AND ${dateColumn}::date >= $${paramIndex}`;
//             countQuery += ` AND ${dateColumn}::date >= $${paramIndex}`;
//             queryParams.push(startDate);
//             paramIndex++;
//         }
        
//         if (endDate) {
//             const dateColumn = type === 'shift-deletions' ? 'sd.deleted_at' : 
//                              type === 'admin-registrations' ? 'u.created_at' : 
//                              type === 'rider-registrations' ? 'r.created_at' : 's.created_at';
            
//             query += ` AND ${dateColumn}::date <= $${paramIndex}`;
//             countQuery += ` AND ${dateColumn}::date <= $${paramIndex}`;
//             queryParams.push(endDate);
//             paramIndex++;
//         }
        
//         // Add search filtering
//         if (search) {
//             let searchCondition = '';
//             switch (type.toLowerCase()) {
//                 case 'rider-shift-assignments':
//                     searchCondition = `(r.name ILIKE $${paramIndex} OR z.name ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`;
//                     break;
//                 case 'rider-registrations':
//                     searchCondition = `(r.name ILIKE $${paramIndex} OR r.email ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`;
//                     break;
//                 case 'shift-deletions':
//                     searchCondition = `(r.name ILIKE $${paramIndex} OR z.name ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`;
//                     break;
//                 case 'admin-registrations':
//                     searchCondition = `(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR r.name ILIKE $${paramIndex})`;
//                     break;
//             }
            
//             query += ` AND ${searchCondition}`;
//             countQuery += ` AND ${searchCondition}`;
//             queryParams.push(`%${search}%`);
//             paramIndex++;
//         }
        
//         // Add admin filtering (if specified)
//         if (adminId) {
//             let adminCondition = '';
//             switch (type.toLowerCase()) {
//                 case 'rider-shift-assignments':
//                     adminCondition = `s.user_id = $${paramIndex}`;
//                     break;
//                 case 'rider-registrations':
//                     adminCondition = `r.user_id = $${paramIndex}`;
//                     break;
//                 case 'shift-deletions':
//                     adminCondition = `sd.deleted_by = $${paramIndex}`;
//                     break;
//                 case 'admin-registrations':
//                     adminCondition = `u.user_id = $${paramIndex}`;
//                     break;
//             }
            
//             query += ` AND ${adminCondition}`;
//             countQuery += ` AND ${adminCondition}`;
//             queryParams.push(adminId);
//             paramIndex++;
//         }
        
//         // Get total count for pagination
//         const countResult = await pool.query(countQuery, queryParams);
//         const totalCount = parseInt(countResult.rows[0].count);
        
//         // Add ordering and pagination
//         const dateColumn = type === 'shift-deletions' ? 'sd.deleted_at' : 
//                           type === 'admin-registrations' ? 'u.created_at' : 
//                           type === 'rider-registrations' ? 'r.created_at' : 's.created_at';
        
//         query += ` ORDER BY ${dateColumn} DESC`;
//         query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
//         queryParams.push(parseInt(limit));
//         queryParams.push((parseInt(page) - 1) * parseInt(limit));
        
//         // Execute main query
//         const result = await pool.query(query, queryParams);
        
//         // Calculate pagination info
//         const totalPages = Math.ceil(totalCount / parseInt(limit));
        
//         res.status(200).json({
//             data: result.rows,
//             pagination: {
//                 currentPage: parseInt(page),
//                 totalPages,
//                 totalCount,
//                 hasNextPage: parseInt(page) < totalPages,
//                 hasPreviousPage: parseInt(page) > 1
//             },
//             filters: {
//                 type,
//                 startDate,
//                 endDate,
//                 search,
//                 adminId
//             }
//         });
//     } catch (error) {
//         console.error('Error fetching audit logs:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

// Get audit logs with role-based filtering
router.get('/audit-logs/:type', verifyToken, verifyAdmin, async (req, res) => {
    const { type } = req.params;
    const { page = 1, limit = 25, startDate, endDate, search, adminId } = req.query;
    const { user } = req; // From middleware
    
    try {
        // Check user role and filter allowed types
        const userRole = await pool.query('SELECT r.name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1', [user.id]);
        const roleName = userRole.rows[0]?.name;
        
        const isSuperAdmin = roleName === 'superadmin';
        const isAdmin = !isSuperAdmin && roleName && roleName.includes('');

        const allowedTypes = {
            superadmin: ['rider-shift-assignments', 'rider-registrations', 'shift-deletions', 'admin-registrations'],
            admin: ['rider-shift-assignments', 'rider-registrations']
        };

        const canAccess = isSuperAdmin
            ? allowedTypes.superadmin.includes(type)
            : isAdmin
                ? allowedTypes.admin.includes(type)
                : false;

        if (!canAccess) {
            return res.status(403).json({
                error: 'Access denied to this audit type',
                allowedTypes: isSuperAdmin ? allowedTypes.superadmin : isAdmin ? allowedTypes.admin : []
            });
        }
        
        // Build query based on type and role restrictions
        let baseQuery;
        let countQuery;
        let queryParams = [];
        let paramIndex = 1;
        
        // Base queries for different audit types
        switch (type) {
            case 'rider-shift-assignments':
                baseQuery = `
                    SELECT 
                        s.id as audit_id,
                        'rider-shift-assignments' as audit_type,
                        s.created_at as audit_date,
                        'Shift assignment completed' as description,
                        u.name as performed_by_admin,
                        r.name as rider_name,
                        z.name as zone_name,
                        s.start_date,
                        s.end_date,
                        s.start_time,
                        s.end_time,
                        s.status
                    FROM shifts s
                    JOIN riders r ON s.rider_id = r.id
                    JOIN zones z ON s.zone_id = z.id
                    JOIN users u ON s.user_id = u.id
                    WHERE s.status IN ('completed', 'cancelled')
                `;
                countQuery = `
                    SELECT COUNT(*) as total
                    FROM shifts s
                    JOIN riders r ON s.rider_id = r.id
                    JOIN zones z ON s.zone_id = z.id
                    JOIN users u ON s.user_id = u.id
                    WHERE s.status IN ('completed', 'cancelled')
                `;
                break;
                
            case 'rider-registrations':
                baseQuery = `
                    SELECT 
                        r.id as audit_id,
                        'rider-registrations' as audit_type,
                        r.created_at as audit_date,
                        'Rider registered' as description,
                        u.name as performed_by_admin,
                        r.name as rider_name,
                        r.email as rider_email,
                        r.phone as rider_phone,
                        r.is_active
                    FROM riders r
                    JOIN users u ON r.user_id = u.id
                    WHERE 1=1
                `;
                countQuery = `
                    SELECT COUNT(*) as total
                    FROM riders r
                    JOIN users u ON r.user_id = u.id
                    WHERE 1=1
                `;
                break;
                
            case 'shift-deletions':
                // This would require a separate audit table for deletions
                // For now, we'll show cancelled shifts
                baseQuery = `
                    SELECT 
                        s.id as audit_id,
                        'shift-deletions' as audit_type,
                        s.updated_at as audit_date,
                        'Shift cancelled/deleted' as description,
                        u.name as performed_by_admin,
                        r.name as rider_name,
                        z.name as zone_name,
                        s.start_date,
                        s.end_date
                    FROM shifts s
                    JOIN riders r ON s.rider_id = r.id
                    JOIN zones z ON s.zone_id = z.id
                    JOIN users u ON s.user_id = u.id
                    WHERE s.status = 'cancelled'
                `;
                countQuery = `
                    SELECT COUNT(*) as total
                    FROM shifts s
                    JOIN riders r ON s.rider_id = r.id
                    JOIN zones z ON s.zone_id = z.id
                    JOIN users u ON s.user_id = u.id
                    WHERE s.status = 'cancelled'
                `;
                break;
                
            case 'admin-registrations':
                // Only superadmin can access this
                if (roleName !== 'superadmin') {
                    return res.status(403).json({ error: 'Access denied to admin registration logs' });
                }
                baseQuery = `
                    SELECT 
                        u.id as audit_id,
                        'admin-registrations' as audit_type,
                        u.created_at as audit_date,
                        'Admin registered' as description,
                        creator.name as performed_by_admin,
                        u.name as admin_name,
                        u.email as admin_email,
                        r.name as role_name
                    FROM users u
                    JOIN roles r ON u.role_id = r.id
                    LEFT JOIN users creator ON u.user_id = creator.id
                    WHERE u.role_id IS NOT NULL
                `;
                countQuery = `
                    SELECT COUNT(*) as total
                    FROM users u
                    JOIN roles r ON u.role_id = r.id
                    WHERE u.role_id IS NOT NULL
                `;
                break;
                
            default:
                return res.status(400).json({ error: 'Invalid audit type' });
        }
        
        // Add filters
        let whereConditions = [];
        
        if (startDate) {
            whereConditions.push(`DATE(${type === 'shift-deletions' ? 's.updated_at' : type === 'admin-registrations' ? 'u.created_at' : type === 'rider-registrations' ? 'r.created_at' : 's.created_at'}) >= $${paramIndex}`);
            queryParams.push(startDate);
            paramIndex++;
        }
        
        if (endDate) {
            whereConditions.push(`DATE(${type === 'shift-deletions' ? 's.updated_at' : type === 'admin-registrations' ? 'u.created_at' : type === 'rider-registrations' ? 'r.created_at' : 's.created_at'}) <= $${paramIndex}`);
            queryParams.push(endDate);
            paramIndex++;
        }
        
        if (search) {
            const searchCondition = type === 'admin-registrations' 
                ? `(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR r.name ILIKE $${paramIndex})`
                : `(r.name ILIKE $${paramIndex} OR r.email ILIKE $${paramIndex} OR z.name ILIKE $${paramIndex})`;
            whereConditions.push(searchCondition);
            queryParams.push(`%${search}%`);
            paramIndex++;
        }
        
        if (adminId) {
            const adminCondition = type === 'admin-registrations' ? 'creator.id = $' : 'u.id = $';
            whereConditions.push(`${adminCondition}${paramIndex}`);
            queryParams.push(adminId);
            paramIndex++;
        }
        
        // Append WHERE conditions
        if (whereConditions.length > 0) {
            const whereClause = ` AND ${whereConditions.join(' AND ')}`;
            baseQuery += whereClause;
            countQuery += whereClause;
        }
        
        // Add ordering and pagination
        const orderBy = ` ORDER BY ${type === 'shift-deletions' ? 's.updated_at' : type === 'admin-registrations' ? 'u.created_at' : type === 'rider-registrations' ? 'r.created_at' : 's.created_at'} DESC`;
        const offset = (page - 1) * limit;
        const paginationClause = ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryParams.push(limit, offset);
        
        // Execute queries
        const [dataResult, countResult] = await Promise.all([
            pool.query(baseQuery + orderBy + paginationClause, queryParams.slice(0, -2).concat(queryParams.slice(-2))),
            pool.query(countQuery, queryParams.slice(0, -2))
        ]);
        
        const totalCount = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalCount / limit);
        
        res.json({
            data: dataResult.rows,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalCount,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            },
            filters: {
                type,
                startDate,
                endDate,
                search,
                adminId
            },
            userRole: roleName,
            allowedTypes: allowedTypes[roleName] || []
        });
        
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get audit log statistics/summary
router.get('/audit-stats', verifyToken, verifyAdmin, async (req, res) => {
    const { startDate, endDate } = req.query;
    
    try {
        let dateFilter = '';
        let queryParams = [];
        
        if (startDate && endDate) {
            dateFilter = `WHERE created_at::date BETWEEN $1 AND $2`;
            queryParams = [startDate, endDate];
        }
        
        // Get comprehensive stats
        const statsQuery = `
            SELECT 
                -- Shift assignments (past)
                (SELECT COUNT(*) FROM shifts WHERE end_date < CURRENT_DATE ${dateFilter ? `AND created_at::date BETWEEN $1 AND $2` : ''}) as total_past_shifts,
                
                -- Rider registrations
                (SELECT COUNT(*) FROM riders ${dateFilter ? `WHERE created_at::date BETWEEN $1 AND $2` : ''}) as total_rider_registrations,
                
                -- Shift deletions
                (SELECT COUNT(*) FROM shifts_deletion ${dateFilter ? `WHERE deleted_at::date BETWEEN $1 AND $2` : ''}) as total_shift_deletions,
                
                -- Admin activities
                (SELECT COUNT(*) FROM users WHERE role_id IS NOT NULL ${dateFilter ? `AND created_at::date BETWEEN $1 AND $2` : ''}) as total_admin_activities,
                
                -- Most active admin
                (SELECT u.name FROM users u 
                 JOIN (
                     SELECT user_id, COUNT(*) as activity_count 
                     FROM (
                         SELECT user_id FROM riders ${dateFilter ? `WHERE created_at::date BETWEEN $1 AND $2` : ''}
                         UNION ALL
                         SELECT user_id FROM shifts ${dateFilter ? `WHERE created_at::date BETWEEN $1 AND $2` : ''}
                     ) activities 
                     GROUP BY user_id 
                     ORDER BY activity_count DESC 
                     LIMIT 1
                 ) most_active ON u.id = most_active.user_id
                ) as most_active_admin
        `;
        
        const statsResult = await pool.query(statsQuery, queryParams);
        
        // Get daily activity for the period
        const dailyActivityQuery = `
            SELECT 
                date_trunc('day', audit_date) as date,
                audit_type,
                COUNT(*) as count
            FROM (
                SELECT created_at as audit_date, 'rider-registration' as audit_type FROM riders
                UNION ALL
                SELECT created_at as audit_date, 'shift-assignment' as audit_type FROM shifts
                UNION ALL
                SELECT deleted_at as audit_date, 'shift-deletion' as audit_type FROM shifts_deletion
                UNION ALL
                SELECT created_at as audit_date, 'admin-activity' as audit_type FROM users WHERE role_id IS NOT NULL
            ) all_activities
            ${dateFilter ? `WHERE audit_date::date BETWEEN $1 AND $2` : ''}
            GROUP BY date_trunc('day', audit_date), audit_type
            ORDER BY date DESC
            LIMIT 30
        `;
        
        const dailyActivityResult = await pool.query(dailyActivityQuery, queryParams);
        
        res.status(200).json({
            summary: statsResult.rows[0],
            dailyActivity: dailyActivityResult.rows,
            dateRange: { startDate, endDate }
        });
    } catch (error) {
        console.error('Error fetching audit statistics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
 
// Get list of admins for filtering dropdown
router.get('/audit-admins', verifyToken, verifySuperAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT 
                u.id, 
                u.name, 
                u.email,
                COUNT(activities.activity) as total_activities
            FROM users u
            LEFT JOIN (
                SELECT user_id, 'rider' as activity FROM riders
                UNION ALL
                SELECT user_id, 'shift' as activity FROM shifts
                UNION ALL
                SELECT deleted_by as user_id, 'deletion' as activity FROM shifts_deletion
            ) activities ON u.id = activities.user_id
            WHERE u.role_id IS NOT NULL
            GROUP BY u.id, u.name, u.email
            HAVING COUNT(activities.activity) > 0
            ORDER BY total_activities DESC, u.name
        `);
        
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching audit admins:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Fixed Export audit logs to CSV endpoint
router.get('/audit-logs/:type/export', verifyToken, verifyAdmin, async (req, res) => {
    const { type } = req.params;
    const { startDate, endDate, search, adminId } = req.query;
    
    try {
        let query = '';
        let queryParams = [];
        let paramIndex = 1;
        
        // Build query based on type - FIX: Use correct table aliases and remove wrong WHERE conditions
        switch (type.toLowerCase()) {
            case 'rider-shift-assignments':
                query = `
                    SELECT 
                        s.created_at as "Date Created",
                        r.name as "Rider Name",
                        r.email as "Rider Email",
                        r.phone as "Rider Phone",
                        z.name as "Zone Name",
                        s.start_date as "Start Date",
                        s.end_date as "End Date",
                        s.start_time as "Start Time",
                        s.end_time as "End Time",
                        s.status as "Status",
                        u.name as "Assigned By Admin"
                    FROM shifts s
                    JOIN riders r ON s.rider_id = r.id
                    JOIN zones z ON s.zone_id = z.id
                    JOIN users u ON s.user_id = u.id
                    WHERE s.end_date < CURRENT_DATE
                `;
                break;
                
            case 'rider-registrations':
                query = `
                    SELECT 
                        r.created_at as "Date Created",
                        r.name as "Rider Name",
                        r.email as "Rider Email",
                        r.phone as "Rider Phone",
                        CASE WHEN r.is_active THEN 'Active' ELSE 'Inactive' END as "Status",
                        u.name as "Registered By Admin"
                    FROM riders r
                    JOIN users u ON r.user_id = u.id
                    WHERE 1=1
                `;
                break;
                
            // In the /audit-logs/:type/export route, fix the shift-deletions case:

            case 'shift-deletions':
                query = `
                    SELECT 
                        sd.deleted_at as "Date Deleted",
                        r.name as "Rider Name",
                        r.email as "Rider Email",
                        z.name as "Zone Name",
                        s.start_date as "Start Date",
                        s.end_date as "End Date",
                        s.start_time as "Start Time",
                        s.end_time as "End Time",
                        u.name as "Deleted By Admin"
                    FROM shifts_deletion sd
                    JOIN shifts s ON sd.shift_id = s.id
                    JOIN riders r ON s.rider_id = r.id
                    JOIN zones z ON s.zone_id = z.id
                    JOIN users u ON sd.deleted_by = u.id
                    WHERE 1=1
                `;
            break;
                
            case 'admin-registrations':
    query = `
        SELECT 
            u.created_at as "Date Created",
            u.name as "Admin Name",
            u.email as "Admin Email",
            r.name as "Role",
            creator.name as "Registered By Admin"
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN users creator ON u.user_id = creator.id
        WHERE u.role_id IS NOT NULL
    `;
    break;
                
            default:
                return res.status(400).json({ error: 'Invalid audit type' });
        }
        
        // Apply date filtering - FIX: Use correct date columns for each type
        if (startDate) {
            let dateColumn;
            switch (type.toLowerCase()) {
                case 'shift-deletions':
                    dateColumn = 'sd.deleted_at';
                    break;
                case 'admin-registrations':
                    dateColumn = 'u.created_at';
                    break;
                case 'rider-registrations':
                    dateColumn = 'r.created_at';
                    break;
                default:
                    dateColumn = 's.created_at';
            }
            
            query += ` AND ${dateColumn}::date >= $${paramIndex}`;
            queryParams.push(startDate);
            paramIndex++;
        }
        
        if (endDate) {
            let dateColumn;
            switch (type.toLowerCase()) {
                case 'shift-deletions':
                    dateColumn = 'sd.deleted_at';
                    break;
                case 'admin-registrations':
                    dateColumn = 'u.created_at';
                    break;
                case 'rider-registrations':
                    dateColumn = 'r.created_at';
                    break;
                default:
                    dateColumn = 's.created_at';
            }
            
            query += ` AND ${dateColumn}::date <= $${paramIndex}`;
            queryParams.push(endDate);
            paramIndex++;
        }
        
        // Apply search filtering - FIX: Use correct search conditions
        if (search) {
            let searchCondition;
            switch (type.toLowerCase()) {
                case 'rider-shift-assignments':
                    searchCondition = `(r.name ILIKE $${paramIndex} OR z.name ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`;
                    break;
                case 'rider-registrations':
                    searchCondition = `(r.name ILIKE $${paramIndex} OR r.email ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`;
                    break;
                case 'shift-deletions':
                    searchCondition = `(r.name ILIKE $${paramIndex} OR z.name ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`;
                    break;
                case 'admin-registrations':
                    searchCondition = `(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR r.name ILIKE $${paramIndex})`;
                    break;
            }
            
            query += ` AND ${searchCondition}`;
            queryParams.push(`%${search}%`);
            paramIndex++;
        }
        
        // Apply admin filtering - FIX: Use correct admin columns
        if (adminId) {
            let adminCondition;
            switch (type.toLowerCase()) {
                case 'rider-shift-assignments':
                    adminCondition = `s.user_id = $${paramIndex}`;
                    break;
                case 'rider-registrations':
                    adminCondition = `r.user_id = $${paramIndex}`;
                    break;
                case 'shift-deletions':
                    adminCondition = `sd.deleted_by = $${paramIndex}`;
                    break;
                case 'admin-registrations':
                    adminCondition = `u.user_id = $${paramIndex}`;
                    break;
            }
            
            query += ` AND ${adminCondition}`;
            queryParams.push(adminId);
            paramIndex++;
        }
        
        // Add ordering - FIX: Use correct date columns
        let orderColumn;
        switch (type.toLowerCase()) {
            case 'shift-deletions':
                orderColumn = 'sd.deleted_at';
                break;
            case 'admin-registrations':
                orderColumn = 'u.created_at';
                break;
            case 'rider-registrations':
                orderColumn = 'r.created_at';
                break;
            default:
                orderColumn = 's.created_at';
        }
        query += ` ORDER BY ${orderColumn} DESC`;
        
        console.log('Export Query:', query);
        console.log('Export Params:', queryParams);
        
        const result = await pool.query(query, queryParams);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No data found for export' });
        }
        
        // Convert to CSV format - FIX: Proper CSV escaping
        const headers = Object.keys(result.rows[0]);
        const csvContent = [
            headers.join(','),
            ...result.rows.map(row => 
                headers.map(header => {
                    let value = row[header];
                    if (value === null || value === undefined) {
                        value = '';
                    }
                    // Escape quotes and wrap in quotes if contains comma or quote
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                        value = `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',')
            )
        ].join('\n');
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${type}-audit-${new Date().toISOString().split('T')[0]}.csv"`);
        res.status(200).send(csvContent);
    } catch (error) {
        console.error('Error exporting audit logs:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

//shift deletion logs
router.get('/shiftDeletion', verifyToken, verifySuperAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                sd.id as deletion_id,
                sd.deleted_at,
                s.id as shift_id,
                s.start_date,
                s.end_date,
                s.start_time, 
                s.end_time,
                s.status,
                r.name as rider_name,
                r.email as rider_email,
                z.name as zone_name,
                u.name as deleted_by_name
            FROM shifts_deletion sd
            JOIN shifts s ON sd.shift_id = s.id
            JOIN riders r ON s.rider_id = r.id
            JOIN zones z ON s.zone_id = z.id
            JOIN users u ON sd.deleted_by = u.id
            ORDER BY sd.deleted_at DESC
        `);
        
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching shift deletion logs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

//admin registration logs
router.get('/adminRegLogs', verifyToken, verifySuperAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.*, r.name AS role_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.role_id IS NOT NULL
            ORDER BY u.created_at DESC
        `);
        
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching admin registration logs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;