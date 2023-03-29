const Modelo = require('../models/Modelo');
const Branch = require('../models/Branch');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");

const modelCreate = async function (req, reply){        
    
        
    const modelo = new Modelo(req.body);     
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

    
    let inputs={};
    
    inputs.name = req.body.name ? req.body.name :currentModel.name;
    inputs.colors = req.body.colors;    
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
        
            // {
            //   '$match': {
            //     'isDeleted': false,                
            //   }
            // } 
        
    ]

    if( req.params.id){
        aggregateQuery.push(            {
            '$match': {  
              'isDeleted':false,              
              'branchId':ObjectId(req.params.id)
            }
        })
    }

    aggregateQuery.push(
        {
            '$project': {
              '_id': 0,              
              'carId._id': '$_id', 
              'carId.name': '$name'                 
            }
          },{
              '$sort' :{
               'carId.name':1
              }
           }
    )

    

    let availableCars = await Car.aggregate(aggregateQuery);
    reply.code(200).send({
        status:'sucess',
        data:availableCars
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
    let carsPaginated={};
    if(!req.query.search){        
        //let sortOrder={name:1}       
    
        if(options.page!=null && options.limit!=null){
            carsPaginated.docs=[];
            let carsQuery = await Car.paginate(searchQuery, options);
            carsQuery.docs.forEach(car => {
                let newObj={
                    _id:car._id,
                    isStarted:car.isStarted,
                    ipAddress:car.ipAddress,
                    name:car.name,
                    color:car.color,
                    plans:car.plans
                }
    
                carsPaginated.docs.push(newObj)                               
            });
            carsPaginated.page=carsQuery.page;
            carsPaginated.perPage=carsQuery.limit;
            carsPaginated.totalDocs=carsQuery.totalDocs;
            carsPaginated.totalPages=carsQuery.totalPages;
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
            carsPaginated.docs=[]
            let carsQuery = await Car.find(searchQuery).sort(sortOrder).lean();
            carsQuery.forEach(car => {
    
                // car.branchName = branchInfo && branchInfo.name ? branchInfo.name : "",
                // car.branchCode = branchInfo && branchInfo.code ? branchInfo.code : "",
                // delete car.branchId;                
                carsPaginated.docs.push(car)
                

                
            });
        }
        
        
        
        

        
    }
    else{
        // branchSearch = await Car.search(req.query.search, { isDeleted: false }).collation({locale: "es", strength: 3}).select(options.select);
        // carsPaginated.totalDocs = branchSearch.length;
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
                  'isStarted':1,
                  //'branchId': 1,                   
                  'ipAddress': 1, 
                  'name': 1,
                  'color':1,
                  "plans":1,
    

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

        let carsSearch = await Car.aggregate(aggregateQuery);
        carsPaginated.docs = carsSearch;
        carsPaginated.totalDocs = carsPaginated.docs.length

        carsPaginated.page=req.query.page ? req.query.page : 1;
        carsPaginated.perPage=req.query.perPage ? req.query.perPage :carsPaginated.totalDocs;
        let limit = req.query.perPage ? req.query.perPage : carsPaginated.totalDocs;
        let page = req.query.page ? req.query.page : 1;
        carsPaginated.docs=paginateArray(carsSearch,limit,page);
        
        carsPaginated.docs.forEach(doc=>{
            if (!doc.branchId || !doc.branchId._id){
                doc.branchId ={
                    _id:null,
                    code:"",
                    name:""
                }
            }
        })
        carsPaginated.totalPages = Math.ceil(carsPaginated.totalDocs / carsPaginated.perPage);

    }

    let docs = JSON.stringify(carsPaginated.docs);    
    var cars = JSON.parse(docs);
    

    reply.code(200).send({
        status: 'success',
        data: cars,
        page: carsPaginated.page,
        perPage:carsPaginated.perPage,
        totalDocs: carsPaginated.totalDocs,
        totalPages: carsPaginated.totalPages,

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