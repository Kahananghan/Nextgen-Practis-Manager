const ProposalsController = require('./proposals.controller');
const { authenticate } = require('../../middleware/auth');
const ProposalsValidation = require('./proposals.validation');

// Fastify routes plugin
async function proposalsRoutes(fastify, options) {

    // GET /api/proposals - Get all proposals
    fastify.get('/', {
        preHandler: [authenticate],
        schema: {
            querystring: {
                type: 'object',
                additionalProperties: true,
                properties: {
                    status: { type: 'string', enum: ['draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'withdrawn'] },
                    client_id: { type: 'string', format: 'uuid' },
                    search: { type: 'string' },
                    limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
                    offset: { type: 'number', minimum: 0, default: 0 },
                    sort_by: { type: 'string', enum: ['created_at', 'updated_at', 'title', 'status', 'total_value', 'expiry_date'], default: 'created_at' },
                    sort_order: { type: 'string', enum: ['ASC', 'DESC'], default: 'DESC' }
                }
            }
        }
    }, ProposalsController.getProposals);

    // GET /api/proposals/stats - Get proposal statistics
    fastify.get('/stats', {
        preHandler: [authenticate]
    }, ProposalsController.getProposalStats);

    // POST /api/proposals - Create new proposal
    fastify.post('/', {
        preHandler: [authenticate],
        schema: {
            body: {
                type: 'object',
                required: ['title'],
                properties: {
                    title: { type: 'string', minLength: 1, maxLength: 255 },
                    description: { type: 'string' },
                    client_id: { type: 'string', format: 'uuid' },
                    client_name: { type: 'string' },
                    client_email: { type: 'string', format: 'email' },
                    contact_name: { type: 'string' },
                    cover_message: { type: 'string' },
                    total_value: { type: 'number', minimum: 0 },
                    subtotal: { type: 'number', minimum: 0 },
                    gst_amount: { type: 'number', minimum: 0 },
                    expiry_date: { type: 'string', format: 'date-time' },
                    auto_reminder_days: { type: 'number', minimum: 0, maximum: 30 },
                    service_lines: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                service: { type: 'string' },
                                type: { type: 'string', enum: ['Fixed', 'Hourly', 'Recurring'] },
                                quantity: { type: 'number', minimum: 0 },
                                rate: { type: 'number', minimum: 0 },
                                total: { type: 'number', minimum: 0 },
                                description: { type: 'string' }
                            }
                        }
                    },
                    billing_settings: { type: 'object' },
                    documents: { type: 'object' }
                }
            }
        }
    }, ProposalsController.createProposal);

    // GET /api/proposals/:id - Get single proposal
    fastify.get('/:id', {
        preHandler: [authenticate],
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            }
        }
    }, ProposalsController.getProposal);

    // PUT /api/proposals/:id - Update proposal
    fastify.put('/:id', {
        preHandler: [authenticate],
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    title: { type: 'string', minLength: 1, maxLength: 255 },
                    description: { type: 'string' },
                    client_id: { type: 'string', format: 'uuid' },
                    client_name: { type: 'string' },
                    client_email: { type: 'string', format: 'email' },
                    contact_name: { type: 'string' },
                    cover_message: { type: 'string' },
                    total_value: { type: 'number', minimum: 0 },
                    subtotal: { type: 'number', minimum: 0 },
                    gst_amount: { type: 'number', minimum: 0 },
                    expiry_date: { type: 'string', format: 'date-time' },
                    auto_reminder_days: { type: 'number', minimum: 0, maximum: 30 },
                    status: { type: 'string', enum: ['draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'withdrawn'] },
                    service_lines: { type: 'array' },
                    billing_settings: { type: 'object' },
                    documents: { type: 'object' }
                }
            }
        }
    }, ProposalsController.updateProposal);

    // PUT /api/proposals/:id/status - Update proposal status
    fastify.put('/:id/status', {
        preHandler: [authenticate],
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            },
            body: {
                type: 'object',
                required: ['status'],
                properties: {
                    status: { type: 'string', enum: ['draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'withdrawn'] }
                }
            }
        }
    }, ProposalsController.updateProposalStatus);

    // DELETE /api/proposals/:id - Delete proposal
    fastify.delete('/:id', {
        preHandler: [authenticate],
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            }
        }
    }, ProposalsController.deleteProposal);

    // POST /api/proposals/:id/send - Send proposal to client
    fastify.post('/:id/send', {
        preHandler: [authenticate],
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            }
        }
    }, ProposalsController.sendProposal);

    // POST /api/proposals/:id/extend - Extend proposal expiry
    fastify.post('/:id/extend', {
        preHandler: [authenticate],
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            },
            body: {
                type: 'object',
                required: ['expiry_date'],
                properties: {
                    expiry_date: { 
                        type: 'string', 
                        format: 'date-time'
                    }
                }
            }
        }
    }, ProposalsController.extendExpiry);

    // POST /api/proposals/:id/duplicate - Duplicate proposal
    fastify.post('/:id/duplicate', {
        preHandler: [authenticate],
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    title: { type: 'string', maxLength: 255 }
                }
            }
        }
    }, ProposalsController.duplicateProposal);

    // POST /api/proposals/:id/remind - Send reminder email
    fastify.post('/:id/remind', {
        preHandler: [authenticate],
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            }
        }
    }, ProposalsController.sendReminder);

    // GET /api/proposals/:id/activity - Get proposal activity log
    fastify.get('/:id/activity', {
        preHandler: [authenticate],
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            }
        }
    }, ProposalsController.getProposalActivity);

    // Public routes (no authentication required)
    
    // GET /api/proposals/public/:token - Get proposal by view token (client-facing)
    fastify.get('/public/:token', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    token: { type: 'string', format: 'uuid' }
                }
            }
        }
    }, ProposalsController.getPublicProposal);

    // POST /api/proposals/public/:token/accept - Accept proposal (client-facing)
    fastify.post('/public/:token/accept', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    token: { type: 'string', format: 'uuid' }
                }
            },
            body: {
                type: 'object',
                required: ['signature_type'],
                properties: {
                    signature_type: { type: 'string', enum: ['draw', 'type'] },
                    signature_data: { type: 'string' },
                    typed_name: { type: 'string' },
                    full_name: { type: 'string' }
                }
            }
        }
    }, ProposalsController.acceptProposal);

    // POST /api/proposals/public/:token/decline - Decline proposal (client-facing)
    fastify.post('/public/:token/decline', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    token: { type: 'string', format: 'uuid' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    reason: { type: 'string', maxLength: 500 }
                }
            }
        }
    }, ProposalsController.declineProposal);

    // POST /api/proposals/public/:token/terms-agreed - Track when client agrees to terms (client-facing)
    fastify.post('/public/:token/terms-agreed', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    token: { type: 'string', format: 'uuid' }
                }
            }
        }
    }, ProposalsController.trackTermsAgreed);

    // POST /api/proposals/public/:token/upload-signature - Upload signature image to R2 (client-facing)
    fastify.post('/public/:token/upload-signature', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    token: { type: 'string', format: 'uuid' }
                }
            }
        }
    }, ProposalsController.uploadSignature);

    // GET /api/proposals/public/:token/signature-url - Get presigned URL for signature image (client-facing)
    fastify.get('/public/:token/signature-url', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    token: { type: 'string', format: 'uuid' }
                }
            }
        }
    }, ProposalsController.getSignatureUrl);

    // GET /api/proposals/public/:token/signature-image - Get signature image as base64 (client-facing)
    fastify.get('/public/:token/signature-image', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    token: { type: 'string', format: 'uuid' }
                }
            }
        }
    }, ProposalsController.getSignatureImage);
}

module.exports = proposalsRoutes;
