// Validation schemas for proposal operations

const createProposalSchema = {
    type: 'object',
    required: ['title'],
    properties: {
        title: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
            errorMessage: {
                minLength: 'Title is required',
                maxLength: 'Title must be less than 255 characters'
            }
        },
        description: {
            type: 'string',
            maxLength: 2000,
            errorMessage: {
                maxLength: 'Description must be less than 2000 characters'
            }
        },
        client_id: {
            type: 'string',
            format: 'uuid',
            errorMessage: {
                format: 'Client ID must be a valid UUID'
            }
        },
        client_name: {
            type: 'string',
            maxLength: 255,
            errorMessage: {
                maxLength: 'Client name must be less than 255 characters'
            }
        },
        client_email: {
            type: 'string',
            format: 'email',
            errorMessage: {
                format: 'Client email must be a valid email address'
            }
        },
        contact_name: {
            type: 'string',
            maxLength: 255,
            errorMessage: {
                maxLength: 'Contact name must be less than 255 characters'
            }
        },
        cover_message: {
            type: 'string',
            maxLength: 5000,
            errorMessage: {
                maxLength: 'Cover message must be less than 5000 characters'
            }
        },
        total_value: {
            type: 'number',
            minimum: 0,
            errorMessage: {
                minimum: 'Total value must be a positive number'
            }
        },
        subtotal: {
            type: 'number',
            minimum: 0,
            errorMessage: {
                minimum: 'Subtotal must be a positive number'
            }
        },
        gst_amount: {
            type: 'number',
            minimum: 0,
            errorMessage: {
                minimum: 'GST amount must be a positive number'
            }
        },
        expiry_date: {
            type: 'string',
            format: 'date-time',
            errorMessage: {
                format: 'Expiry date must be a valid date'
            }
        },
        auto_reminder_days: {
            type: 'number',
            minimum: 0,
            maximum: 30,
            errorMessage: {
                minimum: 'Auto reminder days must be at least 0',
                maximum: 'Auto reminder days must be at most 30'
            }
        },
        service_lines: {
            type: 'array',
            items: {
                type: 'object',
                required: ['service'],
                properties: {
                    service: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 255,
                        errorMessage: {
                            minLength: 'Service name is required',
                            maxLength: 'Service name must be less than 255 characters'
                        }
                    },
                    type: {
                        type: 'string',
                        enum: ['Fixed', 'Hourly', 'Recurring'],
                        errorMessage: {
                            enum: 'Service type must be Fixed, Hourly, or Recurring'
                        }
                    },
                    quantity: {
                        type: 'number',
                        minimum: 0,
                        errorMessage: {
                            minimum: 'Quantity must be a positive number'
                        }
                    },
                    rate: {
                        type: 'number',
                        minimum: 0,
                        errorMessage: {
                            minimum: 'Rate must be a positive number'
                        }
                    },
                    total: {
                        type: 'number',
                        minimum: 0,
                        errorMessage: {
                            minimum: 'Total must be a positive number'
                        }
                    },
                    description: {
                        type: 'string',
                        maxLength: 1000,
                        errorMessage: {
                            maxLength: 'Service description must be less than 1000 characters'
                        }
                    }
                }
            },
            errorMessage: {
                type: 'Service lines must be an array'
            }
        },
        billing_settings: {
            type: 'object',
            properties: {
                has_recurring: {
                    type: 'boolean'
                },
                billing_cycle: {
                    type: 'string',
                    enum: ['Monthly', 'Quarterly', 'Annually', 'Bi-monthly'],
                    errorMessage: {
                        enum: 'Billing cycle must be Monthly, Quarterly, Annually, or Bi-monthly'
                    }
                },
                billing_start_date: {
                    type: 'string',
                    format: 'date',
                    errorMessage: {
                        format: 'Billing start date must be a valid date'
                    }
                },
                recurring_amount: {
                    type: 'number',
                    minimum: 0,
                    errorMessage: {
                        minimum: 'Recurring amount must be a positive number'
                    }
                },
                invoice_due_days: {
                    type: 'number',
                    minimum: 1,
                    maximum: 90,
                    errorMessage: {
                        minimum: 'Invoice due days must be at least 1',
                        maximum: 'Invoice due days must be at most 90'
                    }
                },
                payment_method: {
                    type: 'string',
                    enum: ['bank_transfer', 'credit_card'],
                    errorMessage: {
                        enum: 'Payment method must be bank_transfer or credit_card'
                    }
                },
                auto_raise_invoice: {
                    type: 'boolean'
                },
                auto_send_invoice: {
                    type: 'boolean'
                },
                billing_end_date: {
                    type: 'string',
                    format: 'date',
                    errorMessage: {
                        format: 'Billing end date must be a valid date'
                    }
                }
            }
        },
        documents: {
            type: 'object',
            properties: {
                engagement_letter: {
                    type: 'object',
                    properties: {
                        content: {
                            type: 'string',
                            minLength: 1,
                            errorMessage: {
                                minLength: 'Engagement letter content is required'
                            }
                        },
                        html: {
                            type: 'string'
                        }
                    }
                },
                terms_conditions: {
                    type: 'object',
                    properties: {
                        content: {
                            type: 'string',
                            minLength: 1,
                            errorMessage: {
                                minLength: 'Terms and conditions content is required'
                            }
                        }
                    }
                }
            }
        }
    }
};

