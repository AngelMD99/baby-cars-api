const bcrypt = require('bcrypt');
const { saleList, saleCreate, saleShow, saleUpdate,addPayment, saleShowCRM  } = require('../controllers/sale.controller');
const User = require('../models/User');

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

const saleDef = { 
    type: 'object',    
    properties: {
        _id: { type: 'string' },
        folio:{type:'string'},
        branchId:{
            type:'object',
            properties:{
                _id:{type:'string'},
                code:{type:'string'},
                name:{type:'string'}
            }
        },
        // clientId:{
        //     type:'object',
        //     properties:{
        //         _id:{type:'string'},
        //         fullName:{type:'string'},                
        //         email:{type:'string'},                
        //         phone:{type:'string'},                
        //     }
        // },
        client:{
            type:'object',
            properties:{
              fullName:{type:'string'},
              email:{type:'string'},
              phone:{type:'string'}
            }
        },
        employeeId:{
            type:'object',
            properties:{
                _id:{type:'string'},
                fullName:{type:'string'},                
                email:{type:'string'},                                
            }
        },
        products:{
            type:'array',
            items:{
              type:'object',
              properties:{
                modelId:{type:'string'},
                modelName:{type:'string'},
                color:{type:'string'},
                quantity:{type:'number'},
                price:{type:'number'},
                totalAmount:{type:'number'}
              }
            }
        },
        totalProducts:{type:'number'},
        differentProducts:{type:'number'},
        // modelId:{
        //     type:'object',
        //     properties:{
        //         _id:{type:'string'},
        //         name:{type:'string'},                
        //     }
        // },
        // quantity:{type:'number'},
        // price:{type:'number'},
        totalSale:{type:'number'},
        payments:{
            type:'object',
            properties:{
                amount:{type:'number'},
                paidOn:{type:'string'},
                paymentType:{type:'string'}
            }
        },              
        createdAt:{type:'string'},
        updatedAt:{type:'string'}        
    }
}

const getSalesOpts={
    schema: {
         description:"Retrieves the information of all the sales stored on the database.",
         tags:['Sales'], 
        //  headers:{
        //     authorization:{type:'string'}
        // }, 
        querystring:{
            page:{type:'string'},
            perPage:{type:'string'}
        },
         response: {
            200: {
                  type: 'object',
                  properties: {
                  status: { type: 'string' },
                  data:{
                    type:'array',
                    items:saleDef,
                  },
                   page:{type:'number'},
                   perPage:{type:'number'},
                   totalDocs:{type:'number'},
                   totalPages:{type:'number'}
                }               
            },
            400: errResponse
        }
         
    },
    preHandler: authorizeToken,
    handler: saleList,
    
}

const getSingleSaleOpts={
    schema: {
         description:"Retrieves the information of a single sale with the saleId provided for the id of the branch ",
         tags:['Sales'],
        //  headers:{
        //     authorization:{type:'string'}
        // },
         params:{
            id:{type:'string'},
            saleId:{type:'string'}
         },         
         response: {
            200: {
                  type: 'object',
                  properties: {
                  status: { type: 'string' },
                  data: saleDef
                  }               
            },
            400: errResponse
        }
         
    },
    preHandler:authorizeToken,
    handler: saleShowCRM,
    
}

function crmSalesRoutes(fastify, options, done) {
    fastify.get('/crm/sales', getSalesOpts)
    fastify.get('/crm/sales/:saleId', getSingleSaleOpts)
    //fastify.get('/crm/rentals/:id', getSingleRentalOpts)
    // fastify.get('/crm/branches/:id', getSingleBranchOpts)
    
    // fastify.put('/crm/branches/:id', putSingleBranchOpts)
    // fastify.delete('/crm/branches/:id', deleteSingleBranchOpts)

done()
}
module.exports = crmSalesRoutes