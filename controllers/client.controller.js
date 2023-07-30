const Client = require('../models/Client');
const Branch = require('../models/Branch');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
const Modelo = require('../models/Modelo');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");

const clientCreate = async function (req,reply){    
    if(!req.body.fullName || req.body.fullName ==""){
        reply.code(400).send({
            status: 'fail',
            message:"El nombre completo del cliente es necesario"
        })
    }

    if(!req.body.phone || req.body.phone ==""){
        reply.code(400).send({
            status: 'fail',
            message:"El teléfono del cliente es necesario"
        })
    }
    const client = new Client(req.body);         
    
    client._id = mongoose.Types.ObjectId();
    await client.save()    
      
    //await saveHistory(loggedUser,"CREATED","Branch",branch)

    const clientObj = await client.toObject()
    // if (clientObj.branchId){
    //     clientObj.branchCode=clientObj.branchId.code ? clientObj.branchId.code :"";
    //     clientObj.branchName=clientObj.branchId.name ? clientObj.branchId.name :"";
    //     delete clientObj.branchId;
    // }    
    delete clientObj.__v
    return reply.code(201).send({
        status: 'success',
        data: clientObj
    })      
}

const clientShow = async function (req,reply){
    const client = await Client.findOne({_id:req.params.id, isDeleted:false}).select('-createdAt -updatedAt -__v');
    if (!client){
        return reply.code(400).send({
            status: 'fail',
            message: 'Cliente no registrado'
        })        
    } 
        
    let clientObj = await client.toObject();            
    
    return reply.code(200).send({
        status: 'success',
        data: clientObj
    })   

}

const clientDelete = async function (req,reply){
    const client = await Client.findOne({_id:req.params.id, isDeleted:false}).select('-createdAt -updatedAt -__v');
    if (!client){
        return reply.code(400).send({
            status: 'fail',
            message: 'Cliente no registrado'
        })        
    } 
        
    client.isDeleted=true;
    await client.save();
    
    return reply.code(400).send({
        status: 'success',
        message:"Cliente "+client.fullName+" eliminado correctamente."
    })   

}

const clientUpdate = async function (req,reply){    
    let currentClient = await Client.findOne({_id: req.params.id, isDeleted:false});
    if(currentClient == null){
        return reply.code(400).send({
            status: 'fail',
            message: 'Cliente no registrado'
        })
    }

    //let updatedCar = await Car.findOne({_id: req.params.id, isDeleted:false}).select('-__v');

    // let branchNumberCheck = await Branch.findOne({branchNumber: req.body.branchNumber, isDeleted:false})

    // if(branchNumberCheck!=null && String(branchNumberCheck._id) != String(currentBranch._id)){
    //     reply.code(400).send({
    //         status: 'fail',
    //         message: 'branch_number_already_registered'
    //     })
    // }
    let inputs={};
    // if(!req.body.branchId || req.body.branchId=="" || !req.body.branchId._id || req.body.branchId._id==""){
    //     await Car.updateOne({_id:req.params.id}, { $unset: { branchId: 1 } })
        
    // }  
       
    inputs.fullName = req.body.fullName ? req.body.fullName:currentClient.fullName;
    inputs.phone = req.body.phone ? req.body.phone:currentClient.phone; 
    inputs.email = req.body.email;   
    let updatedClient = await Client.findByIdAndUpdate({_id: req.params.id},inputs,{
        new:true,
        overwrite:true
    }).select('-__v');
    // updatedClient.branchId = req.body.branchId && req.body.branchId._id? req.body.branchId._id : updatedClient.branchId;
    // updatedClient.ipAddress = req.body.ipAddress!=null ? req.body.ipAddress : updatedClient.ipAddress;
    // updatedClient.name = req.body.name!=null ? req.body.name : updatedClient.name;
    // updatedClient.color = req.body.color!=null ? req.body.color : updatedClient.color;
    
  
    // if (req.body.image){

    //     if(currentProduct.image){
    //         let serverURL = process.env.APP_HOST;
    //         serverURL = process.env.APP_LOCAL_PORT !=null ? serverURL + ":"+process.env.APP_LOCAL_PORT : serverURL;
    //         if(req.body.image.full != currentProduct.image.full){
    //             let currentFullImage = currentProduct.image.full.replace(serverURL,'');
    //             currentFullImage = __dirname + currentFullImage;
    //             currentFullImage = currentFullImage.replace('controllers/','');
    //             let imageExists = await fileExists(currentFullImage)
    //             if (imageExists==true){
    //                 fs.remove(currentFullImage, err => {
    //                     if (err) return console.error(err)
    //                   })
    //             }
    //             updatedProduct.image.full =req.body.image.full;
    //         }
    //         if(req.body.image.thumbnail != currentProduct.image.thumbnail){
    //             let currentThumbnail = currentProduct.image.thumbnail.replace(serverURL,'');
    //             currentThumbnail = __dirname + currentThumbnail;
    //             currentThumbnail = currentThumbnail.replace('controllers/','');
    //             let imageExists = await fileExists(currentThumbnail);

    //             if (imageExists==true){
    //                 fs.remove(currentThumbnail, err => {
    //                     if (err) return console.error(err)
    //                   })
    //             }
    //             updatedProduct.image.thumbnail =req.body.image.thumbnail;
    //         }
    //     }
    //     else{
    //         updatedProduct.image={
    //             full:req.body.image.full,
    //             thumbnail:req.body.image.thumbnail
    //         }
    //     }


    // }

    await updatedClient.save();

    let updatedClientObj = await updatedClient.toObject();            
    
    // if (updatedClientObj.branchId){
    //     updatedClientObj.branchCode=updatedClientObj.branchId.code ? updatedClientObj.branchId.code :"";
    //     updatedClientObj.branchName=updatedClientObj.branchId.name ? updatedClientObj.branchId.name :"";
    //     delete updatedClientObj.branchId;
    // }
    // if(!updatedClientObj.branchId || !updatedClientObj.branchId._id){
    //     updatedClientObj.branchId={
    //         _id:null,
    //         name:"",            
    //     }
    // }
    // if(!updatedClientObj.modelId || !updatedClientObj.modelId._id){
    //     updatedClientObj.modelId={
    //         _id:null,
    //         name:""            
    //     }
    // }   

    delete updatedClientObj.__v;   
    return reply.code(200).send({
        status: 'success',
        data: updatedClientObj           
        
    }) 
    


}

