'use strict';

const pathToRegex = require('path-to-regexp');
const j2s = require('joi-to-swagger');
const _ = require('lodash');

const captureRegex = /(:\w+)/g;

const getSchemaByName = routeName => `${routeName}`;


exports.mergeSwaggerPaths = function mergeSwaggerPaths(parampaths, newPaths, options) {
	const warn = options && options.warnFunc;
	const paths = parampaths;
	_.each(newPaths, function (newPathItemObj, path) {
		paths[path] = paths[path] || {};
		const pathItemObj = paths[path];

		// Merge operations into path
		_.each(newPathItemObj, function (operationObj, method) {
			if (pathItemObj[method]) {
				// already exists!
				if (warn) warn(`${path}[${method}] exists in multiple routes`);
				return;
			}

			pathItemObj[method] = operationObj;
		});
	});

	return paths;
};

exports.routesToSwaggerPaths = function routesToSwaggerPaths(routes, options) {
	const paths = {};

	routes.forEach(function (route) {
		const routePaths = exports.routeToSwaggerPaths(route, options);

		exports.mergeSwaggerPaths(paths, routePaths, options);
	});

	return paths;
};

/**
 * For a given joi-router route, return an array of Swagger paths.
 * @param {object} route
 * @returns {object[]} paths
 */
exports.routeToSwaggerPaths = function routeToSwaggerPaths(route, userOptions, json_schemas) {
	const options = userOptions || {};

	const paths = {};
	const routeDesc = {
		responses: _.cloneDeep(options.defaultResponses) || {}
	};
	const routeName = route.name.split('_');
	const [parent, actualRoute] = routeName;

	const routeSchema = json_schemas[parent][getSchemaByName(actualRoute)];
	const requestSchema = routeSchema.request;
	const responseSchema = routeSchema.response;
	const {meta} = routeSchema;

	if (responseSchema) {
		routeDesc.responses[200] = outputToSwagger(responseSchema);
	}

	if (requestSchema) {
		const {type} = requestSchema;

		if (!type) {
			// do nothing
		} else if (type === 'json') {
			routeDesc.consumes = ['application/json'];
		} else if (type === 'form') {
			routeDesc.consumes = ['application/x-www-form-urlencoded'];
		} else if (type === 'multipart') {
			routeDesc.consumes = ['multipart/form-data'];
		}
		routeDesc.parameters = exports.validateToSwaggerParameters(requestSchema);
	}

	if (meta && meta.swagger) {
		Object.assign(routeDesc, meta.swagger);
	}

	// This sets default 'path' parameters so swagger-ui doesn't complain.
	const noPathParamsExist = !_.some(routeDesc.parameters, ['in', 'path']);
	const noPathValidatorExists = _.get(route, 'validate.path') === undefined;
	if (noPathParamsExist && noPathValidatorExists) {
		routeDesc.parameters = routeDesc.parameters || [];
		const pathCaptures = route.path.match(captureRegex);
		if (pathCaptures) {
			_.each(pathCaptures, function (pathParameter) {
				routeDesc.parameters.push({
					name: pathParameter.replace(':', ''),
					in: 'path',
					type: 'string',
					required: true
				});
			});
		}
	}

	let path = exports.swaggerizePath(route.path);

	if (options.prefix) {
		if (options.prefix.endsWith('/') || path.startsWith('/')) {
			path = `${options.prefix}${path}`;
		} else {
			path = `${options.prefix}/${path}`;
		}
	}
	paths[path] = {};
	const pathItemObj = paths[path];

	const methods = Array.isArray(route.method) ? route.method : [route.method];

	methods.forEach(function (method) {
		if (method !== 'HEAD') {
			const operationObj = routeDesc;
			pathItemObj[method.toLowerCase()] = operationObj;
		}
	});

	return paths;
};

function addSchemaParameters(parameters, location, schema) {
	const swaggerObject = j2s(schema).swagger;
	if (swaggerObject.type === 'object' && swaggerObject.properties) {
		_.each(swaggerObject.properties, function (tempValue, name) {
			const value = tempValue;
			if (value.type === 'string' && value.format === 'binary') {
				value.type = 'file';
				delete value.format;
			}
			const parameter = value;
			parameter.name = name;
			parameter.in = location;
			parameters.push(parameter);
		});
	}
}

function outputToSwagger(respJson) {
	const obj = {};
	if (respJson) {
		const swaggerSpec = j2s(respJson);
		obj.schema = swaggerSpec.swagger;
		obj.description = swaggerSpec.swagger.description || respJson.schema || obj.schema.description || 'Success';
	}
	return obj;
}


/**
 * Convert joi-router validate object to swagger
 */
exports.validateToSwaggerParameters = function (validate) {
	const parameters = [];

	if (validate.header) {
		addSchemaParameters(parameters, 'header', validate.header);
	}

	if (validate.query) {
		addSchemaParameters(parameters, 'query', validate.query);
	}

	if (validate.params) {
		// TODO: Write about in README.md
		addSchemaParameters(parameters, 'path', validate.params);
	}

	if (validate.form) {
		addSchemaParameters(parameters, 'formData', validate.form);
	}

	if (validate.body) {
		const swaggerSchema = j2s(validate.body).swagger;
		parameters.push({
			name: 'body',
			in: 'body',
			schema: swaggerSchema
		});
	}
	return parameters;
};

/* Convert a joi-router path into a Swagger parameterized path,
 * e.g. /users/:userId becomes /users/{userId}
 *
 * FIXME: incomplete handling, escaping, etc
 * FIXME: throw error if a complex regex is used
 */
exports.swaggerizePath = function swaggerizePath(path) {
	const pathTokens = pathToRegex.parse(path);

	const segments = pathTokens.map(function (token) {
		let segment = token;

		if (token.name) {
			segment = `{${token.name}}`; // this means this is a complex regex group. for more info, read up on path-to-regexp, koa-joi-router uses it, it's great.
		} else {
			segment = token.replace('/', ''); // remove leading slash, to handle things like complex routes: /users/:userId/friends/:friendId
		}

		return segment;
	});

	return '/' + segments.join('/'); // path is normalized, just add that leading slash back to handle prefixes properly again.
};
