const User = require('../models/User');
const Branch = require('../models/Branch');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");
const { getOffsetSetting } = require('../controllers/base.controller')


const userLogin = async function (req, reply) {    
    const user = await User.findOne({email: req.body.email, isDeleted:false});

    if(user == null){
        return reply.code(404).send({
            status: 'fail',
            message: 'Usuario no encontrado'
        })
    }

    if(user.role!='admin' && user.role!='supervisor'){
        return reply.code(401).send({
            status: 'fail',
            message: 'El usuario no tiene autorización en el CRM'
        })

    }

    // if(user.isEnabled == false){
    //     return reply.code(404).send({
    //         status: 'fail',
    //         message: 'user_disabled'
    //     })
    // }

    if(!bcrypt.compareSync(req.body.password, user.password)){



        if(!user.tempPassword || !user.tempPasswordExpiration){
            return reply.code(401).send({
                status: 'fail',
                message: 'Contraseña incorrecta'
            })
        }

        let today = new Date();
        let offset = await getOffsetSetting();              
        today.setHours(today.getHours() - offset);
        let expirationDate = new Date(user.tempPasswordExpiration)

        if(!bcrypt.compareSync(req.body.password, user.tempPassword)){
            return reply.code(401).send({
                status: 'fail',
                message: 'Contraseña incorrecta'
            })
        }
        else{
            if(today>expirationDate){
                return reply.code(401).send({
                    status: 'fail',
                    message: 'Contraseña temporal expirada'
                })

            }
        }


    }

    // if(req.body.cmsLogin == true){
    //     let today = new Date();
    //     user.lastCMSAccess = today;
    //     await user.save();
    
    // }

    const timestamp = parseInt((new Date().getTime() / 1000).toFixed(0));
    this.jwt.sign({_id: user._id, role:user.role, isDeleted:user.isDeleted, timestamp: timestamp}, async (err, token) => {
        if (err) return reply.send(err)

        if (user.branchId){
            await user.populate([
                {path:'branchId', select:'_id name code'},
            ]); 
             
        }
        let userObj = user.toObject()       


        delete userObj.password;

        reply.code(200).send({
            status: 'success',
            data: {
                token: token,
                user: userObj
            }
        }) 
    })
}

const userCreate = async function (req, reply){

    if(req.body.branchId!=null && req.body.branchId!=""){        
        let branchValidation= isValidObjectId(req.body.branchId)
        if (branchValidation==false){
            return reply.code(400).send({
                status: 'fail',
                message: 'Sucursal no válida'
            })
        }
        else{
            let activeBranch= await Branch.findOne({_id:req.body.branchId,isDeleted:false})
            if(!activeBranch){
                return reply.code(400).send({
                    status: 'fail',
                    message: 'Sucursal no encontrada'
                })

            }
        }
    } 

    let emailValidation = await User.findOne({email: req.body.email.toLowerCase(), isDeleted:false})
    if(emailValidation != null){
        return reply.code(400).send({
            status: 'fail',
            message: 'El correo electrónico proporcionado ya se encuentra registrado'
        })
    } 


    if(!req.body.password || req.body.password==""){
        return reply.code(400).send({
            status: 'fail',
            message: 'La contraseña es requerida'
        })

    }

    if(req.body.password.length<5){
        return reply.code(400).send({
            status: 'fail',
            message: 'La contraseña debe tener al menos 5 caracteres'
        })
    }

    let branchId = req.body.branchId;        
    delete req.body.branchId;    
    const user = new User(req.body);
    let plainPassword = user.password;
    let hash = bcrypt.hashSync(plainPassword, 12) 
    user.password=hash;
    
    if(branchId){
        user.branchId=branchId;
    }    
    
    user._id = mongoose.Types.ObjectId();
    await user.save()
    await user.populate([
        {path:'branchId', select:'_id name code'},        
    ]); 
    
    

    //await saveHistory(loggedUser,"CREATED","Branch",branch)

    const userObj = await user.toObject()
    // if (carObj.branchId){
    //     carObj.branchCode=carObj.branchId.code ? carObj.branchId.code :"";
    //     carObj.branchName=carObj.branchId.name ? carObj.branchId.name :"";
    //     delete carObj.branchId;
    // }
    if(!userObj.branchId || !userObj.branchId._id){
        userObj.branchId={
            _id:null,
            name:"",
            code:"",
        }
    }
    delete userObj.__v
    delete userObj.password

    reply.code(201).send({
        status: 'success',
        data: userObj
     })

}

