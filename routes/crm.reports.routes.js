const { rentalsReport, salesReport, reservesReport, balancesReport, paymentsReport, inventoryReport } = require('../controllers/report.controller');
const User = require('../models/User');
const bcrypt = require('bcrypt');

const errResponse = {
    type: 'object',
    properties: {
        status: { type: 'string' },
        message: {type: 'string'}
    }
}
const authorizeToken = async function (req, reply) {
    try {
        if(!req.headers.authorization){
            return reply.code(401).send({
                status: 'fail',
                message: 'Sesión expirada'
            })            
        }

        const decoded = await req.jwtVerify()
        if (!decoded._id || (decoded.role.toLowerCase() !='admin' &&  decoded.role.toLowerCase() !='supervisor')  ) {
        //if (!decoded._id || (decoded.role!='admin') ) {
            return reply.code(401).send({
                status: 'fail',
                message: 'Token de usuario no válido'
            })
        }
    
        const user = await User.findOne({_id: decoded._id, isDeleted:false});
    
        if(user == null){
            return reply.code(404).send({
                status: 'fail',
                message: 'Usuario autentificado no encontrado'
            })
        }        
    
        return decoded
    } catch (err) {
      return reply.code(401).send(err)
    }
}
const authorizeFunc = async function (req, reply) {
    try {
        if(!req.headers.authorization){
            return reply.code(401).send({
                status: 'fail',
                message: 'Sesión expirada'
            })            
        }

        const decoded = await req.jwtVerify()
        if (!decoded._id || (decoded.role!='admin') ) {
            return reply.code(401).send({
                status: 'fail',
                message: 'Token de usuario no válido'
            })
        }
    
        const user = await User.findOne({_id: decoded._id, isDeleted:false});
    
        if(user == null){
            return reply.code(404).send({
                status: 'fail',
                message: 'Usuario autentificado no encontrado'
            })
        }
        // if(user.isEnabled == false){
        //     return reply.code(404).send({
        //         status: 'fail',
        //         message: 'user_disabled'
        //     })
        // }
    
        return decoded
    } catch (err) {
      return reply.code(401).send(err)
    }
}

const getRentalsReportOpts={
    schema: {
         description:"Retrieves a MS Excel file with the information of the rentals for the cars, if branchId, userId, initialData and lastDate are provided on query params, the rentals will be filtered according to them.",
         tags:['Reports'], 
        //  headers:{
        //     authorization:{type:'string'}
        // },
        querystring:{
            carId:{type:'string'},
            branchId:{type:'string'},
            userId:{type:'string'},
            initialDate:{type:'string'},
            lastDate:{type:'string'}
        }, 
        response: {
            200: {
            //     description:'An XLS file',            
                 type:'string',
                 format:'binary',
                 //content: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',                    
            },
            400: errResponse
        }
         
    },
    preHandler: authorizeFunc,
    handler: rentalsReport
    
}

const getSalesReportOpts={
    schema: {
         description:"Retrieves a MS Excel file with the information of the sales for the cars, if branchId, employeeId, initialData and lastDate are provided on query params, the rentals will be filtered according to them.",
         tags:['Reports'], 
        //  headers:{
        //     authorization:{type:'string'}
        // },
        querystring:{
            //carId:{type:'string'},
            branchId:{type:'string'},
            userId:{type:'string'},
            initialDate:{type:'string'},
            lastDate:{type:'string'}
        }, 
        response: {
            200: {
            //     description:'An XLS file',            
                 type:'string',
                 format:'binary',
                 //content: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',                    
            },
            400: errResponse
        }
         
    },
    preHandler: authorizeFunc,
    handler: salesReport
    
}

const getReservesReportOpts={
    schema: {
         description:"Retrieves a MS Excel file with the information of the reserves for the cars, if branchId, employeeId, initialData and lastDate are provided on query params, the rentals will be filtered according to them.",
         tags:['Reports'], 
        //  headers:{
        //     authorization:{type:'string'}
        // },
        querystring:{            
            branchId:{type:'string'},
            employeeId:{type:'string'},
            initialDate:{type:'string'},
            lastDate:{type:'string'},
            isPaid:{type:'string'},
            isCancelled:{type:'string'},
            isDelivered:{type:'string'}
        }, 
        response: {
            200: {
            //     description:'An XLS file',            
                 type:'string',
                 format:'binary',
                 //content: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',                    
            },
            400: errResponse
        }
         
    },
    preHandler: authorizeFunc,
    handler: reservesReport
    
}

const getBalancesReportOpts={
    schema: {
         description:"Retrieves a MS Excel file with the information of the balances, if branchId, employeeId, initialData and lastDate are provided on query params, the rentals will be filtered according to them.",
         tags:['Reports'], 
        //  headers:{
        //     authorization:{type:'string'}
        // },
        querystring:{            
            branchId:{type:'string'},
            userId:{type:'string'},
            balanceType:{type:'string'},
            initialDate:{type:'string'},
            lastDate:{type:'string'}
        }, 
        response: {
            200: {
            //     description:'An XLS file',            
                 type:'string',
                 format:'binary',
                 //content: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',                    
            },
            400: errResponse
        }
         
    },
    preHandler: authorizeFunc,
    handler: balancesReport
    
}

const getPaymentsReportOpts={
    schema: {
         description:"Retrieves a MS Excel file with the information of the payments, if branchId, userId, operatiomType, , initialData and lastDate are provided on query params, the rentals will be filtered according to them.",
         tags:['Reports'], 
        //  headers:{
        //     authorization:{type:'string'}
        // },
        querystring:{            
            branchId:{type:'string'},
            userId:{type:'string'},
            saleId:{type:'string'},
            reserveId:{type:'string'},
            operationType:{type:'string'},
            initialDate:{type:'string'},
            lastDate:{type:'string'},
            isDiscarded:{type:'string'}
        }, 
        response: {
            200: {
            //     description:'An XLS file',            
                 type:'string',
                 format:'binary',
                 //content: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',                    
            },
            400: errResponse
        }
         
    },
    preHandler: authorizeFunc,
    handler: paymentsReport
    
}

const getInventoryReportOpts={
    schema: {
         description:"Retrieves a MS Excel file with the information of the inventories, modelId and color are provided, the inventories will be filtered according to them.",
         tags:['Reports'], 
        //  headers:{
        //     authorization:{type:'string'}
        // },
        querystring:{            
            modelId:{type:'string'},
            color:{type:'string'},            
        }, 
        response: {
            200: {
            //     description:'An XLS file',            
                 type:'string',
                 format:'binary',
                 //content: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',                    
            },
            400: errResponse
        }
         
    },
    preHandler: authorizeFunc,
    handler: inventoryReport
    
}

function crmReportsRoutes(fastify, options, done) {
    fastify.get('/crm/reports/rentals', getRentalsReportOpts)
    fastify.get('/crm/reports/sales', getSalesReportOpts)
    fastify.get('/crm/reports/reserves', getReservesReportOpts)
    fastify.get('/crm/reports/balances', getBalancesReportOpts)
    fastify.get('/crm/reports/payments', getPaymentsReportOpts)
    fastify.get('/crm/reports/inventory', getInventoryReportOpts)
    // fastify.get('/crm/branches/:id', getSingleBranchOpts)
    // fastify.post('/crm/branches', postBranchUpOpts)
    // fastify.put('/crm/branches/:id', putSingleBranchOpts)
    // fastify.delete('/crm/branches/:id', deleteSingleBranchOpts)

done()
}
module.exports = crmReportsRoutes