const clientList = async function (req,reply){
    let searchQuery = {
        isDeleted: false,			
    };    

    const options = {
        select: `-isDeleted -__v -updatedAt -createdAt`, 

    }
    if (req.query.page){
        options.page = req.query.page;
    }
    if (req.query.perPage){
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
    let clientsPaginated={};
    if(!req.query.search){         
        //let sortOrder={name:1}               
        if(options.page!=null && options.limit!=null){
            clientsPaginated.docs=[];
            let clientsQuery = await Client.paginate(searchQuery, options);
            clientsQuery.docs.forEach(client => {
                let newObj={
                    _id:client._id,
                    fullName:client.fullName,
                    phone:client.phone,
                    email:client.email,
                    createdAt:client.createdAt,
                    updatedAt:client.updatedAt,
                    // expireDate:client.expireDate,
                    // rentalTime:client.rentalTime,
                    // remainingTime:client.remainingTime  

                }
                // let branchInfo = allBranches.find(branch=>{
                //     return String(branch._id) == String(client.branchId)
                // })
                // newObj.branchId={
                //     _id:client.branchId ? client.branchId :null,
                //     name : branchInfo && branchInfo.name ? branchInfo.name : "",
                //     code : branchInfo && branchInfo.code ? branchInfo.code : "",

                // }
                // let modelInfo = allModels.find(modelo=>{
                //     return String(modelo._id) == String(client.modelId)
                // })
                // newObj.modelId={
                //     _id:client.modelId ? client.modelId :null,
                //     name : modelInfo && modelInfo.name ? modelInfo.name : "",
                //     code : modelInfo && modelInfo.code ? modelInfo.code : "",

                // }
                
                // delete client.branchId;
                // delete client.modelId;                
                clientsPaginated.docs.push(newObj)                               
            });
            clientsPaginated.page=clientsQuery.page;
            clientsPaginated.perPage=clientsQuery.limit;
            clientsPaginated.totalDocs=clientsQuery.totalDocs;
            clientsPaginated.totalPages=clientsQuery.totalPages;
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
            clientsPaginated.docs=[]
            let clientsQuery = await Client.find(searchQuery).sort(sortOrder).lean();
            clientsQuery.forEach(client => {
                // let branchInfo = allBranches.find(branch=>{
                //     return String(branch._id) == String(client.branchId)
                // }) 
                // let branchId={
                //     _id:client.branchId ? client.branchId :null,
                //     name : branchInfo && branchInfo.name ? branchInfo.name : "",
                //     code : branchInfo && branchInfo.code ? branchInfo.code : "",
                // } 
                // let modelInfo = allModels.find(modelo=>{
                //     return String(modelo._id) == String(client.modelId)
                // }) 
                // let modelId={
                //     _id:client.modelId ? client.modelId :null,
                //     name : modelInfo && modelInfo.name ? modelInfo.name : "",                    
                // }  
                // client.branchId=branchId;         
                // client.modelId=modelId;         
                // client.branchName = branchInfo && branchInfo.name ? branchInfo.name : "",
                // client.branchCode = branchInfo && branchInfo.code ? branchInfo.code : "",
                // delete client.branchId;                
                clientsPaginated.docs.push(client)
                

                
            });
        }
        
        
        
        

        
    }
    else{
        // branchSearch = await client.search(req.query.search, { isDeleted: false }).collation({locale: "es", strength: 3}).select(options.select);
        // clientsPaginated.totalDocs = branchSearch.length;
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
                    branchId:new ObjectId(req.query.branchId),
                    isStarted:true
                }
                })
          }
          aggregateQuery.push(
              {
                '$match': {
                  'isDeleted': false
                }
              }, 
            //   {
            //     '$lookup': {
            //       'from': 'branches', 
            //       'localField': 'branchId', 
            //       'foreignField': '_id', 
            //       'as': 'branchInfo'
            //     }
            //   },
            //   {
            //     '$lookup': {
            //         'from': 'modelos', 
            //         'localField': 'modelId', 
            //         'foreignField': '_id', 
            //         'as': 'modelInfo'
            //       }
            //  },
              
              {
                '$project': {
                  'isDeleted':1,
                  //'branchId': 1,                   
                  'fullName': 1, 
                  'phone': 1,
                  'email':1,
                //   "plans":1,
                //   'branchId._id': {
                //     '$first': '$branchInfo._id'
                //   },
                //   'branchId.code': {
                //     '$first': '$branchInfo.code'
                //   } ,
                //   'branchId.name': {
                //     '$first': '$branchInfo.name'
                //   },
                //   'modelId._id': {
                //     '$first': '$modelInfo._id'
                //   },
                //   'modelId.name': {
                //     '$first': '$modelInfo.name'
                //   }, 
                  'createdAt':1,
                  'updatedAt':1,
                //   'rentalTime':1,
                //   'remainingTime':1  


                }
              }, {
                '$match': {
                  '$or': [
                    {
                      'fullName': {
                        '$regex': searchString, 
                        '$options': 'i'
                      }
                    }, {
                      'phone': {
                        '$regex': searchString, 
                        '$options': 'i'
                      }
                    },
                    {
                        'email': {
                          '$regex': searchString, 
                          '$options': 'i'
                        }
                    },
                    //   {
                    //     'branchId.code': {
                    //       '$regex': searchString, 
                    //       '$options': 'i'
                    //     }
                    //   },
                    //   {
                    //     'branchId.name': {
                    //       '$regex': searchString, 
                    //       '$options': 'i'
                    //     }
                    //   },
                    //   {
                    //     'modelId.name': {
                    //       '$regex': searchString, 
                    //       '$options': 'i'
                    //     }
                    //   }
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
        let clientsSearch = await Client.aggregate(aggregateQuery);
        clientsPaginated.docs = clientsSearch;
        clientsPaginated.totalDocs = clientsPaginated.docs.length

        clientsPaginated.page=req.query.page ? req.query.page : 1;
        clientsPaginated.perPage=req.query.perPage ? req.query.perPage :clientsPaginated.totalDocs;
        let limit = req.query.perPage ? req.query.perPage : clientsPaginated.totalDocs;
        let page = req.query.page ? req.query.page : 1;
        clientsPaginated.docs=paginateArray(clientsSearch,limit,page);
        
        // clientsPaginated.docs.forEach(doc=>{
        //     if (!doc.branchId || !doc.branchId._id){
        //         doc.branchId ={
        //             _id:null,
        //             code:"",
        //             name:""
        //         }
        //     }
        //     if (!doc.modelId || !doc.modelId._id){
        //         doc.modelId ={
        //             _id:null,
        //             code:"",
        //             name:""
        //         }
        //     }
        // })
        clientsPaginated.totalPages = Math.ceil(clientsPaginated.totalDocs / clientsPaginated.perPage);

    }
    clientsPaginated.docs.forEach(doc=>{
        if(doc.isStarted== true && doc.expireDate){
            let currentDate = new Date ()
            let remainingTime = minutesDiff (currentDate,doc.expireDate);
            doc.remainingTime=remainingTime

        }
        

    })
    let docs = JSON.stringify(clientsPaginated.docs);    
    var clients = JSON.parse(docs);
    

    reply.code(200).send({
        status: 'success',
        data: clients,
        page: clientsPaginated.page,
        perPage:clientsPaginated.perPage,
        totalDocs: clientsPaginated.totalDocs,
        totalPages: clientsPaginated.totalPages,

    })

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


module.exports = { clientCreate, clientList, clientShow, clientDelete, clientUpdate }