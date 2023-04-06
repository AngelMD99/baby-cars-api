const Car = require('../models/Car');
const Branch = require('../models/Branch');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
const Modelo = require('../models/Modelo');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");

const carCreate = async function (req, reply){
        
    //let theCode = req.body.branchCode.toUpperCase();  
    let ipValidation = await Car.findOne({ipAddress: req.body.ipAddress.toUpperCase(), isDeleted:false})
    if(ipValidation != null){
        return reply.code(400).send({
            status: 'fail',
            message: 'La dirección IP ya esta en uso'
        })
    }    

    if(req.body.ipAddress.indexOf(' ') >= 0){
            return reply.code(400).send({
                status: 'fail',
                message: 'No se permiten espacios en blanco en la direccion IP'
            })
    } 

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

    if(req.body.modelId!=null && req.body.modelId!=""){        
        let modelValidation= isValidObjectId(req.body.modelId)
        if (modelValidation==false){
            return reply.code(400).send({
                status: 'fail',
                message: 'Modelo no valido'
            })
        }
        else{
            let activeModel= await Modelo.findOne({_id:req.body.modelId,isDeleted:false})
            if(!activeModel){
                return reply.code(400).send({
                    status: 'fail',
                    message: 'Modelo no encontrado'
                })

            }
        }
    }
    
    let branchId = req.body.branchId;    
    let modelId = req.body.modelId;    

    delete req.body.branchId;    
    const car = new Car(req.body);     
    if(branchId){
        car.branchId=branchId;
    }
    if(modelId){
        car.modelId=modelId;
    }
    
    car._id = mongoose.Types.ObjectId();
    await car.save()
    await car.populate([
        {path:'branchId', select:'_id name code'},
        {path:'modelId', select:'_id name'}
    ]); 
    
    

    //await saveHistory(loggedUser,"CREATED","Branch",branch)

    const carObj = await car.toObject()
    // if (carObj.branchId){
    //     carObj.branchCode=carObj.branchId.code ? carObj.branchId.code :"";
    //     carObj.branchName=carObj.branchId.name ? carObj.branchId.name :"";
    //     delete carObj.branchId;
    // }
    if(!carObj.branchId || !carObj.branchId._id){
        carObj.branchId={
            _id:null,
            name:"",
            code:"",
        }
    }
    if(!carObj.modelId || !carObj.modelId._id){
        carObj.modelId={
            _id:null,
            name:"",            
        }
    }
    delete carObj.__v

    reply.code(201).send({
        status: 'success',
        data: carObj
     })      

}

const carShow = async function (req, reply){
    const car = await Car.findOne({_id:req.params.id}).select('-createdAt -updatedAt -__v').populate('branchId', '_id name code');
    if (!car){
        return reply.code(400).send({
            status: 'fail',
            message: 'Carrito no registrado'
        })        
    } 
    
    await car.populate([
        {path:'branchId', select:'_id name code'},
        {path:'modelId', select:'_id name'}
    ]);  
    let carObj = await car.toObject();            
    
    // if (carObj.branchId){
    //     carObj.branchCode=carObj.branchId.code ? carObj.branchId.code :"";
    //     carObj.branchName=carObj.branchId.name ? carObj.branchId.name :"";
    //     delete carObj.branchId;
    // }
    if(!carObj.branchId || !carObj.branchId._id){
        carObj.branchId={
            _id:null,
            name:"",            
        }
    }
    if(!carObj.modelId || !carObj.modelId._id){
        carObj.modelId={
            _id:null,
            name:""            
        }
    }
    reply.code(200).send({
        status: 'success',
        data: carObj
    })    
    
}

