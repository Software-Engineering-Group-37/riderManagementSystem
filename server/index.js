import cookieParser from 'cookie-parser';
import cors from 'cors';
import { configDotenv } from 'dotenv';
import express from 'express';
import createDatabase from './database/databaseInstall.js';
import adminRoute from './routes/admin.js';
import announcementRoute from './routes/announcement.js';
import auditLogsRoute from './routes/auditLogs.js';
import riderRoute from './routes/rider.js';
import roleRoute from './routes/roles.js';
import settingsRoute from './routes/settings.js';
import shiftRoute from './routes/shifts.js';
import zoneRoute from './routes/zones.js';






configDotenv();
const app = express();
const PORT = process.env.PORT || 4000;

//only cors for my react app
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); 
createDatabase();

// app.use("/rider", riderRoute);
app.use("/admin", adminRoute, riderRoute, settingsRoute, auditLogsRoute, announcementRoute,roleRoute, zoneRoute, shiftRoute);

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
