'use strict';

/**
 * payment-activity service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::payment-activity.payment-activity');