const carUpdate = async function (req, reply){    
        //let loggedUser = await req.jwtVerify();
    //let error;
    if(req.body.ipAddress!=null){
        let ipAddressValidation = await Car.findOne({ipAddress:req.body.ipAddress,isDeleted:false});
        if (ipAddressValidation && ipAddressValidation._id != req.params.id){
            return reply.code(400).send({
                status: 'fail',
                message: 'La dirección IP ya esta en uso'
            })
        }
        if(req.body.ipAddressValidation && req.body.ipAddressValidation.indexOf(' ') >= 0){
            return reply.code(400).send({
                status: 'fail',
                message: 'No se permiten espacios en blanco en la dirección ip'
            })
        }
    }

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

    let currentCar = await Car.findOne({_id: req.params.id, isDeleted:false});
    if(currentCar == null){
        return reply.code(400).send({
            status: 'fail',
            message: 'Carrito no registrado'
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
    if(req.body.branchId && req.body.ipAddress!=""){
        inputs.branchId = req.body.branchId;
    }
    if(req.body.ipAddress && req.body.ipAddress!=""){
        inputs.ipAddress = req.body.ipAddress;
    } 
    if(req.body.modelId && req.body.model!=""){
        inputs.modelId = req.body.modelId;
    }    
    inputs.name = req.body.name;
    inputs.color = req.body.color;    
    let updatedCar = await Car.findByIdAndUpdate({_id: req.params.id},inputs,{
        new:true,
        overwrite:true
    }).select('-__v');
    // updatedCar.branchId = req.body.branchId && req.body.branchId._id? req.body.branchId._id : updatedCar.branchId;
    // updatedCar.ipAddress = req.body.ipAddress!=null ? req.body.ipAddress : updatedCar.ipAddress;
    // updatedCar.name = req.body.name!=null ? req.body.name : updatedCar.name;
    // updatedCar.color = req.body.color!=null ? req.body.color : updatedCar.color;
    
  
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

    await updatedCar.save();
    await updatedCar.populate([
        {path:'branchId', select:'_id name code'},
        {path:'modelId', select:'_id name'}
    ]);  
    let updatedCarObj = await updatedCar.toObject();            
    
    // if (updatedCarObj.branchId){
    //     updatedCarObj.branchCode=updatedCarObj.branchId.code ? updatedCarObj.branchId.code :"";
    //     updatedCarObj.branchName=updatedCarObj.branchId.name ? updatedCarObj.branchId.name :"";
    //     delete updatedCarObj.branchId;
    // }
    if(!updatedCarObj.branchId || !updatedCarObj.branchId._id){
        updatedCarObj.branchId={
            _id:null,
            name:"",            
        }
    }
    if(!updatedCarObj.modelId || !updatedCarObj.modelId._id){
        updatedCarObj.modelId={
            _id:null,
            name:""            
        }
    }
    


    delete updatedCarObj.__v
   
    reply.code(200).send({
        status: 'success',
        data: updatedCarObj           
        
    }) 

    
}

const carDelete = async function (req, reply){
    let currentCar = await Car.findOne({_id: req.params.id, isDeleted:false});
    if(currentCar == null){
        return reply.code(400).send({
            status: 'fail',
            message: 'Carrito no registrado'
        })
    }

    let updatedCar = await Car.findOne({_id: req.params.id, isDeleted:false}).select('-__v');
    updatedCar.isDeleted=true;
    await updatedCar.save();
    reply.code(200).send({
        status: 'success',
        message: 'Carrito '+updatedCar.name+'eliminado correctamente'           
        
    })   
    
}

const carBranchAutoOff = async function (req, reply){
    let branchCars= await Car.find({branchId:req.params.id,isDeleted:false})
    let turnedOffCars=0;
    for (let car of branchCars){

        if(car.expireDate ){
            let currenDate = new Date();
            let remainingTime = minutesDiff(currenDate,car.expireDate)            
            if(remainingTime<=0){
                //send request to shelly rele
                car.expireDate=undefined;
                car.startDate=undefined;
                car.rentalTime=undefined;                   
                car.isStarted = false;
                turnedOffCars+=1;
                await car.save()
            }

        }
    }

    reply.code(200).send({
        status: 'success',
        data: {
            turnedOffCars:turnedOffCars
        }
        
    })   
    


}

const carsAvailable = async function (req, reply){


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
              'isStarted' :false,
              'branchId':ObjectId(req.params.id)
            }
        })
    }

    aggregateQuery.push(
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
              '_id': 0,              
              'carId._id': '$_id', 
              'carId.name': '$name',
              'carId.color':'$color',
              'modelId._id': {
                '$first': '$modelInfo._id'
              },
              'modelId.name': {
                '$first': '$modelInfo.name'
              } 
              
              
            }
          },{
              '$sort' :{
               'carId.name':1
              }
           }
    )

    
           
    let availableCars = await Car.aggregate(aggregateQuery);    
    availableCars.forEach(car=>{
        if(!car.modelId || !car.modelId._id ){
            car.modelId={
                _id:"",
                name:"",

            }

        }
    })
    aggregateQuery.push( {
        '$group': {
        '_id': '$modelId._id', 
        'name': {
            '$first': '$modelId.name'
            }, 
        'count': {
            '$sum': 1
            }
        }
    })

    let availableModels = await Car.aggregate(aggregateQuery)
    let availableModelsObjects=availableModels.filter(item=>{
        return item._id!=null
    });
     
    reply.code(200).send({
        status:'sucess',
        data:availableCars,
        models:availableModelsObjects,
    })
}