const userShow = async function (req, reply){
    const user = await User.findOne({_id:req.params.id, isDeleted:false}).select('-createdAt -updatedAt -__v');
    if (!user){
        return reply.code(400).send({
            status: 'fail',
            message: 'Usuario no encontrado'
        })        
    }
    
    await user.populate([
        {path:'branchId', select:'_id name code'},       
    ]);  
    let userObj = await user.toObject();            
    // if (carObj.branchId){
    //     carObj.branchCode=carObj.branchId.code ? carObj.branchId.code :"";
    //     carObj.branchName=carObj.branchId.name ? carObj.branchId.name :"";
    //     delete carObj.branchId;
    // }
    if(!userObj.branchId || !userObj.branchId._id){
        userObj.branchId={
            _id:null,
            name:"",
            code:""            
        }
    }
   
    
    reply.code(200).send({
        status: 'success',
        data: userObj
    })    



}

const userDelete = async function (req, reply){
    let currentUser = await User.findOne({_id: req.params.id, isDeleted:false});
    if(currentUser == null){
        return reply.code(400).send({
            status: 'fail',
            message: 'Usuario no registrado'
        })
    }

    let updatedUser = await User.findOne({_id: req.params.id, isDeleted:false}).select('-__v');
    updatedUser.isDeleted=true;
    await updatedUser.save();
    reply.code(200).send({
        status: 'success',
        message: 'Usuario '+updatedUser.fullName+' eliminado correctamente'           
        
    })  
    



}


