const Car = require('../models/Car');
const Branch = require('../models/Branch');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
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

    if(req.body.branchId!=null && req.body.branchId._id){        
        let branchValidation= isValidObjectId(req.body.branchId._id)
        if (branchValidation==false){
            return reply.code(400).send({
                status: 'fail',
                message: 'Sucursal no válida'
            })
        }
        else{
            let activeBranch= await Branch.findOne({_id:req.body.branchId._id,isDeleted:false})
            if(!activeBranch){
                return reply.code(400).send({
                    status: 'fail',
                    message: 'Sucursal no encontrada'
                })

            }
        }
    }  
    
    let branchId = req.body.branchId ? req.body.branchId._id:null;    

    delete req.body.branchId;
    if(branchId){
        car.branchId=branchId;
    }
    const car = new Car(req.body); 
    console.log("HERE")   
    
    car._id = mongoose.Types.ObjectId();
    await car.save()
    await car.populate('branchId', '_id name code'); 
    
    

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
    
    await car.populate('branchId', '_id name code');  
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
            code:"",
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
                message: 'direccion_ip_en_uso'
            })
        }
        if(req.body.ipAddressValidation && req.body.ipAddressValidation.indexOf(' ') >= 0){
            return reply.code(400).send({
                status: 'fail',
                message: 'No se permiten espacios en blanco en la dirección ip'
            })
        }
    }

    if(req.body.branchId!=null && req.body.branchId._id){        
        let branchValidation= isValidObjectId(req.body.branchId._id)
        if (branchValidation==false){
            return reply.code(400).send({
                status: 'fail',
                message: 'Sucursal no válida'
            })
        }
        else{
            let activeBranch= await Branch.findOne({_id:req.body.branchId._id,isDeleted:false})
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

    let updatedCar = await Car.findOne({_id: req.params.id, isDeleted:false}).select('-__v');

    // let branchNumberCheck = await Branch.findOne({branchNumber: req.body.branchNumber, isDeleted:false})

    // if(branchNumberCheck!=null && String(branchNumberCheck._id) != String(currentBranch._id)){
    //     reply.code(400).send({
    //         status: 'fail',
    //         message: 'branch_number_already_registered'
    //     })
    // }
    
    updatedCar.branchId = req.body.branchId && req.body.branchId._id? req.body.branchId._id : updatedCar.branchId;
    updatedCar.ipAddress = req.body.ipAddress!=null ? req.body.ipAddress : updatedCar.ipAddress;
    updatedCar.name = req.body.name!=null ? req.body.name : updatedCar.name;
    updatedCar.color = req.body.color!=null ? req.body.color : updatedCar.color;
    updatedCar.plans = req.body.plans!=null ? req.body.plans : updatedCar.plans;
  
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
    await updatedCar.populate('branchId', '_id name code');
    

    let updatedCarObj = await updatedCar.toObject()    
    // if (updatedCarObj.branchId){
    //     updatedCarObj.branchCode=updatedCarObj.branchId.code ? updatedCarObj.branchId.code :"";
    //     updatedCarObj.branchName=updatedCarObj.branchId.name ? updatedCarObj.branchId.name :"";
    //     delete updatedCarObj.branchId;
    // }
    if(!updatedCarObj.branchId || !updatedCarObj.branchId._id){
        updatedCarObj.branchId={
            _id:null,
            name:"",
            code:"",
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
        message: 'Carrito eliminado correctamente'           
        
    })   
    
}

const carBranchList = async function (req, reply){

}

const carsAvailable = async function (req, reply){

    let aggregateQuery=[
        [
            {
              '$match': {
                'isDeleted': false,
                'branchId':ObjectId(req.params.id)
              }
            }, {
              '$project': {
                '_id': 0, 
                'carId._id': '$_id', 
                'carId.name': '$name'                 
              }
            }
          ]
    ]

    let availableCars = await Car.aggregate(aggregateQuery);
    reply.code(200).send({
        status:'sucess',
        data:availableCars
    })
}



const carList = async function (req, reply){
    let searchQuery = {
        isDeleted: false,			
    };
    if(req.params.id){
        searchQuery['branchId']=req.params.id
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
    let carsPaginated={};
    if(!req.query.search){        
        let allBranches = await Branch.find({});
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
                let branchInfo = allBranches.find(branch=>{
                    return String(branch._id) == String(car.branchId)
                })
                newObj.branchId={
                    _id:car.branchId ? car.branchId :null,
                    name : branchInfo && branchInfo.name ? branchInfo.name : "",
                    code : branchInfo && branchInfo.code ? branchInfo.code : "",

                }
                
                delete car.branchId;
                carsPaginated.docs.push(newObj)                               
            });
            carsPaginated.page=carsQuery.page;
            carsPaginated.perPage=carsQuery.limit;
            carsPaginated.totalDocs=carsQuery.totalDocs;
            carsPaginated.totalPages=carsQuery.totalPages;
        }
        else{
            carsPaginated.docs=[]
            let carsQuery = await Car.find(searchQuery).lean();
            carsQuery.forEach(car => {
                let branchInfo = allBranches.find(branch=>{
                    return String(branch._id) == String(car.branchId)
                }) 
                let branchId={
                    _id:car.branchId ? car.branchId :null,
                    name : branchInfo && branchInfo.name ? branchInfo.name : "",
                    code : branchInfo && branchInfo.code ? branchInfo.code : "",
                }  
                car.branchId=branchId;         
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
                '$lookup': {
                  'from': 'branches', 
                  'localField': 'branchId', 
                  'foreignField': '_id', 
                  'as': 'branchInfo'
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
                      }
                  ]
                }
              }
            ]

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

function diacriticSensitiveRegex(string = '') {
    return string.replace(/a/g, '[a,á,à,ä,â]')
       .replace(/e/g, '[e,é,ë,è]')
       .replace(/i/g, '[i,í,ï,ì]')
       .replace(/o/g, '[o,ó,ö,ò]')
       .replace(/u/g, '[u,ü,ú,ù]');
}


module.exports = { carCreate, carShow, carUpdate, carDelete, carList, carStart, carStop, carBranchList, carsAvailable }