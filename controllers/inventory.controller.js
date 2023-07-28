const Inventory = require('../models/Inventory');
const Branch = require('../models/Branch');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
const Modelo = require('../models/Modelo');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");

const inventoryCreate = async function (req,reply){
    let modelValidation= isValidObjectId(req.body.modelId)
    if (modelValidation==false){
        return reply.code(400).send({
            status: 'fail',
            message: 'Modelo no válido'
        })
    }
    if(!req.body.color){
        return reply.code(400).send({
            status: 'fail',
            message: 'El color es requerido'
        })
    }

    let currentModel = await Modelo.findOne({_id:req.body.modelId, isDeleted:false})
    let lowerColors=[];
    currentModel.colors.forEach(color => {
        lowerColors.push(color.toLowerCase())        
    });
    
    if (!lowerColors.includes(req.body.color.toLowerCase()) ) {
        return reply.code(400).send({
            status: 'fail',
            message: 'El color proporcionado no es valido para el modelo'
        })
    }

    let inventoryValidation = await Inventory.findOne({
        modelId:req.body.modelId,
        isDeleted:false,
        color:req.body.color.toLowerCase()
    })

    if (inventoryValidation){
        return reply.code(400).send({
            status: 'fail',
            message: 'Ya existe un registro de inventario para el modelo y color'
        })
    }

    const inventory = new Inventory();
    inventory.modelId  = req.body.modelId;
    inventory.color  = req.body.color.toLowerCase();
    inventory.quantity  = req.body.quantity ? req.body.quantity : 0;
    await inventory.save()
    await inventory.populate([        
        {path:'modelId', select:'_id name'}
    ]);    
    
    //await saveHistory(loggedUser,"CREATED","Branch",branch)

    const inventoryObj = await inventory.toObject()
    if(!inventoryObj.modelId || !inventoryObj.modelId._id){
        inventoryObj.modelId={
            _id:null,
            name:"",            
        }
    }
    delete inventoryObj.__v

    reply.code(201).send({
        status: 'success',
        data: inventoryObj
     }) 



}

