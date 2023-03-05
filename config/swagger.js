exports.options = {
    routePrefix: '/documentation',
    exposeRoute: true,
    swagger: {
      info: {
        title: 'Baby Cars API',
        description: 'API services for baby cars mobile and web applications'
      },
      tags: [
        { name: 'General', description: 'General  and base end-points' },
        { name: 'Users', description: 'Users related end-points' },            
        { name: 'Branches', description: 'Branches related end-points' } , 
        { name: 'Cars', description: 'Cars related end-points' } ,               
        { name: 'Rentals', description: 'Rentals related end-points' },            
                
      ],
      definitions: {      
        users: {
          type: 'object',
          required: ['email', 'password','role'],
          properties: {
            _id:{type:'string'},
            isDeleted:{type:'boolean'},
            role:{
                type:'string',
                enum:['admin','employee']
            },
            fullName:{type:'string'},
            email:{type:'string'},
            password:{type:'string'},
            createdAt:{type:'timestamp'},
            updatedAt:{type:'timestamp'}
          }
        },
        branches: {
          type: 'object',
          required: ['name','password','code'],
          properties: {
            _id:{type:'string'},
            isDeleted:{type:'boolean'},
            name:{type:'string'},
            code:{type:'string'},
            password:{type:'string'},
            location:{type:'string'},               
            createdAt:{type:'timestamp'},
            updatedAt:{type:'timestamp'}
          }
        },
        cars: {
          type: 'object',
          required: ['ipAddress'],
          properties: {
            _id:{type:'string'},
            isDeleted:{type:'boolean'},            
            isStarted:{type:'boolean'},            
            name:{type:'string'},          
            color:{type:'string'}, 
            plans:{
                type:'array',
                items:{ 
                    type:'object',
                    properties:{
                        time:{
                            type:'number'                        
                        },
                        price:{
                            type:'number'                         
                        }                       
                    }
                }
            },         
            
            createdAt:{type:'timestamp'},
            updatedAt:{type:'timestamp'}
          }
        },

        rentals: {
          type: 'object',
          required: ['branchId', 'carId','plan','paymentType'],
          properties: {
            _id:{type:'string'},
            isDeleted:{type:'boolean'},                        
            folio:{type:'boolean'},
            branchId:{type:'string'},
            carId:{type:'string'},
            planType:{
                type:'object',
                properties:{
                    time:{type:'string'},
                    price:{type:'string'}
                }
            },                    
            paymentType:{type:'string'},
            createdAt:{type:'timestamp'},
            updatedAt:{type:'timestamp'}
          }
        }
        
      }
    }
  }