import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

// Create transporter for Gmail SMTP
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // Use TLS
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

// Email templates
const getAdminWelcomeEmailTemplate = (name, email, password, roleName) => {
    return {
        subject: `Welcome to ${process.env.COMPANY_NAME} - Admin Access`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to ${process.env.COMPANY_NAME}</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #1680E4; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1680E4; }
                    .button { display: inline-block; background: #1680E4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
                    .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Welcome to ${process.env.COMPANY_NAME}</h1>
                        <p>Rider Management System - Admin Access</p>
                    </div>
                    
                    <div class="content">
                        <h2>Hello ${name}!</h2>
                        
                        <p>Congratulations! You have been granted admin access to our Rider Management System. Your account has been created with the following details:</p>
                        
                        <div class="credentials">
                            <h3>📋 Your Login Credentials</h3>
                            <p><strong>Email:</strong> ${email}</p>
                            <p><strong>Password:</strong> <code style="background: #f1f1f1; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${password}</code></p>
                            <p><strong>Role:</strong> ${roleName}</p>
                        </div>
                        
                        <div class="warning">
                            <strong>🔐 Security Notice:</strong> For security reasons, please change your password after your first login.
                        </div>
                        
                        <p>You can access the admin portal using the button below:</p>
                        
                        <div style="text-align: center;">
                            <a href="${process.env.WEBSITE_URL}/login" class="button">
                                🚀 Access Admin Portal
                            </a>
                        </div>
                        
                        <h3>📚 Getting Started</h3>
                        <ul>
                            <li>Manage rider registrations and profiles</li>
                            <li>Create and assign shifts</li>
                            <li>Monitor system activity</li>
                            <li>Manage zones and announcements</li>
                        </ul>
                        
                        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                    </div>
                    
                    <div class="footer">
                        <p>This email was sent from ${process.env.COMPANY_NAME} Rider Management System</p>
                        <p>Please do not reply to this email. If you need help, contact your system administrator.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
Welcome to ${process.env.COMPANY_NAME} - Rider Management System

Hello ${name}!

Congratulations! You have been granted admin access to our Rider Management System.

Your Login Credentials:
- Email: ${email}
- Password: ${password}
- Role: ${roleName}

SECURITY NOTICE: For security reasons, please change your password after your first login.

Access the admin portal at: ${process.env.WEBSITE_URL}/login

Getting Started:
- Manage rider registrations and profiles
- Create and assign shifts
- Monitor system activity
- Manage zones and announcements

If you have any questions, please contact your system administrator.

---
This email was sent from ${process.env.COMPANY_NAME} Rider Management System
        `
    };
};

// Send admin welcome email
export const sendAdminWelcomeEmail = async (name, email, password, roleName) => {
    try {
        console.log('📧 Preparing to send welcome email to:', email);
        
        const transporter = createTransporter();
        const emailTemplate = getAdminWelcomeEmailTemplate(name, email, password, roleName);
        
        const mailOptions = {
            from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
            to: email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text
        };
        
        console.log('📤 Sending email...');
        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅ Email sent successfully:', info.messageId);
        return {
            success: true,
            messageId: info.messageId,
            message: 'Welcome email sent successfully'
        };
        
    } catch (error) {
        console.error('❌ Error sending email:', error);
        return {
            success: false,
            error: error.message,
            message: 'Failed to send welcome email'
        };
    }
};

// Test email connection
export const testEmailConnection = async () => {
    try {
        const transporter = createTransporter();
        await transporter.verify();
        console.log('✅ SMTP connection verified');
        return { success: true, message: 'SMTP connection verified' };
    } catch (error) {
        console.error('❌ SMTP connection failed:', error);
        return { success: false, error: error.message };
    }
};


// Add this function to your existing emailService.js file:

// Email template for rider welcome
const getRiderWelcomeEmailTemplate = (name, email, password, phone) => {
    return {
        subject: `Welcome to ${process.env.COMPANY_NAME} - Your Rider Account`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to ${process.env.COMPANY_NAME}</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #1680E4; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1680E4; }
                    .button { display: inline-block; background: #1680E4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
                    .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
                    .app-links { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🚴‍♂️ Welcome to ${process.env.COMPANY_NAME}</h1>
                        <p>Your Rider Account is Ready!</p>
                    </div>
                    
                    <div class="content">
                        <h2>Hello ${name}!</h2>
                        
                        <p>Welcome to our delivery team! Your rider account has been successfully created. You can now start taking delivery shifts and earning money.</p>
                        
                        <div class="credentials">
                            <h3>📱 Your Login Credentials</h3>
                            <p><strong>Email:</strong> ${email}</p>
                            <p><strong>Password:</strong> <code style="background: #f1f1f1; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${password}</code></p>
                            <p><strong>Phone:</strong> ${phone}</p>
                        </div>
                        
                        <div class="warning">
                            <strong>🔐 Security Notice:</strong> For security reasons, please change your password after your first login.
                        </div>
                        
                        <div class="app-links">
                            <h3>📲 Download Our Rider App</h3>
                            <p>Get started by downloading our mobile app:</p>
                            <div style="margin: 15px 0;">
                                <a href="#" style="display: inline-block; margin: 5px 10px;">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" style="height: 40px;">
                                </a>
                                <a href="#" style="display: inline-block; margin: 5px 10px;">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="Download on the App Store" style="height: 40px;">
                                </a>
                            </div>
                        </div>
                        
                        <p>You can also access the web portal using the button below:</p>
                        
                        <div style="text-align: center;">
                            <a href="${process.env.WEBSITE_URL}/rider-login" class="button">
                                🚀 Access Rider Portal
                            </a>
                        </div>
                        
                        <h3>🎯 What's Next?</h3>
                        <ul>
                            <li>Complete your profile setup</li>
                            <li>Browse available delivery shifts</li>
                            <li>Start earning money with flexible hours</li>
                            <li>Track your earnings and performance</li>
                        </ul>
                        
                        <p>If you have any questions or need assistance, please contact your administrator or our support team.</p>
                    </div>
                    
                    <div class="footer">
                        <p>This email was sent from ${process.env.COMPANY_NAME} Rider Management System</p>
                        <p>Please do not reply to this email. If you need help, contact your administrator.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
Welcome to ${process.env.COMPANY_NAME} - Rider Account

Hello ${name}!

Welcome to our delivery team! Your rider account has been successfully created.

Your Login Credentials:
- Email: ${email}
- Password: ${password}
- Phone: ${phone}

SECURITY NOTICE: For security reasons, please change your password after your first login.

Download our mobile app or access the rider portal at: ${process.env.WEBSITE_URL}/rider-login

What's Next:
- Complete your profile setup
- Browse available delivery shifts
- Start earning money with flexible hours
- Track your earnings and performance

If you have any questions, please contact your administrator.

---
This email was sent from ${process.env.COMPANY_NAME} Rider Management System
        `
    };
};

// Send rider welcome email
export const sendRiderWelcomeEmail = async (name, email, password, phone) => {
    try {
        console.log('📧 Preparing to send rider welcome email to:', email);
        
        const transporter = createTransporter();
        const emailTemplate = getRiderWelcomeEmailTemplate(name, email, password, phone);
        
        const mailOptions = {
            from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
            to: email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text
        };
        
        console.log('📤 Sending rider email...');
        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅ Rider email sent successfully:', info.messageId);
        return {
            success: true,
            messageId: info.messageId,
            message: 'Rider welcome email sent successfully'
        };
        
    } catch (error) {
        console.error('❌ Error sending rider email:', error);
        return {
            success: false,
            error: error.message,
            message: 'Failed to send rider welcome email'
        };
    }
};

// Add this function to your existing emailService.js file:

// Email template for rider password update
const getRiderPasswordUpdateEmailTemplate = (name, email, newPassword) => {
    return {
        subject: `${process.env.COMPANY_NAME} - Your Password Has Been Updated`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Password Updated - ${process.env.COMPANY_NAME}</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #1680E4; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1680E4; }
                    .button { display: inline-block; background: #1680E4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
                    .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
                    .security-notice { background: #e8f5e8; border: 1px solid #4caf50; padding: 15px; border-radius: 6px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 Password Updated</h1>
                        <p>${process.env.COMPANY_NAME} - Rider Account</p>
                    </div>
                    
                    <div class="content">
                        <h2>Hello ${name}!</h2>
                        
                        <p>Your account password has been updated by an administrator. Please use your new credentials to access your rider account.</p>
                        
                        <div class="credentials">
                            <h3>🔑 Your New Login Credentials</h3>
                            <p><strong>Email:</strong> ${email}</p>
                            <p><strong>New Password:</strong> <code style="background: #f1f1f1; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${newPassword}</code></p>
                        </div>
                        
                        <div class="security-notice">
                            <strong>🛡️ Security Update:</strong> Your password has been changed for security reasons. Please log in with your new password.
                        </div>
                        
                        <div class="warning">
                            <strong>🔐 Important:</strong> For additional security, we recommend changing this password after your next login to something memorable for you.
                        </div>
                        
                        <p>You can access your rider account using the button below:</p>
                        
                        <div style="text-align: center;">
                            <a href="${process.env.WEBSITE_URL}/rider-login" class="button">
                                📱 Access Rider Account
                            </a>
                        </div>
                        
                        <h3>📞 Need Help?</h3>
                        <p>If you have any questions about this password change or need assistance accessing your account, please contact your administrator.</p>
                        
                        <p><strong>Note:</strong> If you didn't request this password change, please contact your administrator immediately.</p>
                    </div>
                    
                    <div class="footer">
                        <p>This email was sent from ${process.env.COMPANY_NAME} Rider Management System</p>
                        <p>Please do not reply to this email. If you need help, contact your administrator.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
Password Updated - ${process.env.COMPANY_NAME}

Hello ${name}!

Your account password has been updated by an administrator.

Your New Login Credentials:
- Email: ${email}
- New Password: ${newPassword}

SECURITY UPDATE: Your password has been changed for security reasons. Please log in with your new password.

IMPORTANT: For additional security, we recommend changing this password after your next login to something memorable for you.

Access your rider account at: ${process.env.WEBSITE_URL}/rider-login

If you have any questions about this password change or need assistance, please contact your administrator.

Note: If you didn't request this password change, please contact your administrator immediately.

---
This email was sent from ${process.env.COMPANY_NAME} Rider Management System
        `
    };
};

// Send rider password update email
export const sendRiderPasswordUpdateEmail = async (name, email, newPassword) => {
    try {
        console.log('📧 Preparing to send password update email to:', email);
        
        const transporter = createTransporter();
        const emailTemplate = getRiderPasswordUpdateEmailTemplate(name, email, newPassword);
        
        const mailOptions = {
            from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
            to: email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text
        };
        
        console.log('📤 Sending password update email...');
        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅ Password update email sent successfully:', info.messageId);
        return {
            success: true,
            messageId: info.messageId,
            message: 'Password update email sent successfully'
        };
        
    } catch (error) {
        console.error('❌ Error sending password update email:', error);
        return {
            success: false,
            error: error.message,
            message: 'Failed to send password update email'
        };
    }
};
// Add admin password update email template:

const getAdminPasswordUpdateEmailTemplate = (name, email, newPassword, roleName) => {
    return {
        subject: `${process.env.COMPANY_NAME} - Your Admin Password Has Been Updated`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Admin Password Updated - ${process.env.COMPANY_NAME}</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #1680E4; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1680E4; }
                    .button { display: inline-block; background: #1680E4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
                    .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
                    .security-notice { background: #e8f5e8; border: 1px solid #4caf50; padding: 15px; border-radius: 6px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 Admin Password Updated</h1>
                        <p>${process.env.COMPANY_NAME} - Admin Account</p>
                    </div>
                    
                    <div class="content">
                        <h2>Hello ${name}!</h2>
                        
                        <p>Your admin account password has been updated by a superadministrator. Please use your new credentials to access the admin portal.</p>
                        
                        <div class="credentials">
                            <h3>🔑 Your Updated Login Credentials</h3>
                            <p><strong>Email:</strong> ${email}</p>
                            <p><strong>New Password:</strong> <code style="background: #f1f1f1; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${newPassword}</code></p>
                            <p><strong>Role:</strong> ${roleName}</p>
                        </div>
                        
                        <div class="security-notice">
                            <strong>🛡️ Security Update:</strong> Your password has been changed for security reasons. Please log in with your new password.
                        </div>
                        
                        <div class="warning">
                            <strong>🔐 Important:</strong> For additional security, we recommend changing this password after your next login to something memorable for you.
                        </div>
                        
                        <p>You can access the admin portal using the button below:</p>
                        
                        <div style="text-align: center;">
                            <a href="${process.env.WEBSITE_URL}/login" class="button">
                                🚀 Access Admin Portal
                            </a>
                        </div>
                        
                        <p><strong>Note:</strong> If you didn't request this password change, please contact a superadministrator immediately.</p>
                    </div>
                    
                    <div class="footer">
                        <p>This email was sent from ${process.env.COMPANY_NAME} Rider Management System</p>
                        <p>Please do not reply to this email. If you need help, contact your system administrator.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
Admin Password Updated - ${process.env.COMPANY_NAME}

Hello ${name}!

Your admin account password has been updated by a superadministrator.

Your Updated Login Credentials:
- Email: ${email}
- New Password: ${newPassword}
- Role: ${roleName}

SECURITY UPDATE: Your password has been changed for security reasons. Please log in with your new password.

IMPORTANT: For additional security, we recommend changing this password after your next login.

Access the admin portal at: ${process.env.WEBSITE_URL}/login

Note: If you didn't request this password change, please contact a superadministrator immediately.

---
This email was sent from ${process.env.COMPANY_NAME} Rider Management System
        `
    };
};

// Send admin password update email
export const sendAdminPasswordUpdateEmail = async (name, email, newPassword, roleName) => {
    try {
        console.log('📧 Preparing to send admin password update email to:', email);
        
        const transporter = createTransporter();
        const emailTemplate = getAdminPasswordUpdateEmailTemplate(name, email, newPassword, roleName);
        
        const mailOptions = {
            from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
            to: email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text
        };
        
        console.log('📤 Sending admin password update email...');
        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅ Admin password update email sent successfully:', info.messageId);
        return {
            success: true,
            messageId: info.messageId,
            message: 'Admin password update email sent successfully'
        };
        
    } catch (error) {
        console.error('❌ Error sending admin password update email:', error);
        return {
            success: false,
            error: error.message,
            message: 'Failed to send admin password update email'
        };
    }
};