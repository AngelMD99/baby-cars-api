const fastify = require('fastify')({logger: true});
require('dotenv').config();
fastify.register(require('@fastify/multipart'))
const swagger = require('./config/swagger');
//fastify.register(require('@fastify/swagger'), swagger.options);
fastify.register(require('@fastify/cors'), { 
	origin:'*',
	methods: ['GET','POST','PUT','HEAD','DELETE','OPTIONS']
});
require("./config/db");
fastify.register(require("./routes/base.routes"));
fastify.register(require("./routes/crm.users.routes"));
fastify.register(require("./routes/crm.branches.routes"));
fastify.register(require("./routes/crm.cars.routes"));
fastify.register(require("./routes/crm.rentals.routes"));
fastify.register(require("./routes/app.branches.routes"));
fastify.register(require("./routes/app.rentals.routes"));
fastify.register(require("./routes/app.cars.routes"));
// fastify.register(require("./routes/news.routes"));
// fastify.register(require("./routes/subscription.routes"));

fastify.register(require('@fastify/jwt'), { secret: process.env.APP_KEY });


fastify.listen({
	port: 4000,
	host: '0.0.0.0'
}, (err, address) => {
	if (err) {
		fastify.log.error(err)
		process.exit(1)
	}
});