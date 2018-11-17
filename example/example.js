const Koa = require("koa");
const Router = require("koa-router");

const {generator, validator} = require("../koa-joi-router-2.js");
 
const app = new Koa();
const router1 = new Router();
const path = require("path");
const schemasBasePath = path.join(__dirname, "./validations");
// schemasBasePath should have the schema definitions for each route,
// that is specified as folderPrefix_fileName and passed to the controller

const joiValidator = validator(schemasBasePath);

// Here common_api is required for both the swagger documenation and joi validator middleware
router1.get("common_whoami", "/whoami", joiValidator, function (ctx, next) {
	ctx.body = {
		version: "0.0.1"
	};
});

const router2 = new Router();

router2.get("misc_another", "/another_route", joiValidator, function (ctx, next) {
	ctx.body = {
		version: "0.0.1"
	};
});
 
const docRouter = generator([router1, router2], schemasBasePath);
app.use(docRouter.middleware());

app
	.use(router1.routes())
	.use(router1.allowedMethods());

app
	.use(router2.routes())
	.use(router2.allowedMethods());

app.listen(4000);