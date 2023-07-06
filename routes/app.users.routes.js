const users = require("../controllers/user.controller.js");
const errResponse = {
    type: 'object',
    properties: {
        status: { type: 'string' },
        message: {type: 'string'}
    }
}

const userDef={
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
    handler: users.userLogin

}

function appUsersRoutes(fastify, options, done) {
    // fastify.get('/branches/:id/cars', getCarsOpts)
    // fastify.get('/branches/:id/auto-off', autoStopCars)        
    // fastify.get('/branches/:id/available/cars', getAvailableCarsOpts)
    // fastify.get('/branches/:id/available/plans', getAvailablePlansOpts)
    // fastify.put('/cars/:id/start', startSingleCarOpts)
    // fastify.put('/cars/:id/stop', stopSingleCarOpts)            
    //fastify.delete('/crm/branches/:id', getCarsOpts)
    fastify.post('app/users/in', postUserSignInOpts);

done()
}
module.exports = appUsersRoutes