const userList = async function (req, reply){
    let searchQuery = {
        isDeleted: false,			
    };    

    if(req.query.branchId){
        searchQuery['branchId']=req.query.branchId
    }

    const options = {
        select: `-isDeleted -__v`, 

    }
    if (req.query.page){
        options.page = req.query.page;
    }
    if (req.query.page){
        options.limit = req.query.perPage;
    }
    if (req.query.column){
        let column= req.query.column
        let order = req.query.order =='desc' ? -1 :1
        options.sort={};
        options.sort[column]=order    
    }
    else{
        options.sort={"fullName":1}
    }
    let usersPaginated={};
    if(!req.query.search){         
        //let sortOrder={name:1}       
        let allBranches = await Branch.find({});
        if(options.page!=null && options.limit!=null){
            usersPaginated.docs=[];            
            let usersQuery = await User.paginate(searchQuery, options);
            usersQuery.docs.forEach(user => {
                let newObj={
                    _id:user._id,                    
                    fullName:user.fullName, 
                    email:user.email, 
                    role:user.role,
                    createdAt:user.createdAt,
                    updatedAt:user.updatedAt                    

                }
                let branchInfo = allBranches.find(branch=>{
                    return String(branch._id) == String(user.branchId)
                })
                newObj.branchId={
                    _id:user.branchId ? user.branchId :null,
                    name : branchInfo && branchInfo.name ? branchInfo.name : "",
                    code : branchInfo && branchInfo.code ? branchInfo.code : "",

                }
 
                
                delete user.branchId;
                delete user.modelId;                 
                usersPaginated.docs.push(newObj)                               
            });
            usersPaginated.page=usersQuery.page;
            usersPaginated.perPage=usersQuery.limit;
            usersPaginated.totalDocs=usersQuery.totalDocs;
            usersPaginated.totalPages=usersQuery.totalPages;
        }
        else{
            let sortOrder = {}
            if(req.query.column){
                
                sortOrder[req.query.column] = req.query.order == "desc" ? -1:1
            }
            else{
                sortOrder ={
                    name:1
                }
            }
            usersPaginated.docs=[]
            let usersQuery = await User.find(searchQuery).sort(sortOrder).lean();
            usersQuery.forEach(user => {
                let branchInfo = allBranches.find(branch=>{
                    return String(branch._id) == String(user.branchId)
                }) 
                let branchId={
                    _id:user.branchId ? user.branchId :null,
                    name : branchInfo && branchInfo.name ? branchInfo.name : "",
                    code : branchInfo && branchInfo.code ? branchInfo.code : "",
                }                 
                user.branchId=branchId;         
                // user.branchName = branchInfo && branchInfo.name ? branchInfo.name : "",
                // user.branchCode = branchInfo && branchInfo.code ? branchInfo.code : "",
                // delete user.branchId;                
                usersPaginated.docs.push(user)
                

                
            });
        }
        
        
        
        

        
    }
    else{
        // branchSearch = await Car.search(req.query.search, { isDeleted: false }).collation({locale: "es", strength: 3}).select(options.select);
        // usersPaginated.totalDocs = branchSearch.length;
        let diacriticSearch = diacriticSensitiveRegex(req.query.search);
        let searchString = '.*'+diacriticSearch+'.*';

  //    let searchString = '.*'+req.query.search+'.*';
          delete options.select;
          let aggregateQuery=[];
          if(req.params.id && !req.query.branchId){
            aggregateQuery.push({
                '$match':{
                    branchId:new ObjectId(req.params.id)
                }
                })
          }
          if(!req.params.id && req.query.branchId){
            aggregateQuery.push({
                '$match':{
                    branchId:new ObjectId(req.query.branchId)
                }
            })
          }
          aggregateQuery.push(
              {
                '$match': {
                  'isDeleted': false
                }
              }, 
              {
                '$lookup': {
                  'from': 'branches', 
                  'localField': 'branchId', 
                  'foreignField': '_id', 
                  'as': 'branchInfo'
                }
              },              
              
              {
                '$project': {               
                  'fullName': 1, 
                  'email': 1,
                  'color':1,
                  "plans":1,
                  'branchId._id': {
                    '$first': '$branchInfo._id'
                  },
                  'branchId.code': {
                    '$first': '$branchInfo.code'
                  } ,
                  'branchId.name': {
                    '$first': '$branchInfo.name'
                  },
                  'modelId._id': {
                    '$first': '$modelInfo._id'
                  },
                  'modelId.name': {
                    '$first': '$modelInfo.name'
                  }, 
                  'startDate':1,
                  'expireDate':1,
                  'rentalTime':1,
                  'remainingTime':1  


                }
              }, {
                '$match': {
                  '$or': [
                    {
                      'name': {
                        '$regex': searchString, 
                        '$options': 'i'
                      }
                    }, {
                      'color': {
                        '$regex': searchString, 
                        '$options': 'i'
                      }
                    },
                    {
                        'ipAddress': {
                          '$regex': searchString, 
                          '$options': 'i'
                        }
                      },
                      {
                        'branchId.code': {
                          '$regex': searchString, 
                          '$options': 'i'
                        }
                      },
                      {
                        'branchId.name': {
                          '$regex': searchString, 
                          '$options': 'i'
                        }
                      },
                      {
                        'modelId.name': {
                          '$regex': searchString, 
                          '$options': 'i'
                        }
                      }
                  ]
                }
              }
            )
            let sortQuery={
                '$sort':{}
            };
            if (req.query.column){
                let sortColumn = req.query.column;
                let order = req.query.order == "desc" ? -1: 1
                sortQuery['$sort'][sortColumn]=order;
            }
            else{
                sortQuery['$sort']['name']=1;
            }
            aggregateQuery.push(sortQuery)        
        let usersSearch = await User.aggregate(aggregateQuery);
        usersPaginated.docs = usersSearch;
        usersPaginated.totalDocs = usersPaginated.docs.length

        usersPaginated.page=req.query.page ? req.query.page : 1;
        usersPaginated.perPage=req.query.perPage ? req.query.perPage :usersPaginated.totalDocs;
        let limit = req.query.perPage ? req.query.perPage : usersPaginated.totalDocs;
        let page = req.query.page ? req.query.page : 1;
        usersPaginated.docs=paginateArray(usersSearch,limit,page);
        
        usersPaginated.docs.forEach(doc=>{
            if (!doc.branchId || !doc.branchId._id){
                doc.branchId ={
                    _id:null,
                    code:"",
                    name:""
                }
            }
        })
        usersPaginated.totalPages = Math.ceil(usersPaginated.totalDocs / usersPaginated.perPage);

    }

    let docs = JSON.stringify(usersPaginated.docs);    
    var users = JSON.parse(docs);
    

    reply.code(200).send({
        status: 'success',
        data: users,
        page: usersPaginated.page,
        perPage:usersPaginated.perPage,
        totalDocs: usersPaginated.totalDocs,
        totalPages: usersPaginated.totalPages,

    })

}



const userUpdate = async function (req, reply){

}

function paginateArray(array, limit, page) {
    return array.slice((page - 1) * limit, page * limit);
}

function isValidObjectId(id){
    
    if(ObjectId.isValid(id)){
        if((String)(new ObjectId(id)) === id)
            return true;
        return false;
    }
    return false;
}

function minutesDiff(dateTimeValue2, dateTimeValue1) {
    let negativeResult = false
    if(dateTimeValue2>dateTimeValue1){    
        negativeResult=true;
    }    
    var differenceValue =(dateTimeValue1.getTime() - dateTimeValue2.getTime()) / 1000;
    differenceValue /= 60;
    let result = Math.abs(Math.round(differenceValue)); 
    result = negativeResult==true? -result : result;
    return result
 }
 

function diacriticSensitiveRegex(string = '') {
    return string.replace(/a/g, '[a,á,à,ä,â]')
       .replace(/e/g, '[e,é,ë,è]')
       .replace(/i/g, '[i,í,ï,ì]')
       .replace(/o/g, '[o,ó,ö,ò]')
       .replace(/u/g, '[u,ü,ú,ù]');
}

module.exports = { userLogin, userCreate, userShow, userDelete, userList, userUpdate }