'use strict';

const Joi = require('joi');

const response = Joi.object().keys({
	version: Joi.string().description('Version of the API')
}).description('Health Endpoint of the API');


const meta = {
	swagger: {
		summary: 'Whoami route',
		description: 'Health Endpoint of the API',
		tags: ['Common']
	}
};

module.exports = {response, meta};