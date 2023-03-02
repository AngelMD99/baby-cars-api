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



module.exports = function (server, options, done) {
    server.post('/users/in', postUserSignInOpts);
    // server.post('/users/forgot', bankClientForgotPassword);
    // server.get('/users/current', getCurrentClientOpts);
    // server.post('/admins/in', postUserSignInOpts);    
    // server.get('/admins', getUserListOpts);
    // server.post('/admins', postUserSaveOpts);
    // server.put('/admins/:id', putUserSaveOpts);
    // server.get('/admins/current', getCurrentUserOpts);
    // server.delete('/admins/:id', deleteUserOpts);

    done();
};