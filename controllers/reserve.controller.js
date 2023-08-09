const Reserve = require('../models/Reserve');
const Status = require('../models/Status');
const Branch = require('../models/Branch');
const User = require('../models/User');
const Client = require('../models/Client');
const Payment = require('../models/Payment');
const Inventory = require('../models/Inventory');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
const Modelo = require('../models/Modelo');
const Car = require('../models/Car');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");
const { getOffsetSetting } = require('../controllers/base.controller');


const reserveCreate = async function (req,reply){
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

    console.log("MODEL ID: ", modelId)

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

    if(req.body.amount && !req.body.paymentType){
        return reply.code(400).send({
            status: 'fail',
            message: 'El metodo de pago es requerido si se va ingresar el primer pago.'
        })
    }

    if(req.body.paymentType){
        if(!req.body.amount){
            return reply.code(400).send({
                status: 'fail',
                message: 'El monto del pago es requerido si va  a registrar el primer pago.'
            })

        }
        
    }

    const reserve = new Reserve(req.body);     
    if(branchId){
        reserve.branchId=branchId;
    }
    if(modelId){
        reserve.modelId=modelId;
    }
    if(clientId){
        reserve.clientId=clientId;
    }
    if(employeeId){
        reserve.employeeId=employeeId;
    }
    if (color){
        reserve.color=color.toLowerCase()
    }
    reserve.price = req.body.price;
    reserve.quantity = req.body.quantity;    
    let total = req.body.price * req.body.quantity;
    reserve.totalSale = total;
    reserve.pendingBalance = total;

    reserve._id = mongoose.Types.ObjectId();


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
    let branchReserves = await Reserve.find({
        isDeleted:false, 
        branchId:branchId,
        createdAt:{"$gte": date,"$lte":nextDay}
    }) 

    let day = date.getDate();
    let month = date.getMonth() + 1
    let year = date.getFullYear();
    let dayString = day > 9 ? day : "0"+day;
    let monthString = month > 9 ? month : "0"+month;  
    let nextFolio = branchReserves.length+1
    nextFolio = nextFolio<10 ? "0000"+String(nextFolio) : nextFolio;
    nextFolio = nextFolio>=10 && nextFolio < 100? "000"+String(nextFolio) : nextFolio;
    nextFolio = nextFolio>=100 && nextFolio < 1000? "00"+String(nextFolio) : nextFolio;
    let branchCode = activeBranch.code;
    reserve.folio = "RS-"+branchCode+"-"+year+monthString+dayString+"-"+String(nextFolio) 
    let totalPaid = 0;

    let receivedPayments=[];
    if(req.body.amount && req.body.paymentType){
        let paymentInput={
            branchId:req.body.branchId,
            operationType:'reserve',
            reserveId:reserve._id,
            amount:req.body.amount,
            paidOn:new Date(),
            paymentType:req.body.paymentType.toLowerCase()
    
        }
        
        const payment = new Payment(paymentInput);
        payment._id = mongoose.Types.ObjectId();     
        await payment.save(); 
        reserve.pendingBalance -=  req.body.amount;
        const paymentObj = await payment.toObject()
        delete paymentObj.__v;
        delete paymentObj.createdAt;
        delete paymentObj.updateAt;
        totalPaid +=req.body.amount;
        receivedPayments.push(paymentObj)  
    }
    reserve.isPaid = reserve.pendingBalance <= 0 ? true: false;
    await reserve.save()
    await reserve.populate([
        {path:'branchId', select:'_id name code'},
        {path:'modelId', select:'_id name'},
        {path:'employeeId', select:'_id fullName email'},
        {path:'clientId', select:'_id fullName email phone'}
    ]); 

    await reserve.populate([
        {path:'branchId', select:'_id name code'},
        {path:'modelId', select:'_id name'},
        {path:'employeeId', select:'_id fullName email'},
        {path:'clientId', select:'_id fullName email phone'}
    ]); 

    const reserveObj = await reserve.toObject()       
    reserveObj.payments=receivedPayments;    
    if(!reserveObj.branchId || !reserveObj.branchId._id){
        reserveObj.branchId={
            _id:null,
            name:"",
            code:"",
        }
    }
    if(!reserveObj.modelId || !reserveObj.modelId._id){
        reserveObj.modelId={
            _id:null,
            name:"",            
        }
    }

    if(!reserveObj.clientId || !reserveObj.clientId._id){
        reserveObj.clientId={
            _id:null,
            fullName:"",            
            phone:"",
            email:""
        }
    }
    
    if(!reserveObj.employeeId || !reserveObj.employeeId._id){
        reserveObj.modelId={
            _id:null,
            fullName:"",                        
            email:""
        }
    }
    delete reserveObj.__v
    reserveObj.totalPaid = totalPaid;
    inventoryValidation.quantity-=req.body.quantity;
    await inventoryValidation.save();
    return reply.code(201).send({
        status: 'success',
        data: reserveObj
     }) 





}

const reserveShow = async function (req,reply){
    const reserve = await Reserve.findOne({_id:req.params.reserveId, branchId:req.params.id}).select('-createdAt -updatedAt -__v');
    if (!reserve){
        return reply.code(400).send({
            status: 'fail',
            message: 'Apartado no registrado'
        })        
    } 
    
    await reserve.populate([
        {path:'branchId', select:'_id name code'},
        {path:'modelId', select:'_id name'},
        {path:'employeeId', select:'_id fullName email'},
        {path:'clientId', select:'_id fullName email phone'}
    ]);  
    let reserveObj = await reserve.toObject();
    let payments = await Payment.find({reserveId:reserve._id,isDeleted:false})                
    let totalPaid = 0;
    payments.forEach(payment=>{
        totalPaid+=payment.amount;
    })
    reserveObj.payments=payments;
    reserveObj.totalPaid=totalPaid;
    



    
    // if (reserveObj.branchId){
    //     reserveObj.branchCode=reserveObj.branchId.code ? reserveObj.branchId.code :"";
    //     reserveObj.branchName=reserveObj.branchId.name ? reserveObj.branchId.name :"";
    //     delete reserveObj.branchId;
    // }
    if(!reserveObj.branchId || !reserveObj.branchId._id){
        reserveObj.branchId={
            _id:null,
            name:"",
            code:"",
        }
    }
    if(!reserveObj.modelId || !reserveObj.modelId._id){
        reserveObj.modelId={
            _id:null,
            name:"",            
        }
    }

    if(!reserveObj.clientId || !reserveObj.clientId._id){
        reserveObj.clientId={
            _id:null,
            fullName:"",            
            phone:"",
            email:""
        }
    }
    
    if(!reserveObj.employeeId || !reserveObj.employeeId._id){
        reserveObj.modelId={
            _id:null,
            fullName:"",                        
            email:""
        }
    }
    delete reserveObj.__v
    return reply.code(200).send({
        status: 'success',
        data: reserveObj
    })    
    
}

const reserveList = async function (req,reply){
    
}

const reserveDelete = async function (req,reply){
    
}

const reserveUpdate = async function (req,reply){
    
}


const reserveAddPayment = async function (req,reply){
    
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

module.exports = { reserveCreate, reserveDelete, reserveList, reserveShow, reserveUpdate, reserveAddPayment}