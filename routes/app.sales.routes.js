const Branch = require('../models/Branch');
const bcrypt = require('bcrypt');
const { saleCreate, saleDelete, saleShow, saleList, addPayment } = require('../controllers/sale.controller');

const errResponse = {
    type: 'object',
    properties: {
        status: { type: 'string' },
        message: {type: 'string'}
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
        // if (!decoded._id || (decoded.role!='admin') ) {
        //     return reply.code(401).send({
        //         status: 'fail',
        //         message: 'invalid_crm_token'
        //     })
        // }
    
        const branch = await Branch.findOne({_id: decoded._id, isDeleted:false});
    
        if(branch == null){
            return reply.code(401).send({
                status: 'fail',
                message: 'Sucursal autentificada no existe'
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
              }
            }
          },
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
            type:'array',
            items:{
                amount:{type:'number'},
                paid:{type:'string'},
                paymentType:{type:'string'}
            }
        },              
        createdAt:{type:'string'},
        updatedAt:{type:'string'}        
    }
}

const postSaleUpOpts = {
    schema: {
        description:'Allows to register a new single payment sale  on database.',
        tags:['Sales'],
        // headers:{
        //     authorization:{type:'string'}
        // },
        body: {
            type: 'object',            
            properties: {                
                branchId:{type:'string'},
                
                userId:{type:'string'},
                clientId:{type:'string'},
                employeeId:{type:'string'},                           
                // modelId:{type:'string'},
                //color:{type:'string'},
                // price:{type:'number'},               
                // quantity:{type:'number'},
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
                      }
                    }
                },                
                paymentType:{type:'string'},
            },
        },
        response: {
            201: {
                type: 'object',
                properties: {
                    status: { type: 'string' },
                    data:saleDef
 
                }
            },
            400: errResponse
        }
    },
    preHandler: authorizeFunc,
    handler: saleCreate,
}

const getSingleSaleOpts={
    schema: {
         description:"Retrieves the information of a single sale with the saleId provided for the id of the branch ",
         tags:['Sale'],
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
    preHandler: authorizeFunc,
    handler: saleShow,
    
}

const getBranchSalesOpts={
    schema: {
         description:"Retrieves the information of all the sales for the branch with id provided in URL, stored on the database.",
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
    preHandler: authorizeFunc,
    handler: saleList,
    
}

function appSalesRoutes(fastify, options, done) {
    fastify.post('/app/:id/sales', postSaleUpOpts)
    fastify.get('/app/:id/sales/:saleId', getSingleSaleOpts)
    fastify.get('/app/:id/sales', getBranchSalesOpts)

    // fastify.get('/crm/branches', getBranchesOpts)
    // fastify.get('/crm/branches/:id', getSingleBranchOpts)
    
    // fastify.put('/crm/branches/:id', putSingleBranchOpts)
    // fastify.delete('/crm/branches/:id', deleteSingleBranchOpts)

done()
}
module.exports = appSalesRoutes