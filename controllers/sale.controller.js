const Sale = require('../models/Sale');
const Branch = require('../models/Branch');
const Client = require('../models/Client');
const Modelo = require('../models/Modelo');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Inventory = require('../models/Inventory');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");
const { getOffsetSetting } = require('../controllers/base.controller');
const { findOneAndDelete } = require('../models/Branch');
const { inventoryCreate } = require('./inventory.controller');

const saleCreate = async function (req, reply){  
    if(!req.body.branchId){
        return reply.code(400).send({
            status: 'fail',
            message: 'La sucursal es requerida'
        })
    }

    if(!req.body.clientId){
        return reply.code(400).send({
            status: 'fail',
            message: 'El cliente es requerido'
        })
    }

    if(!req.body.price){
        return reply.code(400).send({
            status: 'fail',
            message: 'El costo es requerido'
        })
    }

    if(!req.body.quantity){
        return reply.code(400).send({
            status: 'fail',
            message: 'La cantidad es requerida'
        })
    }

    if(!req.body.paymentType){
        return reply.code(400).send({
            status: 'fail',
            message: 'El tipo de pago es requerido'
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
            var activeBranch= await Branch.findOne({_id:req.body.branchId,isDeleted:false})
            if(!activeBranch){
                return reply.code(400).send({
                    status: 'fail',
                    message: 'Sucursal no encontrada'
                })

            }
        }
    }  

    if(req.body.clientId!=null && req.body.clientId!=""){        
        let clientValidation= isValidObjectId(req.body.clientId)
        if (clientValidation==false){
            return reply.code(400).send({
                status: 'fail',
                message: 'Cliente no válido'
            })
        }
        else{
            let activeClient= await Client.findOne({_id:req.body.clientId,isDeleted:false})
            if(!activeClient){
                return reply.code(400).send({
                    status: 'fail',
                    message: 'Cliente no encontrado'
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

    if(req.body.employeeId!=null && req.body.employeeId!=""){        
        let userValidation= isValidObjectId(req.body.employeeId)
        if (userValidation==false){
            return reply.code(400).send({
                status: 'fail',
                message: 'Usuario no válido'
            })
        }
        else{
            let activeUser= await User.findOne({_id:req.body.employeeId,isDeleted:false})
            if(!activeUser){
                return reply.code(400).send({
                    status: 'fail',
                    message: 'Usuario no encontrado'
                })

            }
        }
    }  
    
    let branchId = req.body.branchId;    
    let modelId = req.body.modelId;  
    let clientId = req.body.clientId;    
    let employeeId= req.body.employeeId;    
    let color = req.body.color  

    delete req.body.branchId;  
    
    let inventoryValidation = await Inventory.findOne({
        modelId:req.body.modelId,
        isDeleted:false,
        color:req.body.color.toLowerCase()
    })   

    if(!inventoryValidation){
        return reply.code(400).send({
            status: 'fail',
            message: 'No existe inventario para el modelo y color seleccionado'
        })
    }

    if (inventoryValidation.quantity<req.body.quantity){
        return reply.code(400).send({
            status: 'fail',
            message: 'No hay existencias suficientes para completar la cantidad indicada.'
        })
    }



    const sale = new Sale(req.body);     
    if(branchId){
        sale.branchId=branchId;
    }
    if(modelId){
        sale.modelId=modelId;
    }
    if(clientId){
        sale.clientId=clientId;
    }
    if(employeeId){
        sale.employeeId=employeeId;
    }
    if (color){
        sale.color=color.toLowerCase()
    }
    sale.price = req.body.price;
    sale.quantity = req.body.quantity;
    sale.isPaid = true;
    let total = req.body.price * req.body.quantity;
    sale.totalSale = total;
    sale._id = mongoose.Types.ObjectId();

    let offset = await getOffsetSetting();              
    let date = new Date ();    
    if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
         date.setHours(date.getHours() - offset);
         date.setHours(offset,0,0,0);    
         // date.setHours(offset, 0, 0, 0);
    }
    else{
         date.setHours(0,0,0,0);
         date.setHours(0, 0, 0, 0);
    }
    let nextDay = addDays(date,1)
    let branchSales = await Sale.find({
        isDeleted:false, 
        branchId:branchId,
        createdAt:{"$gte": date,"$lte":nextDay}
    }) 

    let day = date.getDate();
    let month = date.getMonth() + 1
    let year = date.getFullYear();
    let dayString = day > 9 ? day : "0"+day;
    let monthString = month > 9 ? month : "0"+month;  
    let nextFolio = branchSales.length+1
    nextFolio = nextFolio<10 ? "0000"+String(nextFolio) : nextFolio;
    nextFolio = nextFolio>=10 && nextFolio < 100? "000"+String(nextFolio) : nextFolio;
    nextFolio = nextFolio>=100 && nextFolio < 1000? "00"+String(nextFolio) : nextFolio;
    let branchCode = activeBranch.code;
    sale.folio = "VT-"+branchCode+"-"+year+monthString+dayString+"-"+String(nextFolio) 

    await sale.save()
    await sale.populate([
        {path:'branchId', select:'_id name code'},
        {path:'modelId', select:'_id name'},
        {path:'employeeId', select:'_id fullName email'},
        {path:'clientId', select:'_id fullName email phone'}
    ]); 
   
    let paymentInput={
        branchId:req.body.branchId,
        operationType:'single',
        saleId:sale._id,
        amount:total,
        paidOn:new Date(),
        paymentType:req.body.paymentType.toLowerCase()

    }
    
    const payment = new Payment(paymentInput);
    payment._id = mongoose.Types.ObjectId();     
    await payment.save();    

    //await saveHistory(loggedUser,"CREATED","Branch",branch)

    const saleObj = await sale.toObject()
    const paymentObj = await payment.toObject()
    // if (saleObj.branchId){
    //     saleObj.branchCode=saleObj.branchId.code ? saleObj.branchId.code :"";
    //     saleObj.branchName=saleObj.branchId.name ? saleObj.branchId.name :"";
    //     delete saleObj.branchId;
    // }
    saleObj.payments=[];
    delete paymentObj.__v;
    delete paymentObj.createdAt;
    delete paymentObj.updateAt;
    if(!saleObj.branchId || !saleObj.branchId._id){
        saleObj.branchId={
            _id:null,
            name:"",
            code:"",
        }
    }
    if(!saleObj.modelId || !saleObj.modelId._id){
        saleObj.modelId={
            _id:null,
            name:"",            
        }
    }

    if(!saleObj.clientId || !saleObj.clientId._id){
        saleObj.clientId={
            _id:null,
            fullName:"",            
            phone:"",
            email:""
        }
    }
    
    if(!saleObj.employeeId || !saleObj.employeeId._id){
        saleObj.modelId={
            _id:null,
            fullName:"",                        
            email:""
        }
    }
    delete saleObj.__v
    saleObj.payments.push(paymentObj)
    inventoryValidation.quantity-=req.body.quantity;
    await inventoryValidation.save();

    return reply.code(201).send({
        status: 'success',
        data: saleObj
     }) 

}

const saleShow = async function (req, reply){

}

const saleList = async function (req, reply){

}

const saleDelete = async function (req, reply){

}

const saleUpdate = async function (req, reply){

}

const addPayment = async function (req, reply){

}


function addMinutes(date, minutes) {    
    date.setMinutes(date.getMinutes() + minutes);  
 
    return date;
}

function addDays(date, days) {
    var newDate = new Date(date.valueOf());
    newDate.setDate(newDate.getDate() + days);
    return newDate;
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


module.exports = { saleCreate, saleDelete, saleList, saleShow, saleUpdate, addPayment}