const carList = async function (req, reply){
    let searchQuery = {
        isDeleted: false,			
    };
    if(req.params.id && !req.query.branchId){
        searchQuery['branchId']=req.params.id
    }

    if(!req.params.id && req.query.branchId){
        searchQuery['branchId']=req.query.branchId
    }

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
        let allBranches = await Branch.find({});
        let allModels = await Modelo.find({});
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
                }
                let branchInfo = allBranches.find(branch=>{
                    return String(branch._id) == String(car.branchId)
                })
                newObj.branchId={
                    _id:car.branchId ? car.branchId :null,
                    name : branchInfo && branchInfo.name ? branchInfo.name : "",
                    code : branchInfo && branchInfo.code ? branchInfo.code : "",

                }
                let modelInfo = allModels.find(modelo=>{
                    return String(modelo._id) == String(car.modelId)
                })
                newObj.modelId={
                    _id:car.modelId ? car.modelId :null,
                    name : modelInfo && modelInfo.name ? modelInfo.name : "",
                    code : modelInfo && modelInfo.code ? modelInfo.code : "",

                }
                
                delete car.branchId;
                delete car.modelId;                
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
                let branchInfo = allBranches.find(branch=>{
                    return String(branch._id) == String(car.branchId)
                }) 
                let branchId={
                    _id:car.branchId ? car.branchId :null,
                    name : branchInfo && branchInfo.name ? branchInfo.name : "",
                    code : branchInfo && branchInfo.code ? branchInfo.code : "",
                } 
                let modelInfo = allModels.find(modelo=>{
                    return String(modelo._id) == String(car.modelId)
                }) 
                let modelId={
                    _id:car.modelId ? car.modelId :null,
                    name : modelInfo && modelInfo.name ? modelInfo.name : "",                    
                }  
                car.branchId=branchId;         
                car.modelId=modelId;         
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
                '$lookup': {
                    'from': 'modelos', 
                    'localField': 'modelId', 
                    'foreignField': '_id', 
                    'as': 'modelInfo'
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
                  } 


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
            if (!doc.modelId || !doc.modelId._id){
                doc.modelId ={
                    _id:null,
                    code:"",
                    name:""
                }
            }
        })
        carsPaginated.totalPages = Math.ceil(carsPaginated.totalDocs / carsPaginated.perPage);

    }
    carsPaginated.docs.forEach(doc=>{
        if(doc.isStarted== true && doc.expireDate){
            let currentDate = new Date ()
            let remainingTime = minutesDiff (currentDate,doc.expireDate);
            doc.remainingTime=remainingTime

        }
        

    })
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

const carStart = async function (req, reply){
    let currentCar = await Car.findOne({_id: req.params.id, isDeleted:false});
    if(currentCar == null){
        return reply.code(400).send({
            status: 'fail',
            message: 'Carrito no registrado'
        })
    }

    let updatedCar = await Car.findOne({_id: req.params.id, isDeleted:false}).select('-__v');
    updatedCar.isStarted=true;
    await updatedCar.save();
    reply.code(200).send({
        status: 'success',
        message: 'Carrito '+updatedCar.name+' encendido correctamente'           
        
    })  
    
}
const carStop = async function (req, reply){
    let currentCar = await Car.findOne({_id: req.params.id, isDeleted:false});
    if(currentCar == null){
        return reply.code(400).send({
            status: 'fail',
            message: 'Carrito no registrado'
        })
    }    

    let updatedCar = await Car.findOne({_id: req.params.id, isDeleted:false}).select('-__v');
    updatedCar.isStarted=false;
    updatedCar.expireDate=undefined;
    updatedCar.startDate=undefined;
    updatedCar.rentalTime=undefined;    
    await updatedCar.save();
    reply.code(200).send({
        status: 'success',
        message: 'Carrito '+updatedCar.name+' apagado correctamente'           
        
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


module.exports = { carCreate, carShow, carUpdate, carDelete, carList, carStart, carStop, carBranchAutoOff, carsAvailable }