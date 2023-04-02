const Modelo = require('../models/Modelo');
const Branch = require('../models/Branch');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");

const modelCreate = async function (req, reply){        
    
    
    let input={
        name:req.body.name,
        colors:[]
    }
    if (req.body.modelColors && req.body.modelColors.length>0){
        req.body.modelColors.forEach(item=>{
            input.colors.push(item.color)
        })
    }
    const modelo = new Modelo(input);     
    modelo._id = mongoose.Types.ObjectId();
    await modelo.save()      

    const modeloObj = await modelo.toObject()
    
    delete modeloObj.__v

    reply.code(201).send({
        status: 'success',
        data: modeloObj
     })      

}

const modelShow = async function (req, reply){
    const modelo = await Modelo.findOne({_id:req.params.id}).select('-createdAt -updatedAt -__v');
    if (!modelo){
        return reply.code(400).send({
            status: 'fail',
            message: 'Modelo no registrado'
        })        
    }     
    
    let modeloObj = await modelo.toObject();                
    
    reply.code(200).send({
        status: 'success',
        data: modeloObj
    })    
    
}

const modelDelete = async function (req, reply){
    let currentModel = await Modelo.findOne({_id: req.params.id, isDeleted:false});
    if(currentModel == null){
        return reply.code(400).send({
            status: 'fail',
            message: 'Modelo no registrado'
        })
    }

    let updatedModel = await Modelo.findOne({_id: req.params.id, isDeleted:false}).select('-__v');
    updatedModel.isDeleted=true;
    await updatedModel.save();
    reply.code(200).send({
        status: 'success',
        message: 'Modelo '+updatedModel.name+' eliminado correctamente'           
        
    })   
    
}

const modelUpdate = async function (req, reply){    
    
    let currentModel = await Modelo.findOne({_id: req.params.id, isDeleted:false});
    if(currentModel == null){
        return reply.code(400).send({
            status: 'fail',
            message: 'Modelo no registrado'
        })
    }

    let updatedColors=[];
    let inputs={};
    
    inputs.name = req.body.name ? req.body.name :currentModel.name;
    if (req.body.modelColors && req.body.modelColors.length>0){
        req.body.modelColors.forEach(item=>{
            updatedColors.push(item.color)
        })
    }
    inputs.colors = updatedColors.length>0 ? updatedColors : currentModel.colors;    
    let updatedModel = await Modelo.findByIdAndUpdate({_id: req.params.id},inputs,{
        new:true,
        overwrite:true
    }).select('-__v');    

    await updatedModel.save();
    
    

    let updatedModelObj = await updatedModel.toObject()        
    delete updatedModelObj.__v
   
    reply.code(200).send({
        status: 'success',
        data: updatedModelObj           
        
    }) 

    
}





const modelsAvailable = async function (req, reply){
    let aggregateQuery=[
        {
            '$match':{
                isDeleted:false
            }
        }
    ];
    aggregateQuery.push(
        {
            '$project': {
              '_id': 0,              
              'modelId._id': '$_id', 
              'modelId.name': '$name',                 
              'modelId.colors': '$colors'
            }
          },{
              '$sort' :{
               'modelId.name':1
              }
           }
    )

    

    let availableModels = await Modelo.aggregate(aggregateQuery);
    reply.code(200).send({
        status:'sucess',
        data:availableModels
    })
}



const modelList = async function (req, reply){
    let searchQuery = {
        isDeleted: false,			
    };
    
    const options = {
        select: `-isDeleted -__v -updatedAt -createdAt`, 

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
        options.sort={"name":1}
    }
    let modelsPaginated={};
    if(!req.query.search){        
        //let sortOrder={name:1}       
    
        if(options.page!=null && options.limit!=null){
            modelsPaginated.docs=[];
            let modelsQuery = await Modelo.paginate(searchQuery, options);
            modelsQuery.docs.forEach(item => {
                let newObj={
                    _id:item._id,                  
                    name:item.name,
                    colors:item.colors,                    
                }
    
                modelsPaginated.docs.push(newObj)                               
            });
            modelsPaginated.page=modelsQuery.page;
            modelsPaginated.perPage=modelsQuery.limit;
            modelsPaginated.totalDocs=modelsQuery.totalDocs;
            modelsPaginated.totalPages=modelsQuery.totalPages;
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
            modelsPaginated.docs=[]
            let modelsQuery = await Modelo.find(searchQuery).sort(sortOrder).lean();
            modelsQuery.forEach(item => {
    
                // item.branchName = branchInfo && branchInfo.name ? branchInfo.name : "",
                // item.branchCode = branchInfo && branchInfo.code ? branchInfo.code : "",
                // delete item.branchId;                
                modelsPaginated.docs.push(item)
                

                
            });
        }
        
        
        
        

        
    }
    else{
        // branchSearch = await Car.search(req.query.search, { isDeleted: false }).collation({locale: "es", strength: 3}).select(options.select);
        // modelsPaginated.totalDocs = branchSearch.length;
        let diacriticSearch = diacriticSensitiveRegex(req.query.search);
        let searchString = '.*'+diacriticSearch+'.*';

  //    let searchString = '.*'+req.query.search+'.*';
          delete options.select;
          let aggregateQuery=[
              {
                '$match': {
                  'isDeleted': false
                }
              }, 
    
              {
                '$project': {                  
                  'name': 1,
                  'colors':1,                  
    

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
                      'colors': {
                        '$regex': searchString, 
                        '$options': 'i'
                      }
                    }
                  ]
                }
              }
            ]
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

        let modelSearch = await Modelo.aggregate(aggregateQuery);
        modelsPaginated.docs = modelSearch;
        modelsPaginated.totalDocs = modelsPaginated.docs.length

        modelsPaginated.page=req.query.page ? req.query.page : 1;
        modelsPaginated.perPage=req.query.perPage ? req.query.perPage :modelsPaginated.totalDocs;
        let limit = req.query.perPage ? req.query.perPage : modelsPaginated.totalDocs;
        let page = req.query.page ? req.query.page : 1;
        modelsPaginated.docs=paginateArray(modelSearch,limit,page);        

        modelsPaginated.totalPages = Math.ceil(modelsPaginated.totalDocs / modelsPaginated.perPage);

    }

    let docs = JSON.stringify(modelsPaginated.docs);    
    var models = JSON.parse(docs);
    

    reply.code(200).send({
        status: 'success',
        data: models,
        page: modelsPaginated.page,
        perPage:modelsPaginated.perPage,
        totalDocs: modelsPaginated.totalDocs,
        totalPages: modelsPaginated.totalPages,

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

function diacriticSensitiveRegex(string = '') {
    return string.replace(/a/g, '[a,á,à,ä,â]')
       .replace(/e/g, '[e,é,ë,è]')
       .replace(/i/g, '[i,í,ï,ì]')
       .replace(/o/g, '[o,ó,ö,ò]')
       .replace(/u/g, '[u,ü,ú,ù]');
}


module.exports = { modelCreate, modelShow, modelUpdate, modelDelete, modelList, modelsAvailable }