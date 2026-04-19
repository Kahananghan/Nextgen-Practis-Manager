const db = require('../../config/database');
const ProposalsService = require('./proposals.service');
const { createR2Client } = require('../../config/r2');
const config = require('../../config');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const { Readable } = require('stream');

const r2 = createR2Client();

class ProposalsController {
    // Get all proposals for a tenant
    static async getProposals(req, reply) {
        try {
            const tenantId = req.user.tenantId;

            const filters = {
                status: req.query.status,
                client_id: req.query.client_id,
                search: req.query.search,
                limit: parseInt(req.query.limit) || 50,
                offset: parseInt(req.query.offset) || 0,
                sort_by: req.query.sort_by || 'created_at',
                sort_order: req.query.sort_order || 'DESC'
            };

            const proposals = await ProposalsService.getAll(tenantId, filters);
            
            return reply.send({
                success: true,
                data: proposals,
                message: 'Proposals retrieved successfully'
            });
        } catch (error) {
            console.error('Error fetching proposals:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to fetch proposals',
                error: error.message
            });
        }
    }

    // Get single proposal by ID
    static async getProposal(req, reply) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;

            const proposal = await ProposalsService.getById(id, tenantId);
            
            if (!proposal) {
                return reply.status(404).send({
                    success: false,
                    message: 'Proposal not found'
                });
            }

            return reply.send({
                success: true,
                data: proposal,
                message: 'Proposal retrieved successfully'
            });
        } catch (error) {
            console.error('Error fetching proposal:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to fetch proposal',
                error: error.message
            });
        }
    }

    // Create new proposal
    static async createProposal(req, reply) {
        try {
            const tenantId = req.user.tenantId;
            const created_by = req.user.userId;
            const proposalData = {
                ...req.body,
                created_by,
                tenant_id: tenantId
            };
            
           // console.log('Proposal data being sent to service:', proposalData);

            const proposal = await ProposalsService.create(proposalData);

            return reply.status(201).send({
                success: true,
                data: proposal,
                message: 'Proposal created successfully'
            });
        } catch (error) {
            console.error('Error creating proposal:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to create proposal',
                error: error.message
            });
        }
    }

    // Update proposal
    static async updateProposal(req, reply) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const updateData = req.body;

            const proposal = await ProposalsService.update(id, tenantId, updateData);

            if (!proposal) {
                return reply.status(404).send({
                    success: false,
                    message: 'Proposal not found'
                });
            }

            return reply.send({
                success: true,
                data: proposal,
                message: 'Proposal updated successfully'
            });
        } catch (error) {
            console.error('Error updating proposal:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to update proposal',
                error: error.message
            });
        }
    }

    // Update proposal status
    static async updateProposalStatus(req, reply) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const { status } = req.body;

            const proposal = await ProposalsService.updateStatus(id, tenantId, status);

            if (!proposal) {
                return reply.status(404).send({
                    success: false,
                    message: 'Proposal not found'
                });
            }

            return reply.send({
                success: true,
                data: proposal,
                message: 'Proposal status updated successfully'
            });
        } catch (error) {
            console.error('Error updating proposal status:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to update proposal status',
                error: error.message
            });
        }
    }

    // Delete proposal
    static async deleteProposal(req, reply) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;

            const proposal = await ProposalsService.delete(id, tenantId);

            if (!proposal) {
                return reply.status(404).send({
                    success: false,
                    message: 'Proposal not found'
                });
            }

            return reply.send({
                success: true,
                data: proposal,
                message: 'Proposal deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting proposal:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to delete proposal',
                error: error.message
            });
        }
    }

    // Send proposal to client
    static async sendProposal(req, reply) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;

            const proposal = await ProposalsService.updateStatus(id, tenantId, 'sent', {
                sent_by: req.user.id,
                sent_at: new Date().toISOString()
            });

            if (!proposal) {
                return reply.status(404).send({
                    success: false,
                    message: 'Proposal not found'
                });
            }

            // Send email notification
            try {
                await ProposalsService.sendProposalNotification(req.user.tenantId, proposal);
                console.log('Proposal email sent successfully to:', proposal.client_email);
            } catch (emailError) {
                console.error('Failed to send proposal email:', emailError);
                // Don't fail the whole operation if email fails
            }

            return reply.send({
                success: true,
                data: proposal,
                message: 'Proposal sent successfully'
            });
        } catch (error) {
            console.error('Error sending proposal:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to send proposal',
                error: error.message
            });
        }
    }

    // Extend proposal expiry date
    static async extendExpiry(req, reply) {
        try {
            const { id } = req.params;
            const { expiry_date } = req.body;
            const tenantId = req.user.tenantId;

            const proposal = await ProposalsService.extendExpiry(id, tenantId, expiry_date);

            if (!proposal) {
                return reply.status(404).send({
                    success: false,
                    message: 'Proposal not found'
                });
            }

            return reply.send({
                success: true,
                data: proposal,
                message: 'Proposal expiry extended successfully'
            });
        } catch (error) {
            console.error('Error extending expiry:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to extend expiry',
                error: error.message
            });
        }
    }

    // Duplicate proposal
    static async duplicateProposal(req, reply) {
        try {
            const { id } = req.params;
            const { title } = req.body;
            const tenantId = req.user.tenantId;

            const duplicatedProposal = await ProposalsService.duplicate(id, tenantId, title);

            return reply.status(201).send({
                success: true,
                data: duplicatedProposal,
                message: 'Proposal duplicated successfully'
            });
        } catch (error) {
            console.error('Error duplicating proposal:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to duplicate proposal',
                error: error.message
            });
        }
    }

    // Get proposal statistics
    static async getProposalStats(req, reply) {
        try {
            const tenantId = req.user.tenantId;
            const stats = await ProposalsService.getStats(tenantId);

            return reply.send({
                success: true,
                data: stats,
                message: 'Proposal statistics retrieved successfully'
            });
        } catch (error) {
            console.error('Error fetching proposal stats:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to fetch proposal statistics',
                error: error.message
            });
        }
    }

    // Client-facing: Get proposal by view token
    static async getPublicProposal(req, reply) {
        try {
            const { token } = req.params;

            let proposal = await ProposalsService.getByToken(token);

            if (!proposal) {
                return reply.status(404).send({
                    success: false,
                    message: 'Proposal not found'
                });
            }

            // Check if proposal is expired
            const isExpired = proposal.expiry_date && new Date(proposal.expiry_date) < new Date();

            // Track every proposal view (increment open_count, update last_opened_at)
            // Also update status to 'viewed' if currently 'sent'
            if (!isExpired && (proposal.status === 'sent' || proposal.status === 'viewed')) {
                await ProposalsService.updateStatus(proposal.id, null, 'viewed', {
                    ip_address: req.ip,
                    user_agent: req.headers['user-agent']
                });
                // Re-fetch to get updated status
                proposal = await ProposalsService.getByToken(token);
            }

            return reply.send({
                success: true,
                data: {
                    ...proposal,
                    isExpired
                },
                message: 'Proposal retrieved successfully'
            });
        } catch (error) {
            console.error('Error fetching public proposal:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to fetch proposal',
                error: error.message
            });
        }
    }

    // Client-facing: Accept proposal
    static async acceptProposal(req, reply) {
        try {
            const { token } = req.params;
            const { signature_type, signature_data, typed_name, full_name } = req.body;

            const proposal = await ProposalsService.getByToken(token);

            if (!proposal) {
                return reply.status(404).send({
                    success: false,
                    message: 'Proposal not found'
                });
            }

            // Check if proposal is expired
            if (proposal.expiry_date && new Date(proposal.expiry_date) < new Date()) {
                return reply.status(410).send({
                    success: false,
                    message: 'Proposal has expired'
                });
            }

            // Add signature
            const signatureInfo = {
                type: signature_type,
                data: signature_data,
                name: typed_name || full_name,
                ip_address: req.ip,
                user_agent: req.headers['user-agent']
            };

            const updatedProposal = await ProposalsService.addSignature(proposal.id, signatureInfo);

            // Update status to accepted
            await ProposalsService.updateStatus(proposal.id, null, 'accepted', {
                accepted_by: signatureInfo.name,
                accepted_at: new Date().toISOString(),
                ip_address: req.ip
            });

            // TODO: Send confirmation emails
            // await emailService.sendAcceptanceNotification(updatedProposal);

            return reply.send({
                success: true,
                data: updatedProposal,
                message: 'Proposal accepted successfully'
            });
        } catch (error) {
            console.error('Error accepting proposal:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to accept proposal',
                error: error.message
            });
        }
    }

    // Client-facing: Decline proposal
    static async declineProposal(req, reply) {
        try {
            const { token } = req.params;
            const { reason } = req.body;

            const proposal = await ProposalsService.getByToken(token);

            if (!proposal) {
                return reply.status(404).send({
                    success: false,
                    message: 'Proposal not found'
                });
            }

            // Update status to declined
            const updatedProposal = await ProposalsService.updateStatus(proposal.id, null, 'declined', {
                reason: reason || 'No reason provided',
                declined_at: new Date().toISOString(),
                ip_address: req.ip
            });

            // TODO: Send decline notification
            // await emailService.sendDeclineNotification(updatedProposal, reason);

            return reply.send({
                success: true,
                data: updatedProposal,
                message: 'Proposal declined successfully'
            });
        } catch (error) {
            console.error('Error declining proposal:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to decline proposal',
                error: error.message
            });
        }
    }

    // Client-facing: Track when client agrees to terms
    static async trackTermsAgreed(req, reply) {
        try {
            const { token } = req.params;

            const proposal = await ProposalsService.getByToken(token);

            if (!proposal) {
                return reply.status(404).send({
                    success: false,
                    message: 'Proposal not found'
                });
            }

            // Update terms_agreed_at timestamp
            const query = `
                UPDATE proposals
                SET terms_agreed_at = NOW(),
                    updated_at = NOW()
                WHERE id = $1
                RETURNING *
            `;
            const result = await db.query(query, [proposal.id]);

            return reply.send({
                success: true,
                data: result.rows[0],
                message: 'Terms agreement tracked successfully'
            });
        } catch (error) {
            console.error('Error tracking terms agreement:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to track terms agreement',
                error: error.message
            });
        }
    }

    // Client-facing: Upload signature image to R2
    static async uploadSignature(req, reply) {
        try {
            const { token } = req.params;

            const proposal = await ProposalsService.getByToken(token);

            if (!proposal) {
                return reply.status(404).send({
                    success: false,
                    message: 'Proposal not found'
                });
            }

            // Use Fastify's native file parsing
            const part = await req.file();
            if (!part) {
                return reply.status(400).send({
                    success: false,
                    message: 'No signature file provided'
                });
            }

            // Convert file to buffer
            const buffer = await part.toBuffer();

            // Generate unique object key for R2
            const signatureId = crypto.randomBytes(16).toString('hex');
            const objectKey = `signatures/proposal_${proposal.id}_${signatureId}.png`;

            // Upload to Cloudflare R2
            await r2.send(
                new PutObjectCommand({
                    Bucket: config.r2.bucketName,
                    Key: objectKey,
                    Body: buffer,
                    ContentType: 'image/png',
                    ContentLength: buffer.length
                })
            );

            // Construct R2 file URL
            const signatureUrl = `${config.r2.endpoint}/${objectKey}`;

            return reply.send({
                success: true,
                data: { signatureUrl },
                message: 'Signature uploaded successfully'
            });
        } catch (error) {
            console.error('Error uploading signature:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to upload signature',
                error: error.message
            });
        }
    }

    // Client-facing: Get presigned URL for signature image
    static async getSignatureUrl(req, reply) {
        try {
            const { token } = req.params;

            const proposal = await ProposalsService.getByToken(token);

            if (!proposal || !proposal.signature_data?.file) {
                return reply.status(404).send({
                    success: false,
                    message: 'Signature not found'
                });
            }

            // Extract object key from URL
            const objectKey = proposal.signature_data.file.replace(`${config.r2.endpoint}/`, '');

            // Generate presigned URL (valid for 1 hour)
            const command = new GetObjectCommand({
                Bucket: config.r2.bucketName,
                Key: objectKey
            });

            const presignedUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });

            return reply.send({
                success: true,
                data: { presignedUrl },
                message: 'Presigned URL generated successfully'
            });
        } catch (error) {
            console.error('Error generating presigned URL:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to generate presigned URL',
                error: error.message
            });
        }
    }

    // Get signature image as base64 (to avoid CORS in PDF generation)
    static async getSignatureImage(req, reply) {
        try {
            const { token } = req.params;

            const proposal = await ProposalsService.getByToken(token);

            if (!proposal || !proposal.signature_data?.file) {
                return reply.status(404).send({
                    success: false,
                    message: 'Signature not found'
                });
            }

            // Extract object key from URL
            const objectKey = proposal.signature_data.file.replace(`${config.r2.endpoint}/`, '');

            // Fetch image from R2
            const command = new GetObjectCommand({
                Bucket: config.r2.bucketName,
                Key: objectKey
            });

            const response = await r2.send(command);

            // Convert stream to buffer
            const chunks = [];
            for await (const chunk of response.Body) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);

            // Convert to base64
            const base64 = buffer.toString('base64');

            return reply.send({
                success: true,
                data: { base64 },
                message: 'Signature image retrieved successfully'
            });
        } catch (error) {
            console.error('Error fetching signature image:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to fetch signature image',
                error: error.message
            });
        }
    }

    // Get proposal activity log
    static async getProposalActivity(req, reply) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;

            const proposal = await ProposalsService.getById(id, tenantId);

            if (!proposal) {
                return reply.status(404).send({
                    success: false,
                    message: 'Proposal not found'
                });
            }

            const activityLog = proposal.activity_log || [];

            return reply.send({
                success: true,
                data: activityLog,
                message: 'Activity log retrieved successfully'
            });
        } catch (error) {
            console.error('Error fetching activity log:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to fetch activity log',
                error: error.message
            });
        }
    }

    // Send reminder email
    static async sendReminder(req, reply) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;

            const proposal = await ProposalsService.sendReminder(tenantId, id);

            return reply.send({
                success: true,
                data: proposal,
                message: 'Reminder sent successfully'
            });
        } catch (error) {
            console.error('Error sending reminder:', error);
            return reply.status(500).send({
                success: false,
                message: 'Failed to send reminder',
                error: error.message
            });
        }
    }
}

module.exports = ProposalsController;