const inventoryList = async function (req,reply){
    let searchQuery = {
        isDeleted: false,			
    };
    if(req.query.modelIdId){
        searchQuery['modelId']=req.query.modelId;        
    }

    if(req.query.color){
        searchQuery['color']=req.query.color.toLowerCase();        
    }
    
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
        options.sort={"modelId.name":1}
    }
    let inventoriesPaginated={};
    if(!req.query.search){         
        //let sortOrder={name:1}               
        let allModels = await Modelo.find({});
        if(options.page!=null && options.limit!=null){
            inventoriesPaginated.docs=[];
            let inventoriesQuery = await Inventory.paginate(searchQuery, options);
            inventoriesQuery.docs.forEach(inventory => {
                let newObj={
                    _id:inventory._id,                    
                    color:inventory.color,                    
                    quantity:inventory.quantity,
                    createdAt:inventory.createdAt,
                    updatedAt:inventory.updatedAt

                }
                
                let modelInfo = allModels.find(modelo=>{
                    return String(modelo._id) == String(inventory.modelId)
                })
                newObj.modelId={
                    _id:inventory.modelId ? inventory.modelId :null,
                    name : modelInfo && modelInfo.name ? modelInfo.name : "",
                    code : modelInfo && modelInfo.code ? modelInfo.code : "",

                }                
                delete inventory.modelId;                
                inventoriesPaginated.docs.push(newObj)                               
            });
            inventoriesPaginated.page=inventoriesQuery.page;
            inventoriesPaginated.perPage=inventoriesQuery.limit;
            inventoriesPaginated.totalDocs=inventoriesQuery.totalDocs;
            inventoriesPaginated.totalPages=inventoriesQuery.totalPages;
        }
        else{
            let sortOrder = {}
            if(req.query.column){                
                sortOrder[req.query.column] = req.query.order == "desc" ? -1:1
            }
            else{
                sortOrder ={
                    "modelId.name":1
                }
            }
            inventoriesPaginated.docs=[]
            let inventoriesQuery = await Inventory.find(searchQuery).sort(sortOrder).lean();
            inventoriesQuery.forEach(inventory => {                            
                let modelInfo = allModels.find(modelo=>{
                    return String(modelo._id) == String(inventory.modelId)
                }) 
                let modelId={
                    _id:inventory.modelId ? inventory.modelId :null,
                    name : modelInfo && modelInfo.name ? modelInfo.name : "",                    
                }  
                inventory.modelId=modelId;         
                // inventory.branchName = branchInfo && branchInfo.name ? branchInfo.name : "",
                // inventory.branchCode = branchInfo && branchInfo.code ? branchInfo.code : "",
                // delete inventory.branchId;                
                inventoriesPaginated.docs.push(inventory);                              
            });
        }                              
    }
    else{
        // branchSearch = await inventory.search(req.query.search, { isDeleted: false }).collation({locale: "es", strength: 3}).select(options.select);
        // inventoriesPaginated.totalDocs = branchSearch.length;
        let diacriticSearch = diacriticSensitiveRegex(req.query.search);
        let searchString = '.*'+diacriticSearch+'.*';

  //    let searchString = '.*'+req.query.search+'.*';
        delete options.select;
        let aggregateQuery=[];
        if(req.query.modelId){
            aggregateQuery.push({
               '$match':{
                    modelId:new ObjectId(req.query.modelId)
                }
            })
        }
        if(req.query.color){
            aggregateQuery.push({
               '$match':{
                    color:req.query.color.toLowerCase()
                }
            })
        }
        //   if(req.params.id && !req.query.branchId){
        //     aggregateQuery.push({
        //         '$match':{
        //             branchId:new ObjectId(req.params.id)
        //         }
        //         })
        //   }
        //   if(!req.params.id && req.query.branchId){
        //     aggregateQuery.push({
        //         '$match':{
        //             branchId:new ObjectId(req.query.branchId),
        //             isStarted:true
        //         }
        //         })
        //   }
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
              {
                '$lookup': {
                    'from': 'modelos', 
                    'localField': 'modelId', 
                    'foreignField': '_id', 
                    'as': 'modelInfo'
                  }
             },
              
              {
                '$project': {
                  'color':1,
                  //'branchId': 1,                   
                  'quantity': 1, 
                //   'name': 1,
                //   'color':1,
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
                  'modelId._id': {
                    '$first': '$modelInfo._id'
                  },
                  'modelId.name': {
                    '$first': '$modelInfo.name'
                  }, 
                  'createdAt':1,
                  'updatedAt':1,                
                }
              }, {
                '$match': {
                  '$or': [
                    {
                      'color': {
                        '$regex': searchString, 
                        '$options': 'i'
                      }
                    },
                    // {
                    //     'branchId.code': {
                    //       '$regex': searchString, 
                    //       '$options': 'i'
                    //     }
                    // },
                    //   {
                    //     'branchId.name': {
                    //       '$regex': searchString, 
                    //       '$options': 'i'
                    //     }
                    //   },
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
                sortQuery['$sort']['modelId.name']=1;
            }
            aggregateQuery.push(sortQuery)        
        let inventoriesSearch = await Inventory.aggregate(aggregateQuery);
        inventoriesPaginated.docs = inventoriesSearch;
        inventoriesPaginated.totalDocs = inventoriesPaginated.docs.length

        inventoriesPaginated.page=req.query.page ? req.query.page : 1;
        inventoriesPaginated.perPage=req.query.perPage ? req.query.perPage :inventoriesPaginated.totalDocs;
        let limit = req.query.perPage ? req.query.perPage : inventoriesPaginated.totalDocs;
        let page = req.query.page ? req.query.page : 1;
        inventoriesPaginated.docs=paginateArray(inventoriesSearch,limit,page);
        
        inventoriesPaginated.docs.forEach(doc=>{            
            if (!doc.modelId || !doc.modelId._id){
                doc.modelId ={
                    _id:null,
                    code:"",
                    name:""
                }
            }
        })
        inventoriesPaginated.totalPages = Math.ceil(inventoriesPaginated.totalDocs / inventoriesPaginated.perPage);

    }
    inventoriesPaginated.docs.forEach(doc=>{
        if(doc.isStarted== true && doc.expireDate){
            let currentDate = new Date ()
            let remainingTime = minutesDiff (currentDate,doc.expireDate);
            doc.remainingTime=remainingTime

        }
        

    })
    let docs = JSON.stringify(inventoriesPaginated.docs);    
    var inventories = JSON.parse(docs);   
    reply.code(200).send({
        status: 'success',
        data: inventories,
        page: inventoriesPaginated.page,
        perPage:inventoriesPaginated.perPage,
        totalDocs: inventoriesPaginated.totalDocs,
        totalPages: inventoriesPaginated.totalPages,

    })

}

const inventoryShow = async function (req,reply){
    const inventory = await Inventory.findOne({_id:req.params.id, isDeleted:false}).select('-createdAt -updatedAt -__v');
    if (!inventory){
        return reply.code(400).send({
            status: 'fail',
            message: 'Inventario no registrado'
        })        
    } 
    
    await inventory.populate([        
        {path:'modelId', select:'_id name'}
    ]);  
    let inventoryObj = await inventory.toObject();            
    
    // if (inventoryObj.branchId){
    //     inventoryObj.branchCode=inventoryObj.branchId.code ? inventoryObj.branchId.code :"";
    //     inventoryObj.branchName=inventoryObj.branchId.name ? inventoryObj.branchId.name :"";
    //     delete inventoryObj.branchId;
    // }    
    if(!inventoryObj.modelId || !inventoryObj.modelId._id){
        inventoryObj.modelId={
            _id:null,
            name:""            
        }
    }
    reply.code(200).send({
        status: 'success',
        data: inventoryObj
    }) 

}

const inventoryDelete = async function (req,reply){
    let currentInventory = await Inventory.findOne({_id: req.params.id, isDeleted:false});
    if(currentInventory == null){
        return reply.code(400).send({
            status: 'fail',
            message: 'Inventario no registrado'
        })
    }

    let updatedInventory = await Inventory.findOne({_id: req.params.id, isDeleted:false}).select('-__v');
    updatedInventory.isDeleted=true;
    await updatedInventory.save();
    reply.code(200).send({
        status: 'success',
        message: 'Inventario eliminado correctamente'           
        
    }) 

}

const inventoryUpdate = async function (req,reply){
    let currentInventory = await Inventory.findOne({_id: req.params.id, isDeleted:false});
    if(currentInventory == null){
        return reply.code(400).send({
            status: 'fail',
            message: 'Inventario no registrado'
        })
    }    
    let validActions =['adjust','add']

    if (!req.body.action){
        return reply.code(400).send({
            status: 'fail',
            message: 'Se requiere la acción a realizar'
        })
    }

    if (!validActions.includes(req.body.action.toLowerCase())){
        return reply.code(400).send({
            status: 'fail',
            message: 'No se indico una acción valida'
        })
    }
    
    let currentQuantity = currentInventory.quantity;
    let receivedQuantity = req.body.quantity ? req.body.quantity : 0

    if (req.body.action=='adjust'){
        currentQuantity = receivedQuantity;
    }
    if (req.body.action=='add'){
        currentQuantity += receivedQuantity;
    }


    // let updatedInventory = await Inventory.findByIdAndUpdate({_id: req.params.id},inputs,{
    //     new:true,
    //     overwrite:true
    // }).select('-__v');    

    let updatedInventory = await Inventory.findOne({_id: req.params.id, isDeleted:false});
    updatedInventory.quantity = currentQuantity;    

    await updatedInventory.save();
    await updatedInventory.populate([
        {path:'modelId', select:'_id name'}
    ]);  
    let updatedInventoryObj = await updatedInventory.toObject();                
    if(!updatedInventoryObj.modelId || !updatedInventoryObj.modelId._id){
        updatedInventoryObj.modelId={
            _id:null,
            name:""            
        }
    }  
    delete updatedInventoryObj.__v   
    reply.code(200).send({
        status: 'success',
        data: updatedInventoryObj                   
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


module.exports = { inventoryCreate, inventoryDelete, inventoryList, inventoryUpdate, inventoryShow  }