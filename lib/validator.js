'use strict';

const requireAll = require('require-all');
const joi = require('joi');

const getSchemaByName = routeName => `${routeName}`;

module.exports = (schemaPath) => {
    const json_schemas = requireAll(schemaPath);
    return async function (ctx, next) {
        if (!ctx._matchedRouteName) {
            throw new Error('Router not found');
        }
        const routeName = ctx._matchedRouteName.split('_');
        const [parent, actualRoute] = routeName;
    
        const routeSchema = json_schemas[parent][getSchemaByName(actualRoute)];
    
        // 1. Validate request
        const requestSchema = routeSchema.request;
        if (requestSchema) {
            const {requestParamsSchema} = requestSchema;
            if (requestParamsSchema) {
                const isRequestValid = joi.validate(ctx.params, requestParamsSchema);
                if (isRequestValid.error !== null) {
                    throw new Error(`Invalid Schema in Params of Request. ${isRequestValid.error}`);
                }
            }
            const {requestBodySchema} = requestSchema;
            if (requestBodySchema) {
                const isRequestValid = joi.validate(ctx.params, requestBodySchema);
                if (isRequestValid.error !== null) {
                    throw new Error(`Invalid Schema in Body of Request. ${isRequestValid.error}`);
                }
            }
            const {requestQuerySchema} = requestSchema;
            if (requestQuerySchema) {
                const isRequestValid = joi.validate(ctx.params, requestQuerySchema);
                if (isRequestValid.error !== null) {
                    throw new Error(`Invalid Schema in Query of Request. ${isRequestValid.error}`);
                }
            }
        }
    
    
        // 2. Request -> Response
        await next();
    
        // 3. Screen response
        const responseSchema = routeSchema.response;
        if (responseSchema) {
            const isResponseValid = joi.validate(ctx.body.data || ctx.body, responseSchema);
            if (isResponseValid.error !== null) {
                throw new Error(`Invalid Schema in Response. ${isResponseValid.error}`);
            }
        }
    }
};
