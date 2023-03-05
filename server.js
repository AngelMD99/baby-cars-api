const fastify = require('fastify')({logger: true});
require('dotenv').config();
fastify.register(require('fastify-multipart'))
const swagger = require('./config/swagger');
//fastify.register(require('@fastify/swagger'), swagger.options);
fastify.register(require('fastify-cors'), { 
	origin:'*',
	methods: ['GET','POST','PUT','HEAD','DELETE','OPTIONS']
});
require("./config/db");
const { Liquid } = require("liquidjs");
const path = require("path");
const engine = new Liquid({
	root: path.join(__dirname, "public"),
	extname: ".html",
});
engine.registerFilter("currency", (v) => {
	var formatter = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	});
	return formatter.format(v);
});
engine.registerFilter("phone", (v) => {
	if(!v) return '';
	phone = "(" + v.substr(0, 3) + ") " + v.substr(3, 7);
	return phone;
});
engine.registerFilter("rfc", (v) => {
	if(!v){
		return ""
	} 		
	else{ 
		rfc = v.substr(0, 3) + " " + v.substr(3, 9) + " " + v.substr(9,3);
		return rfc;
	}

});
engine.registerFilter("fiscal_Folio", (v) => {
	if(!v)
		return ""
	fiscal_Folio = v.substr(0, 8) + "-" + v.substr(8, 4) + "-" + v.substr(12,4) + "-" + v.substr(16,4) + "-" + v.substr(20,13);
	return fiscal_Folio;
});

fastify.register(require("point-of-view"), {
	engine: {
		liquid: engine,
	},
});

// fastify.register(require("@fastify/static"), {
// 	root: path.join(__dirname, "public"),
// 	prefix: "/",
// });

fastify.register(require("fastify-static"), {
	root: path.join(__dirname, "public"),
	prefix: "/",
});

fastify.register(require("./routes/base.routes"));
fastify.register(require("./routes/crm.users.routes"));
fastify.register(require("./routes/crm.branches.routes"));
fastify.register(require("./routes/crm.cars.routes"));
fastify.register(require("./routes/crm.rentals.routes"));
fastify.register(require("./routes/crm.reports.routes"));
fastify.register(require("./routes/app.branches.routes"));
fastify.register(require("./routes/app.rentals.routes"));
fastify.register(require("./routes/app.cars.routes"));
fastify.register(require("./routes/app.tickets.routes"));
// fastify.register(require("./routes/news.routes"));
// fastify.register(require("./routes/subscription.routes"));

fastify.register(require('fastify-jwt'), { secret: process.env.APP_KEY });


fastify.listen({
	port: 4000,
	host: '0.0.0.0'
}, (err, address) => {
	if (err) {
		fastify.log.error(err)
		process.exit(1)
	}
});