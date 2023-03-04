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
            message: 'la_direccion_ip_ya_esta_en_uso'
        })
    }    

    if(req.body.ipAddress.indexOf(' ') >= 0){
            return reply.code(400).send({
                status: 'fail',
                message: 'no_se_permiten_espacios_en_blanco_en_la_direccion_ip'
            })
    } 

    if(req.body.branchId!=null){        
        let branchValidation= isValidObjectId(req.body.branchId)
        if (branchValidation==false){
            return reply.code(400).send({
                status: 'fail',
                message: 'sucursal_no_válida'
            })
        }
        else{
            let activeBranch= await Branch.findOne({_id:req.body.branchId,isDeleted:false})
            if(!activeBranch){
                return reply.code(400).send({
                    status: 'fail',
                    message: 'sucursal_no_encontrada'
                })

            }
        }
    }  
    
    const car = new Car(req.body);    
    car._id = mongoose.Types.ObjectId();
    await car.save()

    //await saveHistory(loggedUser,"CREATED","Branch",branch)

    const carObj = await car.toObject()

    reply.code(201).send({
        status: 'success',
        data: carObj
     })      

}

const carShow = async function (req, reply){
    const car = await Car.findOne({_id:req.params.id}).select('-createdAt -updatedAt -__v');
    if (!car){
        return reply.code(400).send({
            status: 'fail',
            message: 'carrito_no_encontrado'
        })        
    } 
    
   
    let carObj = await car.toObject();        
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
        if (ipAddressValidation!=null && ipAddressValidation._id != req.params.id){
            return reply.code(400).send({
                status: 'fail',
                message: 'direccion_ip_en_uso'
            })
        }
        if(req.body.ipAddressValidation.indexOf(' ') >= 0){
            return reply.code(400).send({
                status: 'fail',
                message: 'no_se_permiten_espacios_en_blanco_en_la_dirección_ip'
            })
        }
    }

    if(req.body.branchId!=null){        
        let branchValidation= isValidObjectId(req.body.branchId)
        if (branchValidation==false){
            return reply.code(400).send({
                status: 'fail',
                message: 'sucursal_no_válida'
            })
        }
        else{
            let activeBranch= await Branch.findOne({_id:req.body.branchId,isDeleted:false})
            if(!activeBranch){
                return reply.code(400).send({
                    status: 'fail',
                    message: 'sucursal_no_encontrada'
                })

            }
        }
    }

    let currentCar = await Car.findOne({_id: req.params.id, isDeleted:false});
    if(currentCar == null){
        return reply.code(400).send({
            status: 'fail',
            message: 'sucursal_no_encontrado'
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

    updatedCar.branchId = req.body.branchId!=null ? req.body.branchId : updatedCar.branchId;
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

    let updatedCarObj = await updatedCar.toObject()    
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
            message: 'carrito_no_encontrado'
        })
    }

    let updatedCar = await Car.findOne({_id: req.params.id, isDeleted:false}).select('-__v');
    updatedCar.isDeleted=true;
    await updatedCar.save();
    reply.code(200).send({
        status: 'success',
        message: 'carrito_eliminado_correctamente'           
        
    }) 
    


    
}

const carList = async function (req, reply){
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
    let carsPaginated={};
    if(!req.query.search){        
        if(options.page!=null && options.limit!=null){
            carsPaginated = await Car.paginate(searchQuery, options);
        }
        else{
            carsPaginated.docs = await Car.find(searchQuery);
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
              }, {
                '$project': {
                  'branchId': 1,                   
                  'ipAddress': 1, 
                  'name': 1,
                  'color':1,
                  "plans":1                   
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
                      }
                  ]
                }
              }
            ]

        let carsSearch = await Cars.aggregate(aggregateQuery);
        carsPaginated.docs = carsSearch;
        carsPaginated.totalDocs = carsPaginated.docs.length

        carsPaginated.page=req.query.page ? req.query.page : 1;
        carsPaginated.perPage=req.query.perPage ? req.query.perPage :carsPaginated.totalDocs;
        let limit = req.query.perPage ? req.query.perPage : carsPaginated.totalDocs;
        let page = req.query.page ? req.query.page : 1;
        carsPaginated.docs=paginateArray(carsSearch,limit,page);
        carsPaginated.totalPages = Math.ceil(carsPaginated.totalDocs / carsPaginated.perPage);

    }

    let docs = JSON.stringify(carsPaginated.docs);
    var branches = JSON.parse(docs);

    reply.code(200).send({
        status: 'success',
        data: branches,
        page: carsPaginated.page,
        perPage:carsPaginated.perPage,
        totalDocs: carsPaginated.totalDocs,
        totalPages: carsPaginated.totalPages,

    })


    
}

const carStart = async function (req, reply){
    
}
const carStop = async function (req, reply){
    
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


module.exports = { carCreate, carShow, carUpdate, carDelete, carList, carStart, carStop}