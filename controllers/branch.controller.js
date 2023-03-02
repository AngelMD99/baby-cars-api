const Branch = require('../models/Branch');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");

const branchCreate = async function (req, reply){
    //let loggedUser = await req.jwtVerify();

    let branchCode = await Branch.findOne({code: req.body.code.toUpperCase(), isDeleted:false})
    if(branchCode != null){
        return reply.code(400).send({
            status: 'fail',
            message: 'código_de_sucursal_en_uso'
        })
    }    

    if(req.body.code.indexOf(' ') >= 0){
            return reply.code(400).send({
                status: 'fail',
                message: 'no_se_permiten_espacios_en_blanco_en_el_código'
            })
    }
    
    //let theCode = req.body.branchCode.toUpperCase();        
    
    const branch = new Branch(req.body);
    let plainPassword = branch.password;
    let hash = bcrypt.hashSync(plainPassword, 12)
    branch._id = mongoose.Types.ObjectId();
    branch.password=hash;
    await branch.save()

    //await saveHistory(loggedUser,"CREATED","Branch",branch)

    const branchObj = await branch.toObject()

    reply.code(201).send({
        status: 'success',
        data: branchObj
     }) 
     

}

const branchShow = async function (req, reply){
    const branch = await Branch.findOne({_id:req.params.id}).select('-createdAt -updatedAt -__v');
    if (!branch){
        return reply.code(400).send({
            status: 'fail',
            message: 'sucursal_no_encontrada'
        })        
    } 
   
    let branchObj = await branch.toObject();        
    reply.code(200).send({
        status: 'success',
        data: branchObj
    })    
}

const branchUpdate = async function (req, reply){
    //let loggedUser = await req.jwtVerify();
    //let error;
    if(req.body.code!=null){
        let branchCodeValidation = await Branch.findOne({code:req.body.code.toUpperCase(),isDeleted:false});
        if (branchCodeValidation!=null && branchCodeValidation._id != req.params.id){
            return reply.code(400).send({
                status: 'fail',
                message: 'código_de_sucursal_en_uso'
            })
        }
        if(req.body.code.indexOf(' ') >= 0){
            return reply.code(400).send({
                status: 'fail',
                message: 'no_se_permiten_espacios_en_blanco_en_el_código'
            })
        }
    }


    let currentBranch = await Branch.findOne({_id: req.params.id, isDeleted:false});
    if(currentBranch == null){
        return reply.code(400).send({
            status: 'fail',
            message: 'sucursal_no_encontrada'
        })
    }

    let updatedBranch = await Branch.findOne({_id: req.params.id, isDeleted:false}).select('-__v');

    // let branchNumberCheck = await Branch.findOne({branchNumber: req.body.branchNumber, isDeleted:false})

    // if(branchNumberCheck!=null && String(branchNumberCheck._id) != String(currentBranch._id)){
    //     reply.code(400).send({
    //         status: 'fail',
    //         message: 'branch_number_already_registered'
    //     })
    // }

    updatedBranch.code = req.body.code!=null ? req.body.code : updatedBranch.code;
    updatedBranch.name = req.body.name!=null ? req.body.name : updatedBranch.name;
    updatedBranch.location = req.body.location!=null ? req.body.location : updatedBranch.location;
    if (req.body.password!=null && req.body.password!=""){
        let plainPassword = req.body.password
        let hash=bcrypt.hashSync(plainPassword, 12)
        updatedBranch.password=hash;
    }
    //updatedBranch.categoryId = req.body.categoryId ? req.body.categoryId : updatedBranch.categoryId;
    //updatedBranch.productCode = req.body.productCode!=null ? req.body.productCode : updatedBranch.name;
    //updatedBranch.name = req.body.name ? req.body.name : updatedBranch.name;
    //updatedBranch.shortName = req.body.shortName ? req.body.shortName : updatedBranch.shortName;
    //updatedBranch.price = req.body.price!= null ? req.body.price : updatedBranch.price;
    //updatedBranch.description = req.body.description ? req.body.description : updatedBranch.description;
    //updatedBranch.options = req.body.options ? req.body.options : updatedBranch.options;
    //updatedBranch.freeOptions = req.body.freeOptions!=null ? req.body.freeOptions : updatedBranch.freeOptions;
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

    // if(req.body.isEnabled!=null && req.body.isEnabled != currentProduct.isEnabled){
    //         let productActive = req.body.isEnabled;
    //         action = productActive == true ? "ENABLED" : "DISABLED"
    // }
    await updatedBranch.save();

    let updatedBranchObj = await updatedBranch.toObject()
    delete updatedBranchObj.password
    delete updatedBranchObj.__v
   
    reply.code(200).send({
        status: 'success',
        data: updatedBranchObj           
        
    }) 
    
}

