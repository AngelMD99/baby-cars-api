const users = require("../controllers/user.controller.js");
const User = require('../models/User');
const errResponse = {
    type: 'object',
    properties: {
        status: { type: 'string' },
        message: {type: 'string'}
    }
}

const authorizeUserFunc = async function (req, reply) {
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
            return reply.code(401).send({
                status: 'fail',
                message: 'Usuario autentificado no existe'
            })             
        }
        if(user.isEnabled == false){
            return reply.code(404).send({
                status: 'fail',
                message: 'Usuario deshabilitado'
            })
        }
    
        return decoded
    } catch (err) {
      return reply.code(401).send(err)
    }
}

const userDef={
    type:'object',
    properties: {
        _id:{type:'string'},
        isEnabled:{type:'string'}                       ,
        fullName:{type:'string'},
        email:{type:'string'},
        phone:{type:'string'},
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
        createdAt:{type:'string'},
        updatedAt:{type:'string'}
      }

}

const postUserSignInOpts = {
    schema: {
        description:'Authenticates and creates a session for a user',
        tags:['Users'],        
        body:{
            type:'object',
            required:['email', 'password'],
            properties:{
                email:{type:'string'},
                password:{type:'string'},
            }
        },      
        response: {
            200: {
                type: 'object',
                properties: {
                    status: { type: 'string' },
                    data: {
                        type: 'object',
                        properties: {
                            token: {type: 'string'},
                            user: userDef
                        }
                    }
                }
            },
            400: errResponse
        }
    },
    handler: users.userBranchLogin

}

const verifySingleUserOpts={
    schema: {
         description:"Retrieves the information of a single user with the id provided in order to verify role and branches",
         tags:['Users'],
        //  headers:{
        //     authorization:{type:'string'}
        // },
         params:{
            id:{type:'string'}
         },         
         response: {
            200: {
                  type: 'object',
                  properties: {
                  status: { type: 'string' },
                  data: userDef
                  }               
            },
            400: errResponse
        }
         
    },
    preHandler: authorizeUserFunc,
    handler: users.userVerify,
    
}

function appUsersRoutes(fastify, options, done) {
    // fastify.get('/branches/:id/cars', getCarsOpts)
    // fastify.get('/branches/:id/auto-off', autoStopCars)        
    // fastify.get('/branches/:id/available/cars', getAvailableCarsOpts)
    // fastify.get('/branches/:id/available/plans', getAvailablePlansOpts)
    // fastify.put('/cars/:id/start', startSingleCarOpts)
    // fastify.put('/cars/:id/stop', stopSingleCarOpts)            
    //fastify.delete('/crm/branches/:id', getCarsOpts)
    fastify.post('/app/users/in', postUserSignInOpts);
    fastify.get('/app/users/verify', verifySingleUserOpts);

done()
}
module.exports = appUsersRoutes