const updateProposalSchema = {
    type: 'object',
    properties: {
        title: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
            errorMessage: {
                minLength: 'Title must be at least 1 character',
                maxLength: 'Title must be less than 255 characters'
            }
        },
        description: {
            type: 'string',
            maxLength: 2000,
            errorMessage: {
                maxLength: 'Description must be less than 2000 characters'
            }
        },
        client_id: {
            type: 'string',
            format: 'uuid',
            errorMessage: {
                format: 'Client ID must be a valid UUID'
            }
        },
        client_name: {
            type: 'string',
            maxLength: 255,
            errorMessage: {
                maxLength: 'Client name must be less than 255 characters'
            }
        },
        client_email: {
            type: 'string',
            format: 'email',
            errorMessage: {
                format: 'Client email must be a valid email address'
            }
        },
        contact_name: {
            type: 'string',
            maxLength: 255,
            errorMessage: {
                maxLength: 'Contact name must be less than 255 characters'
            }
        },
        cover_message: {
            type: 'string',
            maxLength: 5000,
            errorMessage: {
                maxLength: 'Cover message must be less than 5000 characters'
            }
        },
        total_value: {
            type: 'number',
            minimum: 0,
            errorMessage: {
                minimum: 'Total value must be a positive number'
            }
        },
        subtotal: {
            type: 'number',
            minimum: 0,
            errorMessage: {
                minimum: 'Subtotal must be a positive number'
            }
        },
        gst_amount: {
            type: 'number',
            minimum: 0,
            errorMessage: {
                minimum: 'GST amount must be a positive number'
            }
        },
        expiry_date: {
            type: 'string',
            format: 'date-time',
            errorMessage: {
                format: 'Expiry date must be a valid date'
            }
        },
        auto_reminder_days: {
            type: 'number',
            minimum: 0,
            maximum: 30,
            errorMessage: {
                minimum: 'Auto reminder days must be at least 0',
                maximum: 'Auto reminder days must be at most 30'
            }
        },
        service_lines: {
            type: 'array',
            items: {
                type: 'object',
                required: ['service'],
                properties: {
                    service: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 255
                    },
                    type: {
                        type: 'string',
                        enum: ['Fixed', 'Hourly', 'Recurring']
                    },
                    quantity: {
                        type: 'number',
                        minimum: 0
                    },
                    rate: {
                        type: 'number',
                        minimum: 0
                    },
                    total: {
                        type: 'number',
                        minimum: 0
                    },
                    description: {
                        type: 'string',
                        maxLength: 1000
                    }
                }
            }
        },
        billing_settings: {
            type: 'object'
        },
        documents: {
            type: 'object'
        }
    }
};

const extendExpirySchema = {
    type: 'object',
    required: ['expiry_date'],
    properties: {
        expiry_date: {
            type: 'string',
            format: 'date-time',
            errorMessage: {
                format: 'Expiry date must be a valid date'
            }
        }
    }
};

const duplicateProposalSchema = {
    type: 'object',
    properties: {
        title: {
            type: 'string',
            maxLength: 255,
            errorMessage: {
                maxLength: 'Title must be less than 255 characters'
            }
        }
    }
};

const acceptProposalSchema = {
    type: 'object',
    required: ['signature_type'],
    properties: {
        signature_type: {
            type: 'string',
            enum: ['draw', 'type'],
            errorMessage: {
                enum: 'Signature type must be draw or type'
            }
        },
        signature_data: {
            type: 'string',
            errorMessage: {
                type: 'Signature data must be a string'
            }
        },
        typed_name: {
            type: 'string',
            maxLength: 255,
            errorMessage: {
                maxLength: 'Typed name must be less than 255 characters'
            }
        },
        full_name: {
            type: 'string',
            maxLength: 255,
            errorMessage: {
                maxLength: 'Full name must be less than 255 characters'
            }
        }
    },
    if: {
        properties: {
            signature_type: {
                const: 'type'
            }
        }
    },
    then: {
        required: ['full_name'],
        errorMessage: {
            required: 'Full name is required for typed signatures'
        }
    }
};

const declineProposalSchema = {
    type: 'object',
    properties: {
        reason: {
            type: 'string',
            maxLength: 500,
            errorMessage: {
                maxLength: 'Reason must be less than 500 characters'
            }
        }
    }
};

module.exports = {
    createProposalSchema,
    updateProposalSchema,
    extendExpirySchema,
    duplicateProposalSchema,
    acceptProposalSchema,
    declineProposalSchema
};