const branchDelete = async function (req, reply){
    //let loggedUser = await req.jwtVerify();
    let currentBranch = await Branch.findOne({_id: req.params.id, isDeleted:false});
    if(currentBranch == null){
        return reply.code(400).send({
            status: 'fail',
            message: 'sucursal_no_encontrada'
        })
    }

    let updatedBranch = await Branch.findOne({_id: req.params.id, isDeleted:false}).select('-__v');
    updatedBranch.isDeleted=true;
    await updatedBranch.save();
    reply.code(200).send({
        status: 'success',
        message: 'sucursal_eliminada'           
        
    }) 
    
}

const branchList = async function (req, reply){
    
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
    let branchesPaginated={};
    if(!req.query.search){        
        if(options.page!=null && options.limit!=null){
            branchesPaginated = await Branch.paginate(searchQuery, options);
        }
        else{
            branchesPaginated.docs = await Branch.find(searchQuery);
        }       

        
    }
    else{
        // branchSearch = await Branch.search(req.query.search, { isDeleted: false }).collation({locale: "es", strength: 3}).select(options.select);
        // branchesPaginated.totalDocs = branchSearch.length;
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
                  'code': 1,                   
                  'name': 1, 
                  'location': 1,                   
                }
              }, {
                '$match': {
                  '$or': [
                    {
                      'code': {
                        '$regex': searchString, 
                        '$options': 'i'
                      }
                    }, {
                      'name': {
                        '$regex': searchString, 
                        '$options': 'i'
                      }
                    }
                  ]
                }
              }
            ]

        let branchesSearch = await Branch.aggregate(aggregateQuery);
        branchesPaginated.docs = branchesSearch;
        branchesPaginated.totalDocs = branchesPaginated.docs.length

        branchesPaginated.page=req.query.page ? req.query.page : 1;
        branchesPaginated.perPage=req.query.perPage ? req.query.perPage :branchesPaginated.totalDocs;
        let limit = req.query.perPage ? req.query.perPage : branchesPaginated.totalDocs;
        let page = req.query.page ? req.query.page : 1;
        branchesPaginated.docs=paginateArray(branchesSearch,limit,page);
        branchesPaginated.totalPages = Math.ceil(branchesPaginated.totalDocs / branchesPaginated.perPage);

    }

    let docs = JSON.stringify(branchesPaginated.docs);
    var branches = JSON.parse(docs);

    reply.code(200).send({
        status: 'success',
        data: branches,
        page: branchesPaginated.page,
        perPage:branchesPaginated.perPage,
        totalDocs: branchesPaginated.totalDocs,
        totalPages: branchesPaginated.totalPages,

    })
    
    
}

// const branchLogin = async function (req, reply){
    
// }
function paginateArray(array, limit, page) {
    return array.slice((page - 1) * limit, page * limit);
}

function diacriticSensitiveRegex(string = '') {
    return string.replace(/a/g, '[a,á,à,ä,â]')
       .replace(/e/g, '[e,é,ë,è]')
       .replace(/i/g, '[i,í,ï,ì]')
       .replace(/o/g, '[o,ó,ö,ò]')
       .replace(/u/g, '[u,ü,ú,ù]');
}


module.exports = { branchCreate, branchShow, branchUpdate, branchDelete, branchList }
//module.exports = { branchList, branchData, branchIn, branchSchedules, branchOrders, branchChangeOrderStatus, branchDiscardOrder, branchProducts, branchOptions, getbranchProducts, branchProductsStatus, branchProductsOptions }