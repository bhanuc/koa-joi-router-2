'use strict';

const Joi = require('joi');

const response = Joi.object().keys({
	version: Joi.string().description('Version of the API')
}).description('Another Endpoint of the API');


const meta = {
	swagger: {
		summary: 'Another route',
		description: 'Another Endpoint of the API',
		tags: ['Misc']
	}
};

module.exports = {response, meta};