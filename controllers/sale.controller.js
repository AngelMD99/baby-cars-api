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
var _ = require('lodash');
const { getOffsetSetting } = require('../controllers/base.controller');
const { findOneAndDelete } = require('../models/Branch');
const { inventoryCreate } = require('./inventory.controller');
const input = require('sharp/lib/input');

const saleCreate = async function (req, reply){  
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
    
    const decoded = await req.jwtVerify();
    
    this.newSale = {};
    this.newPayment = {};


    let db = await mongoose.startSession()
    .then(async session => {
        await session.withTransaction(async () => {
        let products = req.body.products;
        //let products = req.body('products');
        let inputs={};        
        inputs.branchId = req.body.branchId;    
        inputs.client = req.body.client;    
        inputs.employeeId= req.body.employeeId;                 
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

        const sale = new Sale(inputs);     
        sale.products = products;
        sale.isPaid = true;
        //sale.totalSale = total;
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
            branchId:req.body.branchId,
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

        let paymentInput={
            branchId:req.body.branchId,
            operationType:'single',
            saleId:sale._id,
            amount:inputs.totalSale,
            paidOn:new Date(),
            paymentType:req.body.paymentType.toLowerCase(),
            collectedBy:decoded._id
    
        }
        
        const payment = new Payment(paymentInput);
        payment._id = mongoose.Types.ObjectId();     
        await payment.save();   
        this.newPayment = payment;

        this.newSale = sale;
        return           
    });              


    }).catch((err) => {
        this.newSale = err;
    });


    if(this.newSale == null || this.newSale.message){
        console.error(this.newSale);
        return reply.code(400).send({
            status:"fail",
            message:this.newSale && this.newSale.message? this.newSale.message : "Error en las transacciones en la base de datos"
        });
    }

    // let branchId = req.body.branchId;    
    // let modelId = req.body.modelId;  
    // let clientId = req.body.clientId;    
    // let employeeId= req.body.employeeId;    
    // let color = req.body.color  
    // delete req.body.branchId;  
    
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



    // const sale = new Sale(req.body);     
    // if(branchId){
    //     sale.branchId=branchId;
    // }
    // if(modelId){
    //     sale.modelId=modelId;
    // }
    // if(clientId){
    //     sale.clientId=clientId;
    // }
    // if(employeeId){
    //     sale.employeeId=employeeId;
    // }
    // if (color){
    //     sale.color=color.toLowerCase()
    // }
    // sale.price = req.body.price;
    // sale.quantity = req.body.quantity;
    // sale.isPaid = true;
    // let total = req.body.price * req.body.quantity;
    // sale.totalSale = total;
    // sale._id = mongoose.Types.ObjectId();

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
    // let branchSales = await Sale.find({
    //     isDeleted:false, 
    //     branchId:branchId,
    //     createdAt:{"$gte": date,"$lte":nextDay}
    // }) 

    // let day = date.getDate();
    // let month = date.getMonth() + 1
    // let year = date.getFullYear();
    // let dayString = day > 9 ? day : "0"+day;
    // let monthString = month > 9 ? month : "0"+month;  
    // let nextFolio = branchSales.length+1
    // nextFolio = nextFolio<10 ? "0000"+String(nextFolio) : nextFolio;
    // nextFolio = nextFolio>=10 && nextFolio < 100? "000"+String(nextFolio) : nextFolio;
    // nextFolio = nextFolio>=100 && nextFolio < 1000? "00"+String(nextFolio) : nextFolio;
    // let branchCode = activeBranch.code;
    // sale.folio = "VT-"+branchCode+"-"+year+monthString+dayString+"-"+String(nextFolio) 

    // await sale.save()
    await this.newSale.populate([
        {path:'branchId', select:'_id name code'},
        //{path:'modelId', select:'_id name'},
        {path:'employeeId', select:'_id fullName email'},
        //{path:'clientId', select:'_id fullName email phone'}
    ]); 
   
 

    //await saveHistory(loggedUser,"CREATED","Branch",branch)

    const saleObj = await this.newSale.toObject()
    const paymentObj = await this.newPayment.toObject()
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
    // inventoryValidation.quantity-=req.body.quantity;
    // await inventoryValidation.save();

    return reply.code(201).send({
        status: 'success',
        data: saleObj
     }) 

}


