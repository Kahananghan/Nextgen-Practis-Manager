const db = require('../../config/database')
const logger = require('../../utils/logger')
const emailService = require('../../utils/emailService')

class ProposalsService {
    // Create a new proposal
    static async create(proposalData) {
        const {
            title,
            description,
            client_id,
            client_name,
            client_email,
            contact_name,
            cover_message,
            total_value,
            subtotal,
            gst_amount,
            expiry_date,
            auto_reminder_days,
            created_by,
            tenant_id,
            status = 'draft',
            service_lines = [],
            billing_settings = {},
            documents = {}
        } = proposalData;

        logger.info({
            event: 'PROPOSAL_CREATE_START',
            tenantId: tenant_id,
            createdBy: created_by,
            title,
            clientId: client_id,
            clientEmail: client_email
        });

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Insert main proposal
            const proposalQuery = `
                INSERT INTO proposals (
                    title, description, client_id, client_name, client_email, contact_name,
                    cover_message, total_value, subtotal, gst_amount, expiry_date,
                    auto_reminder_days, created_by, tenant_id, status, sent_date
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING *
            `;

            const proposalValues = [
                title, description, client_id, client_name, client_email, contact_name,
                cover_message, total_value, subtotal, gst_amount, expiry_date,
                auto_reminder_days, created_by, tenant_id, status, 
                status === 'sent' ? new Date().toISOString() : null
            ];

            const proposalResult = await client.query(proposalQuery, proposalValues);
            const proposal = proposalResult.rows[0];

            // Insert proposal content
            const contentQuery = `
                INSERT INTO proposal_content (
                    proposal_id, service_lines, billing_settings, documents, activity_log
                ) VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;

            const initialActivity = [{
                type: 'created',
                description: 'Proposal created',
                created_at: new Date().toISOString(),
                metadata: { created_by }
            }];

            const contentValues = [
                proposal.id,
                JSON.stringify(service_lines),
                JSON.stringify(billing_settings),
                JSON.stringify(documents),
                JSON.stringify(initialActivity)
            ];

            const contentResult = await client.query(contentQuery, contentValues);
            const content = contentResult.rows[0];

            await client.query('COMMIT');

            // Send email notification if proposal is being sent
            if (status === 'sent' && client_email) {
                try {
                    await this.sendProposalNotification(tenant_id, {
                        ...proposal,
                        content
                    });
                } catch (emailError) {
                    logger.warn({
                        event: 'PROPOSAL_NOTIFICATION_FAILED',
                        tenantId: tenant_id,
                        proposalId: proposal.id,
                        error: emailError.message
                    });
                }
            }

            logger.info({
                event: 'PROPOSAL_CREATE_SUCCESS',
                tenantId: tenant_id,
                createdBy: created_by,
                proposalId: proposal.id,
                title: proposal.title,
                viewToken: proposal.view_token
            });

            return {
                ...proposal,
                content: {
                    service_lines: content.service_lines,
                    billing_settings: content.billing_settings,
                    documents: content.documents,
                    activity_log: content.activity_log
                }
            };
        } catch (error) {
            logger.error({
                event: 'PROPOSAL_CREATE_ERROR',
                tenantId: tenant_id,
                createdBy: created_by,
                title,
                error: error.message,
                stack: error.stack
            });
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Get all proposals for a tenant with filtering
    static async getAll(tenantId, filters = {}) {
        const {
            status,
            client_id,
            search,
            limit = 50,
            offset = 0,
            sort_by = 'created_at',
            sort_order = 'DESC'
        } = filters;

        logger.debug({
            event: 'PROPOSALS_GET_ALL_START',
            tenantId,
            filters: { status, client_id, search, limit, offset, sort_by, sort_order }
        });

        let query = `
            SELECT 
                p.*,
                xc.name as client_name,
                xc.email as client_email,
                u.name as created_by_name,
                pc.service_lines,
                pc.billing_settings,
                pc.documents,
                pc.activity_log
            FROM proposals p
            LEFT JOIN xpm_clients xc ON p.client_id = xc.id
            LEFT JOIN users u ON p.created_by = u.id
            LEFT JOIN proposal_content pc ON p.id = pc.proposal_id
            WHERE p.tenant_id = $1
        `;

        const values = [tenantId];
        let paramIndex = 2;

        if (status) {
            query += ` AND p.status = $${paramIndex}`;
            values.push(status);
            paramIndex++;
        }

        if (client_id) {
            query += ` AND p.client_id = $${paramIndex}`;
            values.push(client_id);
            paramIndex++;
        }

        if (search) {
            query += ` AND (p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR xc.name ILIKE $${paramIndex})`;
            values.push(`%${search}%`);
            paramIndex++;
        }

        // Add sorting
        const validSortFields = ['created_at', 'updated_at', 'title', 'status', 'total_value', 'expiry_date'];
        const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
        const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        
        query += ` ORDER BY p.${sortField} ${sortDirection}`;

        // Add pagination
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        const result = await db.query(query, values);
        
        logger.debug({
            event: 'PROPOSALS_GET_ALL_SUCCESS',
            tenantId,
            count: result.rows.length,
            filters: { status, client_id, search, limit, offset }
        });

        return result.rows;
    }

    // Get single proposal by ID
    static async getById(proposalId, tenantId) {
        logger.debug({
            event: 'PROPOSAL_GET_BY_ID_START',
            tenantId,
            proposalId
        });

        const query = `
            SELECT 
                p.*,
                xc.name as client_name,
                xc.email as client_email,
                xc.phone as client_phone,
                xc.address as client_address,
                u.name as created_by_name,
                pc.service_lines,
                pc.billing_settings,
                pc.documents,
                pc.activity_log
            FROM proposals p
            LEFT JOIN xpm_clients xc ON p.client_id = xc.id
            LEFT JOIN users u ON p.created_by = u.id
            LEFT JOIN proposal_content pc ON p.id = pc.proposal_id
            WHERE p.id = $1 AND p.tenant_id = $2
        `;

        const result = await db.query(query, [proposalId, tenantId]);
        const proposal = result.rows[0] || null;

        logger.debug({
            event: 'PROPOSAL_GET_BY_ID_SUCCESS',
            tenantId,
            proposalId,
            found: !!proposal,
            status: proposal?.status
        });

        return proposal;
    }

    // Get proposal by view token (for client-facing view)
    static async getByToken(viewToken) {
        const query = `
            SELECT 
                p.*,
                xc.name as client_name,
                xc.email as client_email,
                xc.phone as client_phone,
                xc.address as client_address,
                u.name as created_by_name,
                pc.service_lines,
                pc.billing_settings,
                pc.documents,
                pc.activity_log,
                pc.documents->>'engagement_letter' as letter,
                pc.documents->>'terms_conditions' as terms
            FROM proposals p
            LEFT JOIN xpm_clients xc ON p.client_id = xc.id
            LEFT JOIN users u ON p.created_by = u.id
            LEFT JOIN proposal_content pc ON p.id = pc.proposal_id
            WHERE p.view_token = $1
        `;

        const result = await db.query(query, [viewToken]);
        return result.rows[0] || null;
    }

    // Update proposal
    static async update(proposalId, tenantId, updateData) {
        const {
            title,
            description,
            client_id,
            client_name,
            client_email,
            contact_name,
            cover_message,
            total_value,
            subtotal,
            gst_amount,
            expiry_date,
            auto_reminder_days,
            service_lines,
            billing_settings,
            documents
        } = updateData;

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Update main proposal
            const proposalFields = [];
            const proposalValues = [];
            let paramIndex = 1;

            if (title !== undefined) {
                proposalFields.push(`title = $${paramIndex}`);
                proposalValues.push(title);
                paramIndex++;
            }
            if (description !== undefined) {
                proposalFields.push(`description = $${paramIndex}`);
                proposalValues.push(description);
                paramIndex++;
            }
            if (client_id !== undefined) {
                proposalFields.push(`client_id = $${paramIndex}`);
                proposalValues.push(client_id);
                paramIndex++;
            }
            if (client_name !== undefined) {
                proposalFields.push(`client_name = $${paramIndex}`);
                proposalValues.push(client_name);
                paramIndex++;
            }
            if (client_email !== undefined) {
                proposalFields.push(`client_email = $${paramIndex}`);
                proposalValues.push(client_email);
                paramIndex++;
            }
            if (contact_name !== undefined) {
                proposalFields.push(`contact_name = $${paramIndex}`);
                proposalValues.push(contact_name);
                paramIndex++;
            }
            if (cover_message !== undefined) {
                proposalFields.push(`cover_message = $${paramIndex}`);
                proposalValues.push(cover_message);
                paramIndex++;
            }
            if (total_value !== undefined) {
                proposalFields.push(`total_value = $${paramIndex}`);
                proposalValues.push(total_value);
                paramIndex++;
            }
            if (subtotal !== undefined) {
                proposalFields.push(`subtotal = $${paramIndex}`);
                proposalValues.push(subtotal);
                paramIndex++;
            }
            if (gst_amount !== undefined) {
                proposalFields.push(`gst_amount = $${paramIndex}`);
                proposalValues.push(gst_amount);
                paramIndex++;
            }
            if (expiry_date !== undefined) {
                proposalFields.push(`expiry_date = $${paramIndex}`);
                proposalValues.push(expiry_date);
                paramIndex++;
            }
            if (auto_reminder_days !== undefined) {
                proposalFields.push(`auto_reminder_days = $${paramIndex}`);
                proposalValues.push(auto_reminder_days);
                paramIndex++;
            }

            proposalFields.push(`updated_at = NOW()`);
            
            proposalValues.push(proposalId, tenantId);
            paramIndex += 2;

            if (proposalFields.length > 0) {
                const proposalQuery = `
                    UPDATE proposals 
                    SET ${proposalFields.join(', ')}
                    WHERE id = $${paramIndex - 1} AND tenant_id = $${paramIndex}
                `;
                await client.query(proposalQuery, proposalValues);
            }

            // Update content if provided
            if (service_lines !== undefined || billing_settings !== undefined || documents !== undefined) {
                const contentFields = [];
                const contentValues = [];
                let contentParamIndex = 1;

                if (service_lines !== undefined) {
                    contentFields.push(`service_lines = $${contentParamIndex}`);
                    contentValues.push(JSON.stringify(service_lines));
                    contentParamIndex++;
                }
                if (billing_settings !== undefined) {
                    contentFields.push(`billing_settings = $${contentParamIndex}`);
                    contentValues.push(JSON.stringify(billing_settings));
                    contentParamIndex++;
                }
                if (documents !== undefined) {
                    contentFields.push(`documents = $${contentParamIndex}`);
                    contentValues.push(JSON.stringify(documents));
                    contentParamIndex++;
                }

                contentFields.push(`updated_at = NOW()`);
                contentValues.push(proposalId);

                const contentQuery = `
                    UPDATE proposal_content 
                    SET ${contentFields.join(', ')}
                    WHERE proposal_id = $${contentParamIndex}
                `;
                await client.query(contentQuery, contentValues);
            }

            await client.query('COMMIT');

            // Return updated proposal
            return await this.getById(proposalId, tenantId);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Extend proposal expiry date
    static async extendExpiry(proposalId, tenantId, expiryDate) {
        logger.info({
            event: 'PROPOSAL_EXTEND_EXPIRY_START',
            tenantId,
            proposalId,
            expiryDate
        });

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const query = `
                UPDATE proposals 
                SET expiry_date = $1::timestamp, updated_at = NOW()
                WHERE id = $2::uuid AND tenant_id = $3::uuid
                RETURNING *
            `;
            const values = [expiryDate, proposalId, tenantId];
            
            const result = await client.query(query, values);
            
            await client.query('COMMIT');

            logger.info({
                event: 'PROPOSAL_EXTEND_EXPIRY_SUCCESS',
                tenantId,
                proposalId,
                expiryDate
            });

            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error({
                event: 'PROPOSAL_EXTEND_EXPIRY_ERROR',
                tenantId,
                proposalId,
                error: error.message
            });
            throw error;
        } finally {
            client.release();
        }
    }

    // Update proposal status
    static async updateStatus(proposalId, tenantId, status, metadata = {}) {
        logger.info({
            event: 'PROPOSAL_STATUS_UPDATE_START',
            tenantId,
            proposalId,
            status,
            metadata
        });

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Update proposal status and timestamps
            const timestampFields = {
                sent: 'sent_date',
                viewed: 'viewed_date',
                accepted: 'accepted_date',
                declined: 'declined_date'
            };

            let query = 'UPDATE proposals SET status = $1, updated_at = NOW()';
            const values = [status, proposalId];
            let paramIndex = 2;

            if (timestampFields[status]) {
                query += `, ${timestampFields[status]} = NOW()`;
            }

            if (status === 'viewed') {
                query += `, open_count = COALESCE(open_count, 0) + 1, last_opened_at = NOW()`;
            }

            query += ' WHERE id = $2';
            if (tenantId) {
                paramIndex++;
                query += ` AND tenant_id = $${paramIndex}`;
                values.push(tenantId);
            }

            await client.query(query, values);

            // Add to activity log
            const activityLogEntry = {
                type: status,
                description: `Proposal ${status}`,
                created_at: new Date().toISOString(),
                metadata
            };

            await client.query(`
                UPDATE proposal_content 
                SET activity_log = activity_log || $1::jsonb, updated_at = NOW()
                WHERE proposal_id = $2
            `, [JSON.stringify(activityLogEntry), proposalId]);

            await client.query('COMMIT');

            logger.info({
                event: 'PROPOSAL_STATUS_UPDATE_SUCCESS',
                tenantId,
                proposalId,
                status,
                metadata
            });

            return await this.getById(proposalId, tenantId);
        } catch (error) {
            logger.error({
                event: 'PROPOSAL_STATUS_UPDATE_ERROR',
                tenantId,
                proposalId,
                status,
                error: error.message,
                stack: error.stack
            });
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Add signature to proposal
    static async addSignature(proposalId, signatureData) {
        const { type, data, name, ip_address, user_agent } = signatureData;

        logger.info({
            event: 'PROPOSAL_SIGNATURE_START',
            proposalId,
            signatureType: type,
            signedByName: name,
            ipAddress: ip_address,
            userAgent: user_agent
        });

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Store R2 URL directly (data is now a URL from R2 upload)
            const signatureInfo = {
                type,
                file: data, // R2 URL
                name,
                ip_address,
                user_agent,
                signed_at: new Date().toISOString()
            };

            await client.query(`
                UPDATE proposals
                SET signature_data = $1, status = 'accepted', accepted_date = NOW(), updated_at = NOW()
                WHERE id = $2
            `, [JSON.stringify(signatureInfo), proposalId]);

            // Add to activity log
            const activityLogEntry = {
                type: 'signed',
                description: 'Proposal signed electronically',
                created_at: new Date().toISOString(),
                metadata: { signature_type: type, signed_by: name }
            };

            await client.query(`
                UPDATE proposal_content 
                SET activity_log = activity_log || $1::jsonb, updated_at = NOW()
                WHERE proposal_id = $2
            `, [JSON.stringify(activityLogEntry), proposalId]);

            await client.query('COMMIT');

            logger.info({
                event: 'PROPOSAL_SIGNATURE_SUCCESS',
                proposalId,
                signatureType: type,
                signedByName: name,
                ipAddress: ip_address
            });

            return await this.getById(proposalId);
        } catch (error) {
            logger.error({
                event: 'PROPOSAL_SIGNATURE_ERROR',
                proposalId,
                signatureType: type,
                signedByName: name,
                error: error.message,
                stack: error.stack
            });
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Delete proposal
    static async delete(proposalId, tenantId) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Delete proposal (cascade will delete content)
            const result = await client.query(`
                DELETE FROM proposals 
                WHERE id = $1 AND tenant_id = $2
                RETURNING *
            `, [proposalId, tenantId]);

            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Get proposal statistics for dashboard
    static async getStats(tenantId) {
        const query = `
            SELECT 
                COUNT(*) as total_proposals,
                COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
                COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
                COUNT(*) FILTER (WHERE status = 'viewed') as viewed_count,
                COUNT(*) FILTER (WHERE status = 'accepted') as accepted_count,
                COUNT(*) FILTER (WHERE status = 'declined') as declined_count,
                COUNT(*) FILTER (WHERE status = 'expired') as expired_count,
                COUNT(*) FILTER (WHERE status IN ('sent', 'viewed')) as awaiting_response,
                COALESCE(SUM(total_value), 0) as total_pipeline_value,
                COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date <= NOW() + INTERVAL '3 days' AND status NOT IN ('accepted', 'declined', 'expired')) as expiring_soon
            FROM proposals 
            WHERE tenant_id = $1
        `;

        const result = await db.query(query, [tenantId]);
        return result.rows[0];
    }

    
    // Duplicate proposal
    static async duplicate(proposalId, tenantId, newTitle) {                                
        const original = await this.getById(proposalId, tenantId);
        if (!original) {
            throw new Error('Proposal not found');
        }

        const duplicatedData = {
            title: newTitle || `${original.title}`,
            description: original.description,
            client_id: original.client_id,
            client_name: original.client_name,
            client_email: original.client_email,
            contact_name: original.contact_name,
            cover_message: original.cover_message,
            total_value: original.total_value,
            subtotal: original.subtotal,
            gst_amount: original.gst_amount,
            expiry_date: original.expiry_date,
            auto_reminder_days: original.auto_reminder_days,
            created_by: original.created_by,
            tenant_id: original.tenant_id,
            service_lines: original.service_lines || [],
            billing_settings: original.billing_settings || {},
            documents: original.documents || {}
        };

        return await this.create(duplicatedData);
    }

    // Send proposal notification email
    static async sendProposalNotification(tenantId, proposal) {
        try {
            const clientEmail = proposal.client_email;
            if (!clientEmail) {
                throw new Error('Client email not found');
            }

            const subject = `Proposal: ${proposal.title}`;
            const proposalUrl = `${process.env.CLIENT_PORTAL_URL || 'http://localhost:5173/'}#/proposal/${proposal.view_token}`;
            
