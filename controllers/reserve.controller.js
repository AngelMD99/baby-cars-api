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
var _ = require('lodash');
const { getOffsetSetting } = require('../controllers/base.controller');


const reserveCreate = async function (req,reply){
    if(!req.body.branchId){
        return reply.code(400).send({
            status: 'fail',
            message: 'La sucursal es requerida'
        })
    }

    if(!req.body.paymentType){
        return reply.code(400).send({
            status: 'fail',
            message: 'El tipo de pago es requerido'
        })
    }

    if(!req.body.amount || req.body.amount==""|| Number(req.body.amount)==NaN || Number(req.body.amount)<=0 ){        
        return reply.code(400).send({
            status: 'fail',
            message: 'El monto del enganche es requerido'
        })
    }


    if(!req.body.expirationDate || req.body.expirationDate ==""){
        return reply.code(400).send({
            status: 'fail',
            message: 'La fecha de expiración es requerida'
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

    if(!req.body.products){
        return reply.code(400).send({
            status: 'fail',
            message: 'Es necesario indicar los productos de la venta.'
        })        
    }

    if(!req.body.client){
        return reply.code(400).send({
            status: 'fail',
            message: 'La información del cliente es necesaria'
        })

    }

    if(!req.body.client  && (!req.body.client.fullName || !req.body.client.fullName=="")){                
            return reply.code(400).send({
                status: 'fail',
                message: 'El nombre del cliente es necesario'
            })
    }
     
    if(!req.body.client  && (!req.body.client.phone || !req.body.client.phone=="")){                
        return reply.code(400).send({
            status: 'fail',
            message: 'El telefono del cliente es necesario'
        })
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
    
    this.newReserve={};
    this.newPayment={};

    let db = await mongoose.startSession()
    .then(async session => {
        await session.withTransaction(async () => {
        let products = req.body.products;
        //let products = req.body('products');
        let inputs={};        
        inputs.branchId = req.body.branchId;    
        inputs.client = req.body.client;    
        inputs.employeeId= req.body.employeeId; 
        inputs.expirationDate=req.body.expirationDate;                
        //let inputs = request.only(['clientId', 'branchId', 'hasIva', 'ivaType', 'type', 'deliveryDate', 'deliveryLocation', 'validity', 'comments', 'discount', 'percentageDiscount']);
        inputs.totalSale = 0;        
        inputs.totalSale = _.sumBy(products, (product) => {
            return Number(((product.price *100)*(product.quantity*100) /10000).toFixed(2))
        });


        for (const product of products) {

            if(product.modelId!=null && product.modelId!=""){        
                let modelValidation= isValidObjectId(product.modelId)
                if (modelValidation==false){
                    // return reply.code(400).send({
                    //     status: 'fail',
                    //     message: 'Modelo no valido'
                    // })
                    throw {message: "Modelo no valido"}

                }
                else{
                    let activeModel= await Modelo.findOne({_id:product.modelId,isDeleted:false})
                    if(!activeModel){
                        // return reply.code(400).send({
                        //     status: 'fail',
                        //     message: 'Modelo no encontrado'
                        // })        
                        throw {message: "Modelo no encontrado"}
                    }
                    
                }
            }

            if(!product.color || product.color==""){
                // return reply.code(400).send({
                //     status: 'fail',
                //     message: 'La cantidad es requerida'
                // })
                throw {message: "El color es requerido"}
            }

            if(!product.quantity || product.quantity=="" || Number(product.quantity)==NaN || Number(product.quantity)<=0){
                // return reply.code(400).send({
                //     status: 'fail',
                //     message: 'Cantidad requerida, debe ser mayor a 0'
                // })
                throw {message: "Cantidad requerida en producto "+product.modelName+" de color "+product.color+" debe ser mayor a 0"}
            }

            if(!product.price || product.price=="" || Number(product.price)==NaN || Number(product.price)<=0){
                // return reply.code(400).send({
                //     status: 'fail',
                //     message: 'Cantidad requerida, debe ser mayor a 0'
                // })
                throw {message: "Precio requerido en producto "+product.modelName+" de color "+product.color+" debe ser mayor a 0"}

            }
            
            if(product.modelId || product.color){
                let dbInventory = await Inventory.findOne({ modelId: product.modelId, color:product.color.toLowerCase(), isDeleted:false});                                

                    if(!dbInventory){
                        throw {message: "No hay inventario para modelo "+product.modelName+ " en color "+product.color}
                    }

                    if(dbInventory.quantity<product.quantity){
                        throw {message: "No hay existencia suficiente para  modelo "+product.modelName+ " en color "+product.color}
                    }                                     
                                   
                    

                    //dbInventory = await dbInventory.save({session: session});
                    dbInventory.quantity -= product.quantity;
                    await dbInventory.save({session: session});
                //}
                // if(validation.fails()){
                //     throw {
                //         status: "fail",
                //         message: validation.messages()[0].message
                //     }
                // }
            }
            
        }

        const reserve = new Reserve(inputs);     
        reserve.products = products;
        reserve.isPaid = false;
        //sale.totalSale = total;
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
            branchId:req.body.branchId,
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
        reserve.folio = "AP-"+branchCode+"-"+year+monthString+dayString+"-"+String(nextFolio) 

        await reserve.save()

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
        this.newPayment = payment;
        this.newReserve = reserve;
        return           
    });              


    }).catch((err) => {
        this.newReserve = err;
    });


    if(this.newReserve == null || this.newReserve.message){
        console.error(this.newReserve);
        return reply.code(400).send({
            status:"fail",
            message:this.newReserve && this.newReserve.message? this.newReserve.message : "Error en las transacciones en la base de datos"
        });
    }


   // let branchId = req.body.branchId;    
    //let modelId = req.body.modelId;  
    //let clientId = req.body.clientId;    
    //let employeeId= req.body.employeeId;    
    //let color = req.body.color  

    // let inventoryValidation = await Inventory.findOne({
    //     modelId:req.body.modelId,
    //     isDeleted:false,
    //     color:req.body.color.toLowerCase()
    // })   

    // if(!inventoryValidation){
    //     return reply.code(400).send({
    //         status: 'fail',
    //         message: 'No existe inventario para el modelo y color seleccionado'
    //     })
    // }

    // if (inventoryValidation.quantity<req.body.quantity){
    //     return reply.code(400).send({
    //         status: 'fail',
    //         message: 'No hay existencias suficientes para completar la cantidad indicada.'
    //     })
    // }

    // if(req.body.amount && !req.body.paymentType){
    //     return reply.code(400).send({
    //         status: 'fail',
    //         message: 'El metodo de pago es requerido si se va ingresar el primer pago.'
    //     })
    // }

    // if(req.body.paymentType){
    //     if(!req.body.amount){
    //         return reply.code(400).send({
    //             status: 'fail',
    //             message: 'El monto del pago es requerido si va  a registrar el primer pago.'
    //         })

    //     }
        
    // }

    // const reserve = new Reserve(req.body);     
    // if(branchId){
    //     reserve.branchId=branchId;
    // }
    // if(modelId){
    //     reserve.modelId=modelId;
    // }
    // if(clientId){
    //     reserve.clientId=clientId;
    // }
    // if(employeeId){
    //     reserve.employeeId=employeeId;
    // }
    // if (color){
    //     reserve.color=color.toLowerCase()
    // }
    // reserve.price = req.body.price;
    // reserve.quantity = req.body.quantity;    
    // let total = req.body.price * req.body.quantity;
    // reserve.totalSale = total;
    // reserve.pendingBalance = total;

    // reserve._id = mongoose.Types.ObjectId();


    // let offset = await getOffsetSetting();              
    // let date = new Date ();    
    // if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
    //      date.setHours(date.getHours() - offset);
    //      date.setHours(offset,0,0,0);    
    //      // date.setHours(offset, 0, 0, 0);
    // }
    // else{
    //      date.setHours(0,0,0,0);
    //      date.setHours(0, 0, 0, 0);
    // }
    // let nextDay = addDays(date,1)
    // let branchReserves = await Reserve.find({
    //     isDeleted:false, 
    //     branchId:branchId,
    //     createdAt:{"$gte": date,"$lte":nextDay}
    // }) 

    // let day = date.getDate();
    // let month = date.getMonth() + 1
    // let year = date.getFullYear();
    // let dayString = day > 9 ? day : "0"+day;
    // let monthString = month > 9 ? month : "0"+month;  
    // let nextFolio = branchReserves.length+1
    // nextFolio = nextFolio<10 ? "0000"+String(nextFolio) : nextFolio;
    // nextFolio = nextFolio>=10 && nextFolio < 100? "000"+String(nextFolio) : nextFolio;
    // nextFolio = nextFolio>=100 && nextFolio < 1000? "00"+String(nextFolio) : nextFolio;
    // let branchCode = activeBranch.code;
    // reserve.folio = "RS-"+branchCode+"-"+year+monthString+dayString+"-"+String(nextFolio) 
    // let totalPaid = 0;

    // let receivedPayments=[];
    // if(req.body.amount && req.body.paymentType){
    //     let paymentInput={
    //         branchId:req.body.branchId,
    //         operationType:'reserve',
    //         reserveId:reserve._id,
    //         amount:req.body.amount,
    //         paidOn:new Date(),
    //         paymentType:req.body.paymentType.toLowerCase()
    
    //     }
        
    //     const payment = new Payment(paymentInput);
    //     payment._id = mongoose.Types.ObjectId();     
    //     await payment.save(); 
    //     reserve.pendingBalance -=  req.body.amount;
    //     const paymentObj = await payment.toObject()
    //     delete paymentObj.__v;
    //     delete paymentObj.createdAt;
    //     delete paymentObj.updateAt;
    //     totalPaid +=req.body.amount;
    //     receivedPayments.push(paymentObj)  
    // }
    // reserve.isPaid = reserve.pendingBalance <= 0 ? true: false;
    // await reserve.save()
    await this.newReserve.populate([
        {path:'branchId', select:'_id name code'},
        //{path:'modelId', select:'_id name'},
        {path:'employeeId', select:'_id fullName email'},
        //{path:'clientId', select:'_id fullName email phone'}
    ]); 

    const reserveObj = await this.newReserve.toObject()       
    reserveObj.payments=[];    
    reserveObj.payments.push(this.newPayment);    
    if(!reserveObj.branchId || !reserveObj.branchId._id){
        reserveObj.branchId={
            _id:null,
            name:"",
            code:"",
        }
    }
    // if(!reserveObj.modelId || !reserveObj.modelId._id){
    //     reserveObj.modelId={
    //         _id:null,
    //         name:"",            
    //     }
    // }

    // if(!reserveObj.clientId || !reserveObj.clientId._id){
    //     reserveObj.clientId={
    //         _id:null,
    //         fullName:"",            
    //         phone:"",
    //         email:""
    //     }
    // }
    
    if(!reserveObj.employeeId || !reserveObj.employeeId._id){
        reserveObj.modelId={
            _id:null,
            fullName:"",                        
            email:""
        }
    }
    delete reserveObj.__v
    reserveObj.totalPaid = req.body.amount;
    // inventoryValidation.quantity-=req.body.quantity;
    // await inventoryValidation.save();
    return reply.code(201).send({
        status: 'success',
        data: reserveObj
     }) 

}

const reserveShow = async function (req,reply){    
    const reserve = await Reserve.findOne({_id:req.params.reserveId, branchId:req.params.id}).select('-updatedAt -__v');
    if (!reserve){
        return reply.code(400).send({
            status: 'fail',
            message: 'Apartado no registrado'
        })        
    } 
    
    await reserve.populate([
        {path:'branchId', select:'_id name code'},
        //{path:'modelId', select:'_id name'},
        {path:'employeeId', select:'_id fullName email'},
        //{path:'clientId', select:'_id fullName email phone'},
        {path:'cancelledBy', select:'_id fullName email phone'}
    ]);  
    let reserveObj = await reserve.toObject();
    let payments = await Payment.find({reserveId:reserve._id,isDeleted:false, isDiscarded:false})                
    let cancelledPayments = await Payment.find({reserveId:reserve._id,isDeleted:false, isDiscarded:true})                
    
    // letpayments = await Payment.aggregate([
    //     {
    //     '$match': {
    //       'reserveId':reserve._id
    //       'isDeleted': false
    //     }
    //   }, 
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
    // {
    //     '$lookup': {
    //         'from': 'clients', 
    //         'localField': 'clientId', 
    //         'foreignField': '_id', 
    //         'as': 'clientInfo'
    //       }
    //  },
    //  {
    //     '$lookup': {
    //         'from': 'users', 
    //         'localField': 'employeeId', 
    //         'foreignField': '_id', 
    //         'as': 'employeeInfo'
    //       }
    //  },
    //  {
    //     '$lookup': {
    //         'from': 'payments', 
    //         'localField': '_id', 
    //         'foreignField': 'saleId', 
    //         'as': 'paymentsInfo'
    //       }
    //  },

      
    //   {
    //     '$project': {
    //       'isDeleted':1,
    //       //'branchId': 1,                   
    //       'folio': 1,                   
    //       'branchId._id': {
    //         '$first': '$branchInfo._id'
    //       },
    //       'branchId.code': {
    //         '$first': '$branchInfo.code'
    //       } ,
    //       'branchId.name': {
    //         '$first': '$branchInfo.name'
    //       },
    //       'modelId._id': {
    //         '$first': '$modelInfo._id'
    //       },
    //       'modelId.name': {
    //         '$first': '$modelInfo.name'
    //       }, 
    //       'color':1,
    //       'clientId._id': {
    //         '$first': '$clientInfo._id'
    //       },
    //       'client.fullName': {
    //         '$first': '$clientInfo.fullName'
    //       }, 
    //       'client.phone': {
    //         '$first': '$clientInfo.phone'
    //       }, 
    //       'client.email': {
    //         '$first': '$clientInfo.email'
    //       }, 
    //       'userId._id': {
    //         '$first': '$userInfo._id'
    //       },
    //       'userId.fullName': {
    //         '$first': '$userInfo.fullName'
    //       }, 
    //       'userId.phone': {
    //         '$first': '$userInfo.phone'
    //       }, 
    //       'userId.email': {
    //         '$first': '$userInfo.email'
    //       }, 
    //       'payments':'$payments.Info',

    //       'createdAt':1,
    //       'updatedAt':1,                 
    //     }
    //   }, {
    //     '$match': {
    //       '$or': [                    
    //         {
    //           'color': {
    //             '$regex': searchString, 
    //             '$options': 'i'
    //           }
    //         },
    //         {
    //             'branchId.code': {
    //               '$regex': searchString, 
    //               '$options': 'i'
    //             }
    //         },
    //         {
    //             'branchId.name': {
    //               '$regex': searchString, 
    //               '$options': 'i'
    //             }
    //         },
    //         {
    //             'modelId.name': {
    //               '$regex': searchString, 
    //               '$options': 'i'
    //             }
    //         },
    //         {
    //             'clientId.fullName': {
    //               '$regex': searchString, 
    //               '$options': 'i'
    //             }
    //         },
    //         {
    //             'clientId.phone': {
    //               '$regex': searchString, 
    //               '$options': 'i'
    //             }
    //         },
    //         {
    //             'clientId.email': {
    //               '$regex': searchString, 
    //               '$options': 'i'
    //             }
    //         },
    //         {
    //             'userId.fullName': {
    //               '$regex': searchString, 
    //               '$options': 'i'
    //             }
    //         },                    
    //         {
    //             'userId.email': {
    //               '$regex': searchString, 
    //               '$options': 'i'
    //             }
    //         }

    //       ]
    //     }
    //   }
    // ])
    let totalPaid = 0;
    payments.forEach(payment=>{
        totalPaid+=payment.amount;
    })
    reserveObj.payments=payments;
    reserveObj.totalPaid=totalPaid; 
    reserveObj.pendingBalance=reserveObj.totalSale - totalPaid;
    reserveObj.cancelledPayments=cancelledPayments;  

    
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

    // if(!reserveObj.clientId || !reserveObj.clientId._id){
    //     reserveObj.clientId={
    //         _id:null,
    //         fullName:"",            
    //         phone:"",
    //         email:""
    //     }
    // }
    
    if(!reserveObj.employeeId || !reserveObj.employeeId._id){
        reserveObj.modelId={
            _id:null,
            fullName:"",                        
            email:""
        }
    }
    if(!reserveObj.cancelledBy || !reserveObj.cancelledBy){
        reserveObj.cancelledBy={
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

const reserveShowCrm = async function (req,reply){    
    const reserve = await Reserve.findOne({_id:req.params.reserveId}).select('-updatedAt -__v');
    if (!reserve){
        return reply.code(400).send({
            status: 'fail',
            message: 'Apartado no registrado'
        })        
    } 
    
    await reserve.populate([
        {path:'branchId', select:'_id name code'},
        //{path:'modelId', select:'_id name'},
        {path:'employeeId', select:'_id fullName email'},
        //{path:'clientId', select:'_id fullName email phone'},
        {path:'cancelledBy', select:'_id fullName email phone'}
    ]);  
    let reserveObj = await reserve.toObject();
    let payments = await Payment.find({reserveId:reserve._id,isDeleted:false, isDiscarded:false})                
    let cancelledPayments = await Payment.find({reserveId:reserve._id,isDeleted:false, isDiscarded:true})                
    
    let totalPaid = 0;
    payments.forEach(payment=>{
        totalPaid+=payment.amount;
    })
    reserveObj.payments=payments;
    reserveObj.totalPaid=totalPaid; 
    reserveObj.pendingBalance=reserveObj.totalSale - totalPaid;
    reserveObj.cancelledPayments=cancelledPayments;  

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

    
    
    if(!reserveObj.employeeId || !reserveObj.employeeId._id){
        reserveObj.modelId={
            _id:null,
            fullName:"",                        
            email:""
        }
    }
    if(!reserveObj.cancelledBy || !reserveObj.cancelledBy){
        reserveObj.cancelledBy={
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

const reserveCancel = async function (req,reply){
    const reserve = await Reserve.findOne({_id:req.params.reserveId}).select('-createdAt -updatedAt -__v');
    if (!reserve){
        return reply.code(400).send({
            status: 'fail',
            message: 'Apartado no registrado'
        })        
    } 

    if(reserve.isCancelled==true){
        return reply.code(400).send({
            status:'fail',
            message:'Apartado ya se encuentra cancelado'
        })
    }

    let updatedReserve = await Reserve.findOne({_id:req.params.reserveId}).select('-createdAt -updatedAt -__v');
    updatedReserve.isCancelled=true;
    await updatedReserve.save();
        reply.code(200).send({
        status: 'success',
        message: 'Apartado '+updatedReserve.folio+' cancelado.'           
        
    })      
    
}

const reserveDelete = async function (req,reply){
    
}


const reserveList = async function (req,reply){

    let searchQuery = {
        isDeleted: false,			
    };
    if(req.params.id && !req.query.branchId){
        searchQuery['branchId']=req.params.id
    }

    if(!req.params.id && req.query.branchId){
        searchQuery['branchId']=req.query.branchId
    }
    if(req.query.employeeId){
        searchQuery['employeeId']=req.query.employeeId
    }
    if(req.query.modelId){
        searchQuery['products.modelId']=req.query.modelId
    }

    if (req.query.initialDate!=null && req.query.finalDate!=null){      
        
        
        let initialDay=new Date(req.query.initialDate);
        let finalDayToDate =new Date(req.query.finalDate)
        
        if(initialDay.getTime() > finalDayToDate.getTime()){
            return reply.code(400).send({
                status:'fail',
                message:'La fecha inicial no puede ser mayor que la fecha final'
            })
        }

        let finalDay= addDays(finalDayToDate,1)
        console.log("INITIAL DATE RECEIVED CRM RENTALS: ", req.query.initialDate);
        console.log("INITIAL DATE ADJUSTED CRM RENTALS: ", initialDay);
        console.log("FINAL DATE RECEIVED CRM RENTALS: ", req.query.finalDate);                       
        console.log("FINAL DATE RECEIVED CRM RENTALS: ", finalDay);                       
        searchQuery['createdAt']={"$gte": initialDay,"$lte":finalDay}
    }
    if (req.query.initialDate!=null && req.query.finalDate==null){        
        let initialDay=new Date(req.query.initialDate);
        searchQuery['createdAt']={"$gte": initialDay}

    }
    if (req.query.finalDate!=null && req.query.initialDate==null){
        let finalDay= addDays(req.query.finalDate,1)
        searchQuery['createdAt']={"$lte": finalDay}
    }
    const options = {
        select: `-isDeleted -__v -updatedAt`, 

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
        options.sort={"createdAt":-1}
    }
    let reservesPaginated={};
    if(!req.query.search){         
        //let sortOrder={name:1}       
        let allBranches = await Branch.find({});
        //let allModels = await Modelo.find({});
        //let allClients = await Client.find({});
        let allUsers = await User.find({});
        let allPayments = await Payment.find({})
        if(options.page!=null && options.limit!=null){
            reservesPaginated.docs=[];
            let reservesQuery = await Reserve.paginate(searchQuery, options);
            reservesQuery.docs.forEach(reserve => {
                let newObj={
                    _id:reserve._id,
                    folio:reserve.folio,
                    client:reserve.client,
                    products:reserve.products,                    
                    totalSale:reserve.totalSale,
                    createdAt:reserve.createdAt,
                    updateAt:reserve.updatedAt,                   

                }
                let branchInfo = allBranches.find(branch=>{
                    return String(branch._id) == String(reserve.branchId)
                })
                newObj.branchId={
                    _id:reserve.branchId ? reserve.branchId :null,
                    name : branchInfo && branchInfo.name ? branchInfo.name : "",
                    code : branchInfo && branchInfo.code ? branchInfo.code : "",

                }
                // let modelInfo = allModels.find(modelo=>{
                //     return String(modelo._id) == String(reserve.modelId)
                // })
                // newObj.modelId={
                //     _id:reserve.modelId ? reserve.modelId :null,
                //     name : modelInfo && modelInfo.name ? modelInfo.name : "",
                //     code : modelInfo && modelInfo.code ? modelInfo.code : "",

                // }

                // let clientInfo = allClients.find(client=>{
                //     return String(client._id) == String(reserve.clientId)
                // })
                // newObj.clientId={
                //     _id:reserve.clientId ? reserve.clientId :null,
                //     fullName : clientInfo && clientInfo.fullName ? clientInfo.fullName : "",
                //     phone : clientInfo && clientInfo.phone ? clientInfo.phone : "",
                //     email : clientInfo && clientInfo.email ? clientInfo.email : "",

                // }

                let userInfo = allUsers.find(user=>{
                    return String(user._id) == String(reserve.employeeId)
                })
                newObj.employeeId={
                    _id:reserve.employeeId ? reserve.employeeId :null,
                    fullName : userInfo && userInfo.fullName ? userInfo.fullName : "",
                    phone : userInfo && userInfo.phone ? userInfo.phone : "",
                    email : userInfo && userInfo.email ? userInfo.email : "",

                }

                newObj.payments = allPayments.filter(payment=>{
                    return String ( (payment.reserveId) == String(reserve._id) && payment.isDiscarded==false)
                })

                newObj.totalPaid = _.sumBy(newObj.payments, (payment) => {
                    return Number(payment.amount.toFixed(2))
                });

                newObj.pendingBalance = newObj.totalSale - newObj.totalPaid;

                newObj.cancelledPayments = allPayments.filter(payment=>{
                    return String ( (payment.reserveId) == String(reserve._id) && payment.isDiscarded==true)
                })
                
                delete reserve.branchId;
                delete reserve.modelId;                
                delete reserve.clientId;                
                delete reserve.employeeId;                
                reservesPaginated.docs.push(newObj)                               
            });
            reservesPaginated.page=reservesQuery.page;
            reservesPaginated.perPage=reservesQuery.limit;
            reservesPaginated.totalDocs=reservesQuery.totalDocs;
            reservesPaginated.totalPages=reservesQuery.totalPages;
        }
        else{
            let sortOrder = {}
            if(req.query.column){
                
                sortOrder[req.query.column] = req.query.order == "desc" ? -1:1
            }
            else{
                sortOrder ={
                    createdAt:1
                }
            }
            reservesPaginated.docs=[]
            let reservesQuery = await Reserve.find(searchQuery).sort(sortOrder).lean();
            reservesQuery.forEach(reserve => {
                let branchInfo = allBranches.find(branch=>{
                    return String(branch._id) == String(reserve.branchId)
                }) 
                let branchId={
                    _id:reserve.branchId ? reserve.branchId :null,
                    name : branchInfo && branchInfo.name ? branchInfo.name : "",
                    code : branchInfo && branchInfo.code ? branchInfo.code : "",
                } 
                // let modelInfo = allModels.find(modelo=>{
                //     return String(modelo._id) == String(reserve.modelId)
                // }) 
                // let modelId={
                //     _id:reserve.modelId ? reserve.modelId :null,
                //     name : modelInfo && modelInfo.name ? modelInfo.name : "",                    
                // }
                
                // let clientInfo = allClients.find(client=>{
                //     return String(client._id) == String(reserve.clientId)
                // })

                // let clientId={
                //     _id:reserve.clientId ? reserve.clientId :null,
                //     fullName : clientInfo && clientInfo.fullName ? clientInfo.fullName : "",
                //     phone : clientInfo && clientInfo.phone ? clientInfo.phone : "",
                //     email : clientInfo && clientInfo.email ? clientInfo.email : "",

                // }

                let userInfo = allUsers.find(user=>{
                    return String(user._id) == String(reserve.employeeId)
                })
                let userId={
                    _id:reserve.employeeId ? reserve.employeeId :null,
                    fullName : userInfo && userInfo.fullName ? userInfo.fullName : "",
                    phone : userInfo && userInfo.phone ? userInfo.phone : "",
                    email : userInfo && userInfo.email ? userInfo.email : "",

                }

                let payments = allPayments.filter(payment=>{
                    return ( String(payment.reserveId) == String(reserve._id) && payment.isDiscarded==false);
                })
                
                reserve.totalPaid = _.sumBy(payments, (payment) => {
                    return Number(payment.amount.toFixed(2))
                });

                reserve.pendingBalance = reserve.totalSale - reserve.totalPaid;

                let cancelledPayments = allPayments.filter(payment=>{
                    return ( String(payment.reserveId) == String(reserve._id) && payment.isDiscarded==true);
                })

                reserve.branchId=branchId;                         
                reserve.employeeId=userId;         
                reserve.payments=payments; 
                reserve.cancelledPayments=cancelledPayments;        

                // reserve.branchName = branchInfo && branchInfo.name ? branchInfo.name : "",
                // reserve.branchCode = branchInfo && branchInfo.code ? branchInfo.code : "",
                // delete reserve.branchId;                
                reservesPaginated.docs.push(reserve)
                

                
            });
        }
        
        
        
        

        
    }
    else{
        // branchSearch = await reserve.search(req.query.search, { isDeleted: false }).collation({locale: "es", strength: 3}).select(options.select);
        // reservesPaginated.totalDocs = branchSearch.length;
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
          if(req.query.modelId){
            aggregateQuery.push({
                '$match':{
                    modelId:new ObjectId(req.query.modelId)
                }
                })
          }

          if(req.query.clientId){
            aggregateQuery.push({
                '$match':{
                    clientId:new ObjectId(req.query.clientId)
                }
                })
          }
          if(req.query.userId){
            aggregateQuery.push({
                '$match':{
                    userId:new ObjectId(req.query.userId)
                }
                })
          }
          if(req.query.color){
            aggregateQuery.push({
                '$match':{
                    userId:new ObjectId(req.query.color)
                }
                })
          }

          if (req.query.initialDate!=null && req.query.finalDate!=null){                    
            let initialDay=new Date(req.query.initialDate);
            let finalDayToDate =new Date(req.query.finalDate)            
            if(initialDay.getTime() > finalDayToDate.getTime()){
                return reply.code(400).send({
                    status:'fail',
                    message:'La fecha inicial no puede ser mayor que la fecha final'
                })
            }
    
            let finalDay= addDays(finalDayToDate,1)
            console.log("INITIAL DATE RECEIVED CRM RENTALS: ", req.query.initialDate);
            console.log("INITIAL DATE ADJUSTED CRM RENTALS: ", initialDay);
            console.log("FINAL DATE RECEIVED CRM RENTALS: ", req.query.finalDate);                       
            console.log("FINAL DATE RECEIVED CRM RENTALS: ", finalDay);
            aggregateQuery.push({
                '$match':{
                    createdAt:{"$gte": initialDay,"$lte":finalDay}
                }
            })                                   
        }
        if (req.query.initialDate!=null && req.query.finalDate==null){        
            let initialDay=new Date(req.query.initialDate);
            aggregateQuery.push({
                '$match':{
                    createdAt:{"$gte": initialDay}
                }
            })                                              
        }
        if (req.query.finalDate!=null && req.query.initialDate==null){
            let finalDay= addDays(req.query.finalDate,1)
            aggregateQuery.push({
                '$match':{
                    createdAt:{"$lte": finalDay}
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
                    'from': 'users', 
                    'localField': 'employeeId', 
                    'foreignField': '_id', 
                    'as': 'employeeInfo'
                  }
             },
             {
                '$lookup': {
                    'from': 'payments', 
                    'localField': '_id', 
                    'foreignField': 'reserveId', 
                    'as': 'paymentsInfo'
                  }
             },

              
              {
                '$project': {
                  'isDeleted':1,
                  //'branchId': 1,                   
                  'folio': 1,                   
                  'branchId._id': {
                    '$first': '$branchInfo._id'
                  },
                  'branchId.code': {
                    '$first': '$branchInfo.code'
                  } ,
                  'branchId.name': {
                    '$first': '$branchInfo.name'
                  },                  
                  'client':1,                  
                  'employeeId._id': {
                    '$first': '$employeeInfo._id'
                  },
                  'employeeId.fullName': {
                    '$first': '$employeeInfo.fullName'
                  }, 
                  'employeeId.phone': {
                    '$first': '$employeeInfo.phone'
                  }, 
                  'employeeId.email': {
                    '$first': '$employeeInfo.email'
                  }, 
                  'products':1,  
                  'totalSale':1,
                  'payments': {
                    $filter: {
                        input: "$paymentsInfo",
                          as: "payment",
                          cond: { $eq: [ "$$payment.isDiscarded", false ] },
                       }
                    },
                   'cancelledPayments': {
                      $filter: {
                        input: "$paymentsInfo",
                            as: "payment",
                            cond: { $eq: [ "$$payment.isDiscarded", true ] },
                         }
                     },                              
                  'createdAt':1,
                  'updatedAt':1,                 
                }
              }, 
              
              {
                '$match': {
                  '$or': [                    
                    
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
                        'products.modelName': {
                          '$regex': searchString, 
                          '$options': 'i'
                        }
                    },
                    {
                        'products.color': {
                          '$regex': searchString, 
                          '$options': 'i'
                        }
                      },
                    {
                        'client.fullName': {
                          '$regex': searchString, 
                          '$options': 'i'
                        }
                    },
                    {
                        'client.phone': {
                          '$regex': searchString, 
                          '$options': 'i'
                        }
                    },
                    {
                        'client.email': {
                          '$regex': searchString, 
                          '$options': 'i'
                        }
                    },
                    {
                        'userId.fullName': {
                          '$regex': searchString, 
                          '$options': 'i'
                        }
                    },                    
                    {
                        'userId.email': {
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
        let reservesSearch = await Reserve.aggregate(aggregateQuery);
        reservesPaginated.docs = reservesSearch;
        reservesPaginated.totalDocs = reservesPaginated.docs.length

        reservesPaginated.page=req.query.page ? req.query.page : 1;
        reservesPaginated.perPage=req.query.perPage ? req.query.perPage :reservesPaginated.totalDocs;
        let limit = req.query.perPage ? req.query.perPage : reservesPaginated.totalDocs;
        let page = req.query.page ? req.query.page : 1;
        reservesPaginated.docs=paginateArray(reservesSearch,limit,page);
        
        reservesPaginated.docs.forEach(doc=>{
            if (!doc.branchId || !doc.branchId._id){
                doc.branchId ={
                    _id:null,
                    code:"",
                    name:""
                }
            }            
        })
        reservesPaginated.totalPages = Math.ceil(reservesPaginated.totalDocs / reservesPaginated.perPage);

    }
    reservesPaginated.docs.forEach(doc=>{
        if(doc.isStarted== true && doc.expireDate){
            let currentDate = new Date ()
            let remainingTime = minutesDiff (currentDate,doc.expireDate);
            doc.remainingTime=remainingTime

        }
        

    })
    let docs = JSON.stringify(reservesPaginated.docs);    
    var reserves = JSON.parse(docs);
    

    return reply.code(200).send({
        status: 'success',
        data: reserves,
        page: reservesPaginated.page,
        perPage:reservesPaginated.perPage,
        totalDocs: reservesPaginated.totalDocs,
        totalPages: reservesPaginated.totalPages,

    })
    
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

module.exports = { reserveCreate, reserveDelete, reserveList, reserveShow, reserveUpdate, reserveAddPayment, reserveCancel, reserveShowCrm}