const saleShow = async function (req, reply){
    const sale = await Sale.findOne({_id:req.params.saleId, branchId:req.params.id}).select('-createdAt -updatedAt -__v');
    if (!sale){
        return reply.code(400).send({
            status: 'fail',
            message: 'Venta no registrada'
        })        
    } 
    
    await sale.populate([
        {path:'branchId', select:'_id name code'},
        //{path:'modelId', select:'_id name'},
        {path:'employeeId', select:'_id fullName email'},
        //{path:'clientId', select:'_id fullName email phone'}
    ]);  
    let saleObj = await sale.toObject();
    let payment = await Payment.findOne({saleId:sale._id,isDeleted:false})            
    if (!payment){
        return reply.code(400).send({
            status: 'fail',
            message: 'La venta no tiene pago asociado'
        })        
    } 
    let paymentObj = await payment.toObject()
    saleObj.payments=[paymentObj]


    
    // if (saleObj.branchId){
    //     saleObj.branchCode=saleObj.branchId.code ? saleObj.branchId.code :"";
    //     saleObj.branchName=saleObj.branchId.name ? saleObj.branchId.name :"";
    //     delete saleObj.branchId;
    // }
    if(!saleObj.branchId || !saleObj.branchId._id){
        saleObj.branchId={
            _id:null,
            name:"",
            code:"",
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
    return reply.code(200).send({
        status: 'success',
        data: saleObj
    })    

}

const saleList = async function (req, reply){
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
    let salesPaginated={};
    if(!req.query.search){         
        //let sortOrder={name:1}       
        let allBranches = await Branch.find({});
        //let allModels = await Modelo.find({});
        //let allClients = await Client.find({});
        let allUsers = await User.find({});
        let allPayments = await Payment.find({})
        if(options.page!=null && options.limit!=null){
            salesPaginated.docs=[];
            let salesQuery = await Sale.paginate(searchQuery, options);
            salesQuery.docs.forEach(sale => {
                let newObj={
                    _id:sale._id,
                    folio:sale.folio,
                    client:sale.client,
                    products:sale.products,
                    totalSale:sale.totalSale,
                    createdAt:sale.createdAt,
                    updateAt:sale.updatedAt,                   

                }
                let branchInfo = allBranches.find(branch=>{
                    return String(branch._id) == String(sale.branchId)
                })
                newObj.branchId={
                    _id:sale.branchId ? sale.branchId :null,
                    name : branchInfo && branchInfo.name ? branchInfo.name : "",
                    code : branchInfo && branchInfo.code ? branchInfo.code : "",

                }
                // let modelInfo = allModels.find(modelo=>{
                //     return String(modelo._id) == String(sale.modelId)
                // })
                // newObj.modelId={
                //     _id:sale.modelId ? sale.modelId :null,
                //     name : modelInfo && modelInfo.name ? modelInfo.name : "",
                //     code : modelInfo && modelInfo.code ? modelInfo.code : "",

                // }

                // let clientInfo = allClients.find(client=>{
                //     return String(client._id) == String(sale.clientId)
                // })
                // newObj.clientId={
                //     _id:sale.clientId ? sale.clientId :null,
                //     fullName : clientInfo && clientInfo.fullName ? clientInfo.fullName : "",
                //     phone : clientInfo && clientInfo.phone ? clientInfo.phone : "",
                //     email : clientInfo && clientInfo.email ? clientInfo.email : "",

                // }

                let userInfo = allUsers.find(user=>{
                    return String(user._id) == String(sale.employeeId)
                })
                newObj.employeeId={
                    _id:sale.employeeId ? sale.employeeId :null,
                    fullName : userInfo && userInfo.fullName ? userInfo.fullName : "",
                    phone : userInfo && userInfo.phone ? userInfo.phone : "",
                    email : userInfo && userInfo.email ? userInfo.email : "",

                }

                newObj.payments = allPayments.filter(payment=>{
                    return String(payment.saleId) == String(sale._id)
                })
                
                delete sale.branchId;
                delete sale.modelId;                
                delete sale.clientId;                
                delete sale.employeeId;                
                salesPaginated.docs.push(newObj)                               
            });
            salesPaginated.page=salesQuery.page;
            salesPaginated.perPage=salesQuery.limit;
            salesPaginated.totalDocs=salesQuery.totalDocs;
            salesPaginated.totalPages=salesQuery.totalPages;
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
            salesPaginated.docs=[]
            let salesQuery = await Sale.find(searchQuery).sort(sortOrder).lean();
            salesQuery.forEach(sale => {
                let branchInfo = allBranches.find(branch=>{
                    return String(branch._id) == String(sale.branchId)
                }) 
                let branchId={
                    _id:sale.branchId ? sale.branchId :null,
                    name : branchInfo && branchInfo.name ? branchInfo.name : "",
                    code : branchInfo && branchInfo.code ? branchInfo.code : "",
                } 
                // let modelInfo = allModels.find(modelo=>{
                //     return String(modelo._id) == String(sale.modelId)
                // }) 
                // let modelId={
                //     _id:sale.modelId ? sale.modelId :null,
                //     name : modelInfo && modelInfo.name ? modelInfo.name : "",                    
                // }
                
                // let clientInfo = allClients.find(client=>{
                //     return String(client._id) == String(sale.clientId)
                // })

                // let clientId={
                //     _id:sale.clientId ? sale.clientId :null,
                //     fullName : clientInfo && clientInfo.fullName ? clientInfo.fullName : "",
                //     phone : clientInfo && clientInfo.phone ? clientInfo.phone : "",
                //     email : clientInfo && clientInfo.email ? clientInfo.email : "",

                // }

                let userInfo = allUsers.find(user=>{
                    return String(user._id) == String(sale.employeeId)
                })
                let userId={
                    _id:sale.employeeId ? sale.employeeId :null,
                    fullName : userInfo && userInfo.fullName ? userInfo.fullName : "",
                    phone : userInfo && userInfo.phone ? userInfo.phone : "",
                    email : userInfo && userInfo.email ? userInfo.email : "",

                }

                let payments = allPayments.filter(payment=>{
                    return String(payment.saleId) == String(sale._id)
                })
                sale.branchId=branchId;         
                // sale.modelId=modelId;         
                // sale.clientId=clientId;         
                sale.employeeId=userId;         
                sale.payments=payments;         

                // sale.branchName = branchInfo && branchInfo.name ? branchInfo.name : "",
                // sale.branchCode = branchInfo && branchInfo.code ? branchInfo.code : "",
                // delete sale.branchId;                
                salesPaginated.docs.push(sale)
                

                
            });
        }
        
        
        
        

        
    }
    else{
        // branchSearch = await sale.search(req.query.search, { isDeleted: false }).collation({locale: "es", strength: 3}).select(options.select);
        // salesPaginated.totalDocs = branchSearch.length;
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
                    'foreignField': 'saleId', 
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
                  'payments':'$paymentsInfo',


                  'createdAt':1,
                  'updatedAt':1,                 
                }
              }, {
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
        let salesSearch = await Sale.aggregate(aggregateQuery);
        salesPaginated.docs = salesSearch;
        salesPaginated.totalDocs = salesPaginated.docs.length

        salesPaginated.page=req.query.page ? req.query.page : 1;
        salesPaginated.perPage=req.query.perPage ? req.query.perPage :salesPaginated.totalDocs;
        let limit = req.query.perPage ? req.query.perPage : salesPaginated.totalDocs;
        let page = req.query.page ? req.query.page : 1;
        salesPaginated.docs=paginateArray(salesSearch,limit,page);
        
        salesPaginated.docs.forEach(doc=>{
            if (!doc.branchId || !doc.branchId._id){
                doc.branchId ={
                    _id:null,
                    code:"",
                    name:""
                }
            }
        })
        salesPaginated.totalPages = Math.ceil(salesPaginated.totalDocs / salesPaginated.perPage);

    }
    salesPaginated.docs.forEach(doc=>{
        if(doc.isStarted== true && doc.expireDate){
            let currentDate = new Date ()
            let remainingTime = minutesDiff (currentDate,doc.expireDate);
            doc.remainingTime=remainingTime

        }
        

    })
    let docs = JSON.stringify(salesPaginated.docs);    
    var sales = JSON.parse(docs);
    

    return reply.code(200).send({
        status: 'success',
        data: sales,
        page: salesPaginated.page,
        perPage:salesPaginated.perPage,
        totalDocs: salesPaginated.totalDocs,
        totalPages: salesPaginated.totalPages,

    })



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


