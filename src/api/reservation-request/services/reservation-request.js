'use strict';

/**
 * reservation-request service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::reservation-request.reservation-request');
