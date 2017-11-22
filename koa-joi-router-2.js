'use strict';

const documentationRouter = require('koa-router')();
const docspec = require('./lib/base-spec.js');
const generator = require('./lib/generator.js');
const validator = require('./lib/validator.js');
const _ = require('lodash');
const requireAll = require('require-all');
let json_schemas;

/**
 * Generate a Swagger 2.0 specification as an object for this API.
 *
 * @param {object} baseSpec - base document
 * @param {object} baseSpec.info
 * @param {string} baseSpec.info.title
 * @param {string} baseSpec.info.version
 * @param {object} baseSpec.tags
 * @param {string} baseSpec.tags.name
 * @param {string} baseSpec.tags.description
 * @param {object} [options]
 * @param {object} [options.warnFunc]
 * @param {object} [options.defaultResponses]
 * @returns {object} swagger 2.0 specification
 */

const generateSpec = (baseSpec, userOptions, controllers, json_schemas) => {
	const options = Object.assign({
		warnFunc: console.warn,
		defaultResponses: {
			200: {
				description: 'Success'
			}
		}
	}, userOptions);

	let apiRoutes = _.map(controllers, controller => controller.stack);
	apiRoutes = _.flatten(apiRoutes).map(route => {
		return {
			method: route.methods,
			paramNames: route.paramNames,
			path: route.path,
			name: route.name,
			prefix: route.opts.prefix
		};
	});

	const doc = _.cloneDeep(baseSpec);
	doc.swagger = '2.0';
	doc.paths = doc.paths || {};
	doc.tags = doc.tags || [];

	apiRoutes.forEach(function (apiRoute) {
		const routeOptions = Object.assign({}, options, {
			prefix: apiRoute.prefix
		});

		const routePaths = generator.routeToSwaggerPaths(apiRoute, routeOptions, json_schemas);

		generator.mergeSwaggerPaths(doc.paths, routePaths, options);
	});

	return doc;
};

module.exports = {
	generator: (controllers, specPath, baseSpec) => {
    const json_schemas = requireAll(specPath);
		const spec = generateSpec(docspec.base, docspec.baseOptions, controllers, json_schemas);
		/**
		 * Swagger JSON API
		 */
		documentationRouter.get('/_api.json', async ctx => {
			ctx.body = JSON.stringify(spec, null, '  ');
		});

		/**
		 * API documentation in redoc
		 */
		documentationRouter.get('/redoc', async ctx => {
			ctx.body = docspec.redoc;
		});

		/**
		 * API documentation in swagger
		 */
		documentationRouter.get('/swagger', async ctx => {
			ctx.body = docspec.swagger;
		});
		return documentationRouter;
  },
  validator
};
