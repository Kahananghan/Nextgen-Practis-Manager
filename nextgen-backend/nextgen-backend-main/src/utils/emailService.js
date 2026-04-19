require('dotenv').config();
const nodemailer = require('nodemailer');
const logger = require('./logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'mail.smtp2go.com',
      port: 587,
      secure: false,
       auth: {
          user: process.env.SMTP2GO_USERNAME,
          pass: process.env.SMTP2GO_PASSWORD,
        },
      connectionTimeout: 45000, // 45 seconds connection timeout
      greetingTimeout: 20000,   // 20 seconds greeting timeout
      socketTimeout: 20000,     // 20 seconds socket timeout
      pool: false,              // Disable connection pooling to avoid stale connections
      maxConnections: 1,         // Single connection to avoid overload
      maxMessages: 10,           // Fewer messages per connection
      rateDelta: 5000,          // Longer rate limit window
      rateLimit: 1,             // Conservative rate limiting
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      },
      // Additional connection options for stability
      requireTLS: false,
      opportunisticTLS: true,
      // Add connection monitoring
      debug: process.env.NODE_ENV === 'development',
      // Add connection stability options
      name: 'nextgen-app',       // Identify application
      localAddress: null,       // Let system choose
      family: 4                  // Force IPv4 for stability
    });
  }

  /**
   * Recreate transporter with fresh connection
   */
  async recreateTransporter() {
    try {
      if (this.transporter) {
        await this.transporter.close();
      }
      
      this.transporter = nodemailer.createTransport({
        host: 'mail.smtp2go.com',
        port: 587,
        secure: false,
          auth: {
            user: process.env.SMTP2GO_USERNAME,
            pass: process.env.SMTP2GO_PASSWORD,
          },
        connectionTimeout: 45000,
        greetingTimeout: 20000,
        socketTimeout: 20000,
        pool: false,
        maxConnections: 1,
        maxMessages: 10,
        rateDelta: 5000,
        rateLimit: 1,
        tls: {
          rejectUnauthorized: false
        },
        requireTLS: false,
        opportunisticTLS: true,
        debug: process.env.NODE_ENV === 'development',
        name: 'nextgen-app',
        localAddress: null,
        family: 4
      });
      
      logger.info({ event: 'SMTP_TRANSPORTER_RECREATED' });
    } catch (error) {
      logger.error({
        event: 'SMTP_TRANSPORTER_RECREATE_FAILED',
        error: error.message
      });
      throw error;
    }
  }

  async sendMail(to, subject, body, retryCount = 0) {
    const maxRetries = 3;
    const retryDelay = (attempt) => Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff
    
    try {
      // Verify environment variables
      const hasCredentials = process.env.SMTP2GO_USERNAME && process.env.SMTP2GO_PASSWORD;
      const hasEmail = process.env.SMTP2GO_EMAIL;
      
      if (!hasEmail || !hasCredentials) {
        throw new Error('Missing SMTP2GO environment variables. Required: SMTP2GO_EMAIL or SMTP2GO_USERNAME and SMTP2GO_PASSWORD');
      }

      // Test connection before sending
      if (retryCount === 0) {
        try {
          await this.transporter.verify();
          logger.info({ event: 'SMTP_CONNECTION_VERIFIED' });
        } catch (connError) {
          logger.warn({
            event: 'SMTP_CONNECTION_TEST_FAILED',
            error: connError.message,
            recreating: true
          });
          // Recreate transporter if connection test fails
          await this.recreateTransporter();
        }
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        throw new Error(`Invalid email format: ${to}`);
      }

      
      const info = await this.transporter.sendMail({
        from: process.env.SMTP2GO_EMAIL,
        to: to,
        subject: subject,
        html: body,
      });
      
      logger.info({
        event: 'EMAIL_SENT_SUCCESS',
        to,
        subject,
        messageId: info.messageId
      });
      
      return info;
    } catch (error) {
      logger.error({
        event: 'EMAIL_SENDING_FAILED',
        to,
        subject,
        error: error.message,
        errorCode: error.code,
        stack: error.stack,
        retryCount
      });
      
      // Retry logic for connection-related errors
      if (retryCount < maxRetries && this.isConnectionError(error)) {
        logger.warn({
          event: 'EMAIL_RETRY_ATTEMPT',
          to,
          subject,
          retryCount: retryCount + 1,
          delay: retryDelay(retryCount),
          errorCode: error.code
        });
        
        // For ETIMEDOUT and ECONNRESET, reset connection pool before retry
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
          try {
            logger.info({
              event: 'EMAIL_CONNECTION_RESET_BEFORE_RETRY',
              to,
              subject,
              retryCount: retryCount + 1,
              errorCode: error.code
            });
            await this.resetConnectionPool();
          } catch (resetError) {
            logger.error({
              event: 'EMAIL_CONNECTION_RESET_FAILED',
              resetError: resetError.message
            });
          }
        }
        
        await this.delay(retryDelay(retryCount));
        return this.sendMail(to, subject, body, retryCount + 1);
      }
      
      // Re-throw to let calling code handle the error
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  isConnectionError(error) {
    const connectionErrorCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED', 'EPIPE'];
    const connectionErrorMessages = ['Connection timeout', 'Connection refused', 'Network error', 'socket hang up'];
    
    return connectionErrorCodes.includes(error.code) ||
           connectionErrorMessages.some(msg => error.message.includes(msg));
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset the connection pool to clear stale connections
   */
  async resetConnectionPool() {
    try {
      if (this.transporter) {
        // Close existing connections
        await this.transporter.close();
        logger.info({ event: 'EMAIL_CONNECTION_POOL_CLOSED' });
        
        // Add a small delay before recreating
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Recreate the transporter with fresh settings
        this.transporter = nodemailer.createTransport({
          host: 'mail.smtp2go.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.SMTP2GO_USERNAME,
            pass: process.env.SMTP2GO_PASSWORD,
          },
          connectionTimeout: 30000,  // Reduced timeout for faster failure detection
          greetingTimeout: 15000,     // Reduced greeting timeout
          socketTimeout: 15000,        // Reduced socket timeout
          pool: true,
          maxConnections: 3,          // Reduced connections to prevent overload
          maxMessages: 50,           // Reduced messages per connection
          rateDelta: 2000,            // Increased rate delta
          rateLimit: 3,               // Reduced rate limit
          tls: {
            rejectUnauthorized: false
          },
          // Add additional connection options
          requireTLS: false,
          opportunisticTLS: true,
          // Add idle timeout to prevent stale connections
          idleTimeout: 10000,
          // Add connection monitoring
          debug: process.env.NODE_ENV === 'development'
        });
        
        logger.info({ event: 'EMAIL_CONNECTION_POOL_RECREATED' });
      }
    } catch (error) {
      logger.error({
        event: 'EMAIL_CONNECTION_POOL_RESET_FAILED',
        error: error.message
      });
      // Throw error so retry logic can handle it
      throw error;
    }
  }

  async sendOTP(email, name, otp) {
  const subject = 'Your OTP Verification Code';

  const html = `
  <div style="font-family: Arial, sans-serif; background:#f3f4f6; padding:30px;">
    
    <div style="max-width:500px; margin:auto; background:white; padding:30px; border-radius:10px;">
      
      <h2 style="color:#333; text-align:center;">
        Practis Manager
      </h2>

      <p>Hello ${name || 'User'},</p>

      <p>
        Use the following One-Time Password (OTP) to complete your verification:
      </p>

      <div style="
        text-align:center;
        font-size:28px;
        letter-spacing:6px;
        font-weight:bold;
        color:#6366f1;
        background:#f5f5ff;
        padding:15px;
        border-radius:8px;
        margin:20px 0;
      ">
        ${otp}
      </div>

      <p>This OTP will expire in <b>10 minutes</b>.</p>

      <p style="color:#6b7280; font-size:14px;">
        If you did not request this code, please ignore this email.
      </p>

      <hr style="margin:25px 0;" />

      <p style="font-size:12px; color:#9ca3af; text-align:center;">
        © ${new Date().getFullYear()} Practis Manager. All rights reserved.
      </p>

    </div>
  </div>
  `;

  return this.sendMail(email, subject, html);
  }

  /**
   * Send email notification to staff for recurring job assignment
   * @param {string} email - Staff email address
   * @param {object} jobData - Job information
   * @param {object} patternData - Recurrence pattern information
   */
  async sendRecurringJobStaffNotification(email, jobData, patternData) {
    const subject = 'New Recurring Job Assignment';

    const html = `
    <div style="font-family: Arial, sans-serif; background:#f3f4f6; padding:30px;">
    
      <div style="max-width:500px; margin:auto; background:white; padding:30px; border-radius:10px;">
        
        <h2 style="color:#333; text-align:center;">
         Practis Manager
        </h2>

        <h3 style="color:#1f2937; margin-bottom:20px;">New Recurring Job Assigned</h3>

        <p>Hello,</p>

        <p>You have been assigned to a new automatically generated recurring job:</p>

        <div style="background:#f9fafb; padding:15px; border-radius:8px; margin:20px 0;">
          <p><strong>Job:</strong> ${jobData.name}</p>
          <p><strong>Description:</strong> ${jobData.description || 'No description'}</p>
          <p><strong>Due Date:</strong> ${new Date(jobData.dueDate).toLocaleDateString()}</p>
          <p><strong>Frequency:</strong> ${patternData.frequency}</p>
          <p><strong>Priority:</strong> ${jobData.priority || 'Normal'}</p>
        </div>

        <p>This is an automatically generated recurring job that will repeat ${patternData.frequency}. You can view more details and manage your tasks in your dashboard.</p>

        <div style="text-align:center; margin:25px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" 
             style="background:#6366f1; color:white; padding:12px 25px; text-decoration:none; border-radius:8px; display:inline-block; font-weight:bold;">
            View Job Details
          </a>
        </div>

        <p style="color:#6b7280; font-size:14px;">
          If you have any questions about this assignment, please contact your manager.
        </p>

        <hr style="margin:25px 0;" />

        <p style="font-size:12px; color:#9ca3af; text-align:center;">
          © ${new Date().getFullYear()} Practis Manager. All rights reserved.
        </p>

      </div>
    </div>
  `;

    return this.sendMail(email, subject, html);
  }

  /**
   * Send email notification to client for recurring job creation
   * @param {string} email - Client email address
   * @param {object} jobData - Job information
   * @param {object} patternData - Recurrence pattern information
   */
  async sendRecurringJobClientNotification(email, jobData, patternData) {
    const subject = 'New Recurring Job Created';

    const html = `
    <div style="font-family: Arial, sans-serif; background:#f3f4f6; padding:30px;">
    
      <div style="max-width:500px; margin:auto; background:white; padding:30px; border-radius:10px;">
        
        <h2 style="color:#333; text-align:center;">
           Practis Manager
        </h2>

        <h3 style="color:#1f2937; margin-bottom:20px;">New Recurring Job Created</h3>

        <p>Hello,</p>

        <p>A new recurring job has been automatically created for your project:</p>

        <div style="background:#f9fafb; padding:15px; border-radius:8px; margin:20px 0;">
          <p><strong>Job:</strong> ${jobData.name}</p>
          <p><strong>Description:</strong> ${jobData.description || 'No description'}</p>
          <p><strong>Due Date:</strong> ${new Date(jobData.dueDate).toLocaleDateString()}</p>
          <p><strong>Frequency:</strong> ${patternData.frequency}</p>
          <p><strong>Priority:</strong> ${jobData.priority || 'Normal'}</p>
          <p><strong>Status:</strong> ${patternData.auto_assign_to_same_staff ? 'Automatically assigned to staff' : 'Pending staff assignment'}</p>
        </div>

        <p>This job will automatically repeat ${patternData.frequency} as part of your ongoing project management. Our team will ensure consistent delivery and quality for each occurrence.</p>

        <div style="text-align:center; margin:25px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" 
             style="background:#6366f1; color:white; padding:12px 25px; text-decoration:none; border-radius:8px; display:inline-block; font-weight:bold;">
            View Project Details
          </a>
        </div>

        <p style="color:#6b7280; font-size:14px;">
          You will receive notifications for each recurring job instance. If you need to make any changes to the schedule or have questions, please contact our team.
        </p>

        <hr style="margin:25px 0;" />

        <p style="font-size:12px; color:#9ca3af; text-align:center;">
          © ${new Date().getFullYear()} Practis Manager. All rights reserved.
        </p>

      </div>
    </div>
  `;

    return this.sendMail(email, subject, html);
  }
}

module.exports = new EmailService();
