const payments = require("../controllers/payment.controller.js");
const User = require('../models/User');
const bcrypt = require('bcrypt');




const errResponse = {
    type: 'object',
    properties: {
        status: { type: 'string' },
        message: {type: 'string'}
    }
}

const paymentDef={
    type:'object',
    properties: {
        _id:{type:'string'},                       
        fullName:{type:'string'},
        email:{type:'string'},
        contactLastName:{type:'string'},
        role:{type:'string'},
        branchId:{
            type:'object',
            properties:{
                _id:{type:'string'},
                name:{type:'string'},
                code:{type:'string'}
            }
        },
        saleId:{
            type:'object',
            properties:{
                _id:{type:'string'},
                folio:{type:'string'},
                client:{
                    type:'object',
                    properties:{
                        fullName:{type:'string'},
                        phone:{type:'string'},
                        email:{type:'string'}
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
                           price:{type:'number'},
                           quantity:{type:'number'},
                        }
                    }
                },
                totalSale:{type:'number'},
                createdAt:{type:'string'},
                updatedAt:{type:'string'}               

            }
        },  
        reserveId:{
            type:'object',
            properties:{
                _id:{type:'string'},
                isDeleted:{type:'boolean'},
                isPaid:{type:'boolean'},
                isCancelled:{type:'boolean'},                
                folio:{type:'string'},
                client:{
                    type:'object',
                    properties:{
                        fullName:{type:'string'},
                        phone:{type:'string'},
                        email:{type:'string'}
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
                           price:{type:'number'},
                           quantity:{type:'number'},
                        }
                    }
                },
                totalSale:{type:'number'},
                expirationDate:{type:'string'},
                createdAt:{type:'string'},
                updatedAt:{type:'string'}               

            }
        },
        collectedBy:{
            type:'object',
            properties:{
                _id:{type:'string'},
                fullName:{type:'string'},
                email:{type:'string'},
                phone:{type:'string'},


            }
        }, 
                      
        createdAt:{type:'string'},
        updatedAt:{type:'string'}
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

const authorizeLogin = async function (req, reply) {
    try {
        if(!req.headers.authorization){
            return reply.code(401).send({
                status: 'fail',
                message: 'Sesión expirada'
            })            
        }

        const decoded = await req.jwtVerify()
    
        const user = await User.findOne({_id: decoded._id, isDeleted:false});
    
        if(user == null){
            return reply.code(404).send({
                status: 'fail',
                message: 'Usuario autentificado no encontrado'
            })
        }
        // if(user.role!='admin' || user.role!='supervisor'){
        //     return reply.code(401).send({
        //         status: 'fail',
        //         message: 'El usuario no tiene autorización'
        //     })
    
        // }
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

const getPaymentsOpts={
    schema: {
         description:"Retrieves the information of all the payments stored on the database.",
         tags:['Payments'], 
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
                    items:paymentDef,
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
    handler: payments.listPayments,
    
}

// const postUserSignInOpts = {
//     schema: {
//         description:'Authenticates and creates a session for a user',
//         tags:['Users'],        
//         body:{
//             type:'object',
//             required:['email', 'password'],
//             properties:{
//                 email:{type:'string'},
//                 password:{type:'string'},
//             }
//         },      
//         response: {
//             200: {
//                 type: 'object',
//                 properties: {
//                     status: { type: 'string' },
//                     data: {
//                         type: 'object',
//                         properties: {
//                             token: {type: 'string'},
//                             user: paymentDef
//                         }
//                     }
//                 }
//             },
//             400: errResponse
//         }
//     },
//     handler: users.userLogin

// }

// const postUserSaveOpts = {
//     schema: {
//         description:'Allows to create a new user on database',
//         tags:['Users'],        
//         body:{
//             type:'object',
//             required:['email'],
//             properties:{
//                 email:{type:'string'},
//                 password:{type:'string'},
//             }
//         },      
//         response: {
//             200: {
//                 type: 'object',
//                 properties: {
//                     status: { type: 'string' },
//                     data: {
//                         type: 'object',
//                         properties: {
//                             token: {type: 'string'},
//                             user: paymentDef
//                         }
//                     }
//                 }
//             },
//             400: errResponse
//         }
//     },
//     preHandler: authorizeFunc,
//     handler: users.userCreate

// }

// const getSingleUserOpts={
//     schema: {
//          description:"Retrieves the information of a single user with the id provided.",
//          tags:['Users'],
//         //  headers:{
//         //     authorization:{type:'string'}
//         // },
//          params:{
//             id:{type:'string'}
//          },         
//          response: {
//             200: {
//                   type: 'object',
//                   properties: {
//                   status: { type: 'string' },
//                   data: paymentDef
//                   }               
//             },
//             400: errResponse
//         }
         
//     },
//     preHandler: authorizeFunc,
//     handler: users.userShow,
    
// }

// const deleteSingleUserOpts={
//     schema: {
//          description:"Deletes the user with the id provided.",
//          tags:['Users'],
//         //  headers:{
//         //     authorization:{type:'string'}
//         // },
//          params:{
//             id:{type:'string'}
//          },         
//          response: {
//             200: {
//                 type:'object',
//                 properties:{
//                     status:{type:'string'},
//                     message:{type:'string'}
//                 }
//             },
//             400: errResponse
//         }
         
//     },
//     preHandler: authorizeFunc,
//     handler: users.userDelete,
    
// }


// const putSingleUserOpts={
//     schema: {
//          description:"Allows to update the information of a single car with the id provided.",
//          tags:['User'],
//         //  headers:{
//         //     authorization:{type:'string'}
//         // },
//          params:{
//             id:{type:'string'}
//          }, 
//          body: {
//             type: 'object',
//             properties: {                                
//                 fullName: { type: 'string' },                
//                 email: { type: 'string' },              
//                 branchId:{type:'string'},
//                 password: { type: 'string' }, 
//                 role: {type:'string'}

//             },
//         },      
//          response: {
//             200: {
//                   type: 'object',
//                   properties: {
//                   status: { type: 'string' },
//                   data:paymentDef
//                   }               
//             },
//             400: errResponse
//         }
         
//     },
//     preHandler: authorizeLogin,
//     handler: users.userUpdate
    
// }

function crmPaymentRoutes(fastify, options, done) {    
    fastify.get('/crm/payments', getPaymentsOpts);    
    // fastify.post('/users/in', postUserSignInOpts);
    // fastify.post('/users', postUserSaveOpts);
    
    // fastify.get('/users/:id', getSingleUserOpts);
    // fastify.delete('/users/:id', deleteSingleUserOpts);
    // fastify.put('/users/:id', putSingleUserOpts);

done()
}
module.exports = crmPaymentRoutes