            const emailBody = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #6366f1; color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">New Proposal</h1>
                    </div>
                    
                    <div style="padding: 30px; background-color: #f9fafb;">
                        <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${proposal.contact_name || proposal.client_name},</h2>
                        
                        <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                            ${proposal.cover_message || 'We have prepared a proposal for your review.'}
                        </p>
                        
                        <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #6366f1; margin-bottom: 20px;">
                            <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 10px;">${proposal.title}</h3>
                            <p style="color: #6b7280; margin-bottom: 15px;">${proposal.description || 'No description provided'}</p>
                            
                            <div style="display: flex; gap: 20px; color: #6b7280; font-size: 14px;">
                                <div>
                                    <strong>Total Value:</strong> $${parseFloat(proposal.total_value || 0).toFixed(2)}
                                </div>
                                <div>
                                    <strong>Expiry Date:</strong> ${new Date(proposal.expiry_date).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                        
                        <p style="color: #4b5563; line-height: 1.6; margin-bottom: 30px;">
                            Please review the proposal and accept it by the expiry date. If you have any questions, please don't hesitate to contact us.
                        </p>
                        
                        <div style="text-align: center;">
                            <a href="${proposalUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                View & Accept Proposal
                            </a>
                        </div>
                    </div>
                    
                    <div style="padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb;">
                        <p>This is an automated message. Please do not reply to this email.</p>
                    </div>
                </div>
            `;

            // Send email asynchronously with longer timeout to prevent blocking
            ProposalsService.sendEmailAsync(clientEmail, subject, emailBody).then(() => {
                logger.info({
                    event: 'PROPOSAL_NOTIFICATION_SENT',
                    tenantId,
                    proposalId: proposal.id,
                    clientEmail
                });
            }).catch(error => {
                logger.error({
                    event: 'PROPOSAL_NOTIFICATION_ASYNC_ERROR',
                    tenantId,
                    proposalId: proposal.id,
                    clientEmail,
                    error: error.message
                });
            });
        } catch (error) {
            logger.error({
                event: 'SEND_PROPOSAL_NOTIFICATION_ERROR',
                tenantId,
                proposalId: proposal.id,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    // Send reminder email
    static async sendReminder(tenantId, proposalId) {
        try {
            // Get proposal details
            const result = await db.query(
                `SELECT p.*, c.name as client_name, c.email as client_email
                 FROM proposals p
                 LEFT JOIN xpm_clients c ON p.client_id = c.id AND p.tenant_id = c.tenant_id
                 WHERE p.id = $1 AND p.tenant_id = $2`,
                [proposalId, tenantId]
            );

            if (result.rows.length === 0) {
                throw new Error('Proposal not found');
            }

            const proposal = result.rows[0];

            // Fallback: If client email is null, try to get it separately
            if (!proposal.client_email && proposal.client_id) {
                const clientResult = await db.query(
                    'SELECT name, email FROM xpm_clients WHERE id = $1 AND tenant_id = $2',
                    [proposal.client_id, tenantId]
                );
                
                if (clientResult.rows.length > 0) {
                    proposal.client_name = clientResult.rows[0].name;
                    proposal.client_email = clientResult.rows[0].email;
                }
            }

            if (!proposal.client_email) {
                throw new Error('Client email not found');
            }

            const subject = `Reminder: Proposal - ${proposal.title}`;
            const proposalUrl = `${process.env.CLIENT_PORTAL_URL || 'http://localhost:5173/'}#/proposal/${proposal.view_token}`;
            
            const emailBody = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">Reminder</h1>
                    </div>
                    
                    <div style="padding: 30px; background-color: #f9fafb;">
                        <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${proposal.contact_name || proposal.client_name},</h2>
                        
                        <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                            This is a friendly reminder that we're still waiting for your response to the following proposal:
                        </p>
                        
                        <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444; margin-bottom: 20px;">
                            <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 10px;">${proposal.title}</h3>
                            <p style="color: #6b7280; margin-bottom: 15px;">${proposal.description || 'No description provided'}</p>
                            
                            <div style="display: flex; gap: 20px; color: #6b7280; font-size: 14px;">
                                <div>
                                    <strong>Total Value:</strong> $${parseFloat(proposal.total_value || 0).toFixed(2)}
                                </div>
                                <div>
                                    <strong>Expiry Date:</strong> ${new Date(proposal.expiry_date).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                        
                        <p style="color: #4b5563; line-height: 1.6; margin-bottom: 30px;">
                            Please review and respond to the proposal as soon as possible. If you've already responded, please disregard this reminder.
                        </p>
                        
                        <div style="text-align: center;">
                            <a href="${proposalUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                View Proposal Now
                            </a>
                        </div>
                    </div>
                    
                    <div style="padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb;">
                        <p>This is an automated message. Please do not reply to this email.</p>
                    </div>
                </div>
            `;

            // Send reminder email asynchronously
            ProposalsService.sendEmailAsync(proposal.client_email, subject, emailBody).then(() => {
                logger.info({
                    event: 'PROPOSAL_REMINDER_SENT',
                    tenantId,
                    proposalId,
                    clientEmail: proposal.client_email
                });
            }).catch(error => {
                logger.error({
                    event: 'PROPOSAL_REMINDER_ASYNC_ERROR',
                    tenantId,
                    proposalId,
                    clientEmail: proposal.client_email,
                    error: error.message
                });
            });

            return proposal;
        } catch (error) {
            logger.error({
                event: 'SEND_PROPOSAL_REMINDER_ERROR',
                tenantId,
                proposalId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Send email asynchronously without blocking
     * @param {string} to - Recipient email
     * @param {string} subject - Email subject
     * @param {string} body - Email body
     * @returns {Promise} - Promise resolving when email is sent
     */
    static async sendEmailAsync(to, subject, body) {
        const timeouts = [15000, 30000, 45000]; // Progressive timeouts
        let lastError = null;
        
        for (let i = 0; i < timeouts.length; i++) {
            try {
                logger.info({
                    event: 'ASYNC_EMAIL_ATTEMPT',
                    to,
                    subject,
                    attempt: i + 1,
                    timeout: timeouts[i]
                });
                
                await ProposalsService.withTimeout(emailService.sendMail(to, subject, body), timeouts[i], `Async email sending timed out (attempt ${i + 1})`);
                
                logger.info({
                    event: 'ASYNC_EMAIL_SENT_SUCCESS',
                    to,
                    subject,
                    attempt: i + 1
                });
                return; // Success, exit the loop
            } catch (error) {
                lastError = error;
                logger.warn({
                    event: 'ASYNC_EMAIL_ATTEMPT_FAILED',
                    to,
                    subject,
                    attempt: i + 1,
                    timeout: timeouts[i],
                    error: error.message
                });
                
                // If this is the last attempt, don't wait
                if (i < timeouts.length - 1) {
                    // Wait before retrying with longer timeout
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        
        // All attempts failed
        logger.error({
            event: 'ASYNC_EMAIL_SENDING_FAILED',
            to,
            subject,
            totalAttempts: timeouts.length,
            lastError: lastError.message
        });
        // Don't throw error for async failures - just log them
    }

    /**
     * Timeout wrapper for promises
     * @param {Promise} promise - Promise to wrap
     * @param {number} timeoutMs - Timeout in milliseconds
     * @param {string} errorMessage - Error message on timeout
     * @returns {Promise} - Promise with timeout
     */
    static async withTimeout(promise, timeoutMs, errorMessage) {
        return Promise.race([
            promise,
            new Promise((_, reject) => {
                setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
            })
        ])
    }
}

module.exports = ProposalsService;
