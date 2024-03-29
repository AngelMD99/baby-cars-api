const users = require("../controllers/user.controller.js");
const User = require('../models/User');
const bcrypt = require('bcrypt');
const { balanceShow, balanceRentalsCreate, balanceList, balancePaymentsCreate, balanceDelete } = require('../controllers/balance.controller');

const errResponse = {
    type: 'object',
    properties: {
        status: { type: 'string' },
        message: {type: 'string'}
    }
}

const balanceDef={
    type:'object',
    properties: {
        _id:{type:'string'},
        isDeleted:{type:'boolean'},
        folio:{type:'string'},
        balanceType:{type:'string'}                              ,
        amount:{type:'number'},
        quantity:{type:'number'},
        loginDate:{type:'string'},
        balanceDate:{type:'string'},
        userId:{
            type:'object',
            properties:{
                _id:{type:'string'},
                fullName:{type:'string'},
                email:{type:'string'}
            }
        },                
        branchId:{
            type:'object',
            properties:{
                _id:{type:'string'},
                name:{type:'string'},
                code:{type:'string'}
            }
        },                
        createdAt:{type:'string'},
        updatedAt:{type:'string'}
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
        if(user.role!='admin'){
            return reply.code(401).send({
                status: 'fail',
                message: 'El usuario no tiene autorización'
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

const getSingleBalanceOpts={
    schema: {
         description:"Retrieves the balance in the database with the balance id provided in URL",
         tags:['Balances'], 
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
                  data:balanceDef

                }               
            },
            400: errResponse
        }
         
    },
    preHandler: authorizeFunc,
    handler: balanceShow,
    
}

const deleteSingleBalanceOpts={
    schema: {
         description:"Deletes the balance with the id provided in the URL.",
         tags:['Balances'],
        //  headers:{
        //     authorization:{type:'string'}
        // },
         params:{
            id:{type:'string'}
         },         
         response: {
            200: {
                type:'object',
                properties:{
                    status:{type:'string'},
                    message:{type:'string'}
                }
            },
            400: errResponse
        }
         
    },
    preHandler: authorizeFunc,
    handler: balanceDelete,
    
}

const getBalancesOpts={
    schema: {
         description:"Retrieves the information of all the balances stored on the database.",
         tags:['Balances'], 
        //  headers:{
        //     authorization:{type:'string'}
        // }, 
        querystring:{
            page:{type:'string'},
            perPage:{type:'string'},
            userId:{type:'string'},
            initialDate:{type:'string'},
            lastDate:{type:'string'},
            balanceType:{type:'string'},

        },
         response: {
            200: {
                  type: 'object',
                  properties: {
                  status: { type: 'string' },
                  data:{
                    type:'array',
                    items:balanceDef,
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
    handler: balanceList,
    
}

function crmBalancesRoutes(fastify, options, done) {    
    // fastify.post('/users/in', postUserSignInOpts);
    // fastify.post('/users', postUserSaveOpts);
    fastify.get('/crm/balance/:balanceId', getSingleBalanceOpts);
    fastify.delete('/crm/balance/:balanceId', deleteSingleBalanceOpts);
    fastify.get('/crm/balance', getBalancesOpts);
    // fastify.get('/users/:id', getSingleUserOpts);
    // fastify.delete('/users/:id', deleteSingleUserOpts);
    // fastify.put('/users/:id', putSingleUserOpts);

done()
}
module.exports = crmBalancesRoutes