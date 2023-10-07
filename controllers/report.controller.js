const Rental = require('../models/Rental');
const Inventory = require('../models/Inventory');
const Sale = require('../models/Sale');
const Reserve = require('../models/Reserve');
const Payment = require('../models/Payment');
const Balance = require('../models/Balance');
const Modelo = require('../models/Modelo');
const Car = require('../models/Car');
const Branch = require('../models/Branch');
const User = require('../models/User');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");
const xlsx = require('xlsx');
const XLSXStyle  = require("xlsx-style");
const { getOffsetSetting } = require('../controllers/base.controller');
const Battery = require('../models/Battery');

const rentalsReport = async function (req, reply){    
    let aggregateQuery=[];
    let offset = await getOffsetSetting()

    if(req.query.branchId != null){
        let branchId = mongoose.Types.ObjectId(req.query.branchId)
        aggregateQuery.push({ "$match": {"branchId": branchId }});        
    }

    if(req.query.carId != null){
        let carId = mongoose.Types.ObjectId(req.query.carId)
        aggregateQuery.push({ "$match": {"carId": carId }});        
    }

    if(req.query.userId != null){
        let userId = mongoose.Types.ObjectId(req.query.userId)
        aggregateQuery.push({ "$match": {"userId": userId }});        
    }

    let dateMatchStage={};
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
        dateMatchStage['$match']={'createdAt': {"$gte": initialDay,"$lte":finalDay}} }
        
    if (req.query.initialDate!=null && req.query.finalDate==null){        
        let initialDay=new Date(req.query.initialDate);
        dateMatchStage['$match']={'createdAt': {"$gte": initialDay}} 
    }
    
    if (req.query.finalDate!=null && req.query.initialDate==null){
        let finalDay= addDays(req.query.finalDate,1)
        dateMatchStage['$match']={'createdAt': {"$gte": finalDay}} 
        }

    if(dateMatchStage['$match']!=null){
        aggregateQuery.push(dateMatchStage)
    }

    
    // if (req.query.initialDate != null && req.query.lastDate != null){
    //     let initialDate = parseDate(req.query.initialDate);
    //     //let offset = await getOffsetSetting();              
    //     //let offset = req.headers.offset ? Number(req.headers.offset) : 6        

    //     //initialDate.setHours(0,0,0,0);
    //     let lastDate = parseDate(req.query.lastDate);
    //     lastDate = addDays(lastDate, 1)
    //     if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
    //         initialDate.setHours(offset,0,0,0);    
    //         lastDate.setHours(offset, 0, 0, 0);
    //     }
    //     else{
    //         initialDate.setHours(0,0,0,0);
    //         lastDate.setHours(0, 0, 0, 0);
    
    //     }
    //     aggregateQuery.push({ "$match": {"createdAt": {"$gte": initialDate,"$lte":lastDate}}});        
    // }   
         
      
    aggregateQuery.push(
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
              'from': 'cars', 
              'localField': 'carId', 
              'foreignField': '_id', 
              'as': 'carInfo'
            }
          },
          {
            '$lookup': {
              'from': 'users', 
              'localField': 'userId', 
              'foreignField': '_id', 
              'as': 'userInfo'
            }
          },
         {
            '$project': {
                'Folio':'$folio',
                'Sucursal código':{
                    '$first': '$branchInfo.code'
                },
                'Sucursal nombre': {
                    '$first': '$branchInfo.name'
                
                },
                'Empleado nombre':{
                    '$first': '$userInfo.fullName'
                },
                'Empleado correo': {
                    '$first': '$userInfo.email'
                
                },
                'Modelo'  :{
                    '$first': '$carInfo.modelId'
                },
                'Color'  :{
                    '$first': '$carInfo.color'
                },
                'Etiqueta': {
                    '$first': '$carInfo.name'
                },
                "Tiempo":'$planType.time',
                "Costo":'$planType.price',
                "Tipo de pago":'$paymentType',
                "createdAt":'$createdAt'                               
                
            }
          } 
        //   {
        //     '$group': {
        //       '_id': '$_id', 
        //       'count': {
        //         '$sum': 1
        //       }
        //     }
        //   }
    )

    let rentals = await Rental.aggregate(aggregateQuery); 
    //console.log("RENTALS: ", rentals[0]);
    let allModels = await Modelo.find({});
    rentals.forEach(rental=>{
        if(rental['Tipo de pago']){
            switch (rental['Tipo de pago']) {
                case 'card':
                    rental['Tipo de pago']='Tarjeta'
                    break;
                case 'cash':
                    rental['Tipo de pago']='Efectivo'
                    break;
                    

                default:
                    break;
            }
        }
        if(rental.createdAt){            
            rental.createdAt = adjustTimeStamp (rental.createdAt,offset);
            rental.Fecha=dateDDMMAAAA(rental.createdAt);            
            rental.Hora=dateTimeHHSS(rental.createdAt);  
            
        }
        if (rental.Modelo){
            let modelInfo = allModels.find(element=>{
                return String(element._id) == String(rental.Modelo)
            })

            rental.Modelo = modelInfo ? modelInfo.name :"";
        }
        else{
            rental.Modelo = "";
        }
    })

    //console.log("RENTALS DATE ADJUSTED: ", rentals[0]);
    
   

    // if (rentals.length==0){
    //     let emptyPurchaseObj = {
    //         'Nombre': '', 
    //         'Habilitado general':'',
    //         'Cantidad de ventas':''            
    //     }
    //     rentals.push(emptyPurchaseObj)
    // }
   	
    let headers=[]; //created array for column names
    let wscols=[]; //array to store the width of the columns
    // create the export file
    //
    let wb = xlsx.utils.book_new();
    wb.Props = {
        Title: "Rentas",                
    };
    //let wbRows = rentals.length+4;   
    wb.SheetNames.push("Rentas");
    //addig the titles rows
    var ws_data = [['Sucursal','','','','','','','','','','','','']]
    var ws = xlsx.utils.aoa_to_sheet(ws_data);       
    wb.Sheets["Rentas"] = ws;
    wb.Sheets["Rentas"]["A1"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            },       
    }
    xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
            ['Etiqueta', '', '', '','','','','','','','','','']
          ],{origin: -1});
    wb.Sheets["Rentas"]["A2"].s={        
        font: {				  		
                sz: 12, // tamaño de fuente
                bold: true // negrita
        },       
    }

    xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
        ['Empleado', '', '', '','','','','','','','','','']
      ],{origin: -1});
    wb.Sheets["Rentas"]["A3"].s={        
        font: {				  		
            sz: 12, // tamaño de fuente
            bold: true // negrita
        },       
    }
    
    if(req.query.initialDate != null && req.query.lastDate !=null ){        
        xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
            ['Fecha inicial', '', '', '','','','','','','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
            ['Fecha final', '', '', '','','','','','','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
            ['', '', '', '','','','','','','','','','']
          ], {origin: -1});

        wb.Sheets["Rentas"]["A4"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            }               
        }
        wb.Sheets["Rentas"]["A5"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            }               
        }
    }
    else{
        xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
            ['Sin rango de fechas', '', '', '','','','','','','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
            ['', '', '', '','','','','','','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
            ['', '', '', '','','','','','','','','','']
          ], {origin: -1});
        wb.Sheets["Rentas"]["A4"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            }               
        }
    }

    xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
        ['Folio','Fecha','Hora','Sucursal código','Sucursal nombre','Empleado nombre','Empleado correo','Modelo','Color','Etiqueta','Tiempo','Costo','Tipo de pago']
      ], {origin: -1});
    
    wb.Sheets["Rentas"]["A7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["B7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["C7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["D7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["E7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["F7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["G7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["H7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["I7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["J7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["K7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["L7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["M7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }

//     wb.Sheets={
//         Rentas:{
//         }
//     }
//     wb.Sheets["Rentas"]["A1"]={
//         v:'Sucursal',
//         s: 
//         {				
//             font: {				  		
//                   sz: 12, // tamaño de fuente
//                   bold: true // negrita
//             },
//         }
//     }
    
//     wb.Sheets["Rentas"]["B1"]={};


    if(req.query.branchId != null){
        let branchInformation = await Branch.findOne({_id:req.query.branchId}) 
        wb.Sheets["Rentas"]["B1"].v= branchInformation!=null ? branchInformation.code+"-"+branchInformation.name : "";
        wb.Sheets["Rentas"]["B1"].s ={
            font:{
                bold:false
            }
        }
        //console.log(wb.Sheets["Rentas"]["B1"].v)        
    }
    else{
        wb.Sheets["Rentas"]["B1"].v="Todas"
        wb.Sheets["Rentas"]["B1"].s ={
            font:{
                bold:false
            }
        }
    }

    if(req.query.carId != null){
        let carInformation = await Car.findOne({_id:req.query.carId}) 
        wb.Sheets["Rentas"]["B2"].v= carInformation!=null ? carInformation.name+"-"+carInformation.color : "";
        wb.Sheets["Rentas"]["B2"].s ={
            font:{
                bold:false
            }
        }
        //console.log(wb.Sheets["Rentas"]["B1"].v)        
    }
    else{
        wb.Sheets["Rentas"]["B2"].v="Todos"
        wb.Sheets["Rentas"]["B2"].s ={
            font:{
                bold:false
            }
        }
    }

    if(req.query.userId != null){
        let userInformation = await User.findOne({_id:req.query.userId}) 
        wb.Sheets["Rentas"]["B3"].v= userInformation!=null ? userInformation.fullName+" - "+userInformation.email : "";
        wb.Sheets["Rentas"]["B3"].s ={
            font:{
                bold:false
            }
        }
        //console.log(wb.Sheets["Rentas"]["B1"].v)        
    }
    else{
        wb.Sheets["Rentas"]["B3"].v="Todos"
        wb.Sheets["Rentas"]["B3"].s ={
            font:{
                bold:false
            }
        }
    }
//     wb.Sheets["Rentas"]["A2"]={};
    if(req.query.initialDate != null && req.query.lastDate !=null ){ 
        let initialDate = parseDate(req.query.initialDate);
        let offset = req.headers.offset ? Number(req.headers.offset) : 6        
        let lastDate = parseDate(req.query.lastDate);

        if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
            initialDate.setHours(offset,0,0,0);    
            lastDate.setHours(offset, 0, 0, 0);
        }
        else{
            initialDate.setHours(0,0,0,0);
            lastDate.setHours(0, 0, 0, 0);
    
        }      
        wb.Sheets["Rentas"]["B2"].v=dateDDMMAAAA(initialDate).substring(0,11);
        wb.Sheets["Rentas"]["B3"].v=dateDDMMAAAA(lastDate).substring(0,11);
    }
    if (rentals.length>0){
        for (let index = 0; index < rentals.length; index++) {
            xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
                ['A', 'B','C','D','E','F','G','H','I','J',0,0,'M']
              ], {origin: -1});                     
        }
        let currentRow=8;
        rentals.forEach(purchase=>{
            wb.Sheets["Rentas"]["A"+String(currentRow)].v=purchase['Folio'];
            wb.Sheets["Rentas"]["B"+String(currentRow)].v=purchase['Fecha'];
            wb.Sheets["Rentas"]["C"+String(currentRow)].v=purchase['Hora'];
            wb.Sheets["Rentas"]["D"+String(currentRow)].v=purchase['Sucursal código'];
            wb.Sheets["Rentas"]["E"+String(currentRow)].v=purchase['Sucursal nombre'];
            wb.Sheets["Rentas"]["F"+String(currentRow)].v=purchase['Empleado nombre'];
            wb.Sheets["Rentas"]["G"+String(currentRow)].v=purchase['Empleado correo'];
            wb.Sheets["Rentas"]["H"+String(currentRow)].v=purchase['Modelo'];
            wb.Sheets["Rentas"]["I"+String(currentRow)].v=purchase['Color'];
            wb.Sheets["Rentas"]["J"+String(currentRow)].v=purchase['Etiqueta'];
            wb.Sheets["Rentas"]["K"+String(currentRow)].v=purchase['Tiempo'];
            wb.Sheets["Rentas"]["L"+String(currentRow)].v=purchase['Costo'];            
            wb.Sheets["Rentas"]["M"+String(currentRow)].v=purchase['Tipo de pago'];            
            currentRow ++;
           // ['Nombre','Habilitado general','Código','Descripción','Precio unitario','Cantidad de ventas','Importe total']


        })
    }

     headers=["Folio","Fecha","Hora","Sucursal código","Sucursal nombre","Empleado nombre","Empleado correo","Modelo","Color","Etiqueta","Tiempo","Costo","Tipo de pago"]
     //console.log(headers)

    // adjusting columns length added
     for (let i = 0; i < headers.length; i++) {  
         let columnWidth=headers[i].length;
         columnWidth=headers[i]=='Folio' ? columnWidth+20 : columnWidth;
         columnWidth=headers[i]=='Fecha' ? columnWidth+15 : columnWidth;
         columnWidth=headers[i]=='Hora' ? columnWidth+7 : columnWidth;
         columnWidth=headers[i]=='Sucursal código' ? columnWidth+5 : columnWidth;
         columnWidth=headers[i]=='Sucursal nombre' ? columnWidth+45: columnWidth;        
         columnWidth=headers[i]=='Empleado nombre' ? columnWidth+45: columnWidth;        
         columnWidth=headers[i]=='Empleado correo' ? columnWidth+45: columnWidth;
         columnWidth=headers[i]=='Modelo' ? columnWidth+10: columnWidth;        
         columnWidth=headers[i]=='Color' ? columnWidth+10: columnWidth;        
         columnWidth=headers[i]=='Etiqueta' ? columnWidth+20: columnWidth;        
         columnWidth=headers[i]=='Tiempo' ? columnWidth+5: columnWidth;        
         columnWidth=headers[i]=='Costo' ? columnWidth+5: columnWidth;
         columnWidth=headers[i]=='Tipo de pago' ? columnWidth+20: columnWidth;        
        
         wscols.push({ wch: columnWidth })
     } 
    wb.Sheets['Rentas']['!cols']=wscols;
    //console.log("Final Workbook: ",wb.Sheets["Products_vendidos"])
    let row = 8;
    while (wb.Sheets['Rentas']["G"+String(row)] != null) { 
        wb.Sheets['Rentas']["K"+String(row)].z="0.00";
        wb.Sheets['Rentas']["L"+String(row)].z="$0.00";
        row+=1;
        
    }

    let buf = XLSXStyle.write(wb, { type: "buffer" });

    reply.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    reply.header("Content-Disposition", 'attachment; filename="Rentas.xlsx"');
    return reply.send(buf); 

}

const salesReport = async function (req, reply){    
    let aggregateQuery=[];
    let offset = await getOffsetSetting()

    if(req.query.branchId != null){
        let branchId = mongoose.Types.ObjectId(req.query.branchId)
        aggregateQuery.push({ "$match": {"branchId": branchId }});        
    }

    if(req.query.employeeId != null){
        let employeeId = mongoose.Types.ObjectId(req.query.employeeId)
        aggregateQuery.push({ "$match": {"userId": employeeId }});        
    }

    let dateMatchStage={};
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
        dateMatchStage['$match']={'balanceDate': {"$gte": initialDay,"$lte":finalDay}} }
        
    if (req.query.initialDate!=null && req.query.finalDate==null){        
        let initialDay=new Date(req.query.initialDate);
        dateMatchStage['$match']={'balanceDate': {"$gte": initialDay}} 
    }
    
    if (req.query.finalDate!=null && req.query.initialDate==null){
        let finalDay= addDays(req.query.finalDate,1)
        dateMatchStage['$match']={'balanceDate': {"$gte": finalDay}} 
        }

    if(dateMatchStage['$match']!=null){
        aggregateQuery.push(dateMatchStage)
    }

    
    // if (req.query.initialDate != null && req.query.lastDate != null){
    //     let initialDate = parseDate(req.query.initialDate);
    //     //let offset = await getOffsetSetting();              
    //     //let offset = req.headers.offset ? Number(req.headers.offset) : 6        

    //     //initialDate.setHours(0,0,0,0);
    //     let lastDate = parseDate(req.query.lastDate);
    //     lastDate = addDays(lastDate, 1)
    //     if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
    //         initialDate.setHours(offset,0,0,0);    
    //         lastDate.setHours(offset, 0, 0, 0);
    //     }
    //     else{
    //         initialDate.setHours(0,0,0,0);
    //         lastDate.setHours(0, 0, 0, 0);
    
    //     }
    //     aggregateQuery.push({ "$match": {"createdAt": {"$gte": initialDate,"$lte":lastDate}}});        
    // }   
         
      
    aggregateQuery.push(
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
            '$project': {
                'Folio':'$folio',
                'Sucursal código':{
                    '$first': '$branchInfo.code'
                },
                'Sucursal nombre': {
                    '$first': '$branchInfo.name'
                
                },
                'Empleado nombre':{
                    '$first': '$employeeInfo.fullName'
                },
                'Empleado correo': {
                    '$first': '$employeeInfo.email'
                
                },
                'Modelos diferentes':{'$size': "$products"},
                'Carritos totales':{'$sum': "$products.quantity"},
                "Total venta":"$totalSale",                
                "createdAt":'$createdAt'                               
                
            }
          } 
        //   {
        //     '$group': {
        //       '_id': '$_id', 
        //       'count': {
        //         '$sum': 1
        //       }
        //     }
        //   }
    )

    let sales = await Sale.aggregate(aggregateQuery);
    let allPayments = await Payment.find({isDeleted:false, isDiscarded:false});    
    //("sales: ", sales[0]);    
    sales.forEach(sale=>{        
        let salePayment = allPayments.find(payment=>{
            return String(payment.saleId) == sale._id
        })

        if(sale.createdAt){            
            sale.createdAt = adjustTimeStamp (sale.createdAt,offset);
            sale.Fecha=dateDDMMAAAA(sale.createdAt);            
            sale.Hora=dateTimeHHSS(sale.createdAt);  
            
        }
        sale['Tipo de pago']=salePayment && salePayment.paymentType ? salePayment.paymentType :"";
        
    })

    //console.log("sales DATE ADJUSTED: ", sales[0]);
    
   

    // if (sales.length==0){
    //     let emptyPurchaseObj = {
    //         'Nombre': '', 
    //         'Habilitado general':'',
    //         'Cantidad de ventas':''            
    //     }
    //     sales.push(emptyPurchaseObj)
    // }
   	
    let headers=[]; //created array for column names
    let wscols=[]; //array to store the width of the columns
    // create the export file
    //
    let wb = xlsx.utils.book_new();
    wb.Props = {
        Title: "Ventas",                
    };
    //let wbRows = sales.length+4;   
    wb.SheetNames.push("Ventas");
    //addig the titles rows
    var ws_data = [['Sucursal','','','','','','','','','','','','','']]
    var ws = xlsx.utils.aoa_to_sheet(ws_data);       
    wb.Sheets["Ventas"] = ws;
    wb.Sheets["Ventas"]["A1"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            },       
    }
    xlsx.utils.sheet_add_aoa(wb.Sheets["Ventas"], [
            ['Etiqueta', '', '', '','','','','','','','','','','']
          ],{origin: -1});
    wb.Sheets["Ventas"]["A2"].s={        
        font: {				  		
                sz: 12, // tamaño de fuente
                bold: true // negrita
        },       
    }

    xlsx.utils.sheet_add_aoa(wb.Sheets["Ventas"], [
        ['Empleado', '', '', '','','','','','','','','','','']
      ],{origin: -1});
    wb.Sheets["Ventas"]["A3"].s={        
        font: {				  		
            sz: 12, // tamaño de fuente
            bold: true // negrita
        },       
    }
    
    if(req.query.initialDate != null && req.query.lastDate !=null ){        
        xlsx.utils.sheet_add_aoa(wb.Sheets["Ventas"], [
            ['Fecha inicial', '', '', '','','','','','','','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Ventas"], [
            ['Fecha final', '', '', '','','','','','','','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Ventas"], [
            ['', '', '', '','','','','','','','','','','']
          ], {origin: -1});

        wb.Sheets["Ventas"]["A4"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            }               
        }
        wb.Sheets["Ventas"]["A5"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            }               
        }
    }
    else{
        xlsx.utils.sheet_add_aoa(wb.Sheets["Ventas"], [
            ['Sin rango de fechas', '', '', '','','','','','','','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Ventas"], [
            ['', '', '', '','','','','','','','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Ventas"], [
            ['', '', '', '','','','','','','','','','','']
          ], {origin: -1});
        wb.Sheets["Ventas"]["A4"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            }               
        }
    }

    xlsx.utils.sheet_add_aoa(wb.Sheets["Ventas"], [
        ['Folio','Fecha','Hora','Sucursal código','Sucursal nombre','Empleado nombre','Empleado correo','Modelos diferentes','Carritos totales','Total venta','Tipo de pago']
      ], {origin: -1});
    
    wb.Sheets["Ventas"]["A7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Ventas"]["B7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Ventas"]["C7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Ventas"]["D7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Ventas"]["E7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Ventas"]["F7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Ventas"]["G7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Ventas"]["H7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Ventas"]["I7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Ventas"]["J7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Ventas"]["K7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    // wb.Sheets["Ventas"]["L7"].s={        
    //     font: {				  		
    //           sz: 12, // tamaño de fuente
    //           bold: true // negrita
    //     }               
    // }
    // wb.Sheets["Ventas"]["M7"].s={        
    //     font: {				  		
    //           sz: 12, // tamaño de fuente
    //           bold: true // negrita
    //     }               
    // }

    // wb.Sheets["Ventas"]["N7"].s={        
    //     font: {				  		
    //           sz: 12, // tamaño de fuente
    //           bold: true // negrita
    //     }               
    // }

//     wb.Sheets={
//         Ventas:{
//         }
//     }
//     wb.Sheets["Ventas"]["A1"]={
//         v:'Sucursal',
//         s: 
//         {				
//             font: {				  		
//                   sz: 12, // tamaño de fuente
//                   bold: true // negrita
//             },
//         }
//     }
    
//     wb.Sheets["Ventas"]["B1"]={};


    if(req.query.branchId != null){
        let branchInformation = await Branch.findOne({_id:req.query.branchId}) 
        wb.Sheets["Ventas"]["B1"].v= branchInformation!=null ? branchInformation.code+"-"+branchInformation.name : "";
        wb.Sheets["Ventas"]["B1"].s ={
            font:{
                bold:false
            }
        }
        //console.log(wb.Sheets["Ventas"]["B1"].v)        
    }
    else{
        wb.Sheets["Ventas"]["B1"].v="Todas"
        wb.Sheets["Ventas"]["B1"].s ={
            font:{
                bold:false
            }
        }
    }

    // if(req.query.carId != null){
    //     let carInformation = await Car.findOne({_id:req.query.carId}) 
    //     wb.Sheets["Ventas"]["B2"].v= carInformation!=null ? carInformation.name+"-"+carInformation.color : "";
    //     wb.Sheets["Ventas"]["B2"].s ={
    //         font:{
    //             bold:false
    //         }
    //     }
    //     //console.log(wb.Sheets["Ventas"]["B1"].v)        
    // }
    //else{
        wb.Sheets["Ventas"]["B2"].v="Todos"
        wb.Sheets["Ventas"]["B2"].s ={
            font:{
                bold:false
            }
        }
    //}

    if(req.query.userId != null){
        let userInformation = await User.findOne({_id:req.query.userId}) 
        wb.Sheets["Ventas"]["B3"].v= userInformation!=null ? userInformation.fullName+" - "+userInformation.email : "";
        wb.Sheets["Ventas"]["B3"].s ={
            font:{
                bold:false
            }
        }
        //console.log(wb.Sheets["Ventas"]["B1"].v)        
    }
    else{
        wb.Sheets["Ventas"]["B3"].v="Todos"
        wb.Sheets["Ventas"]["B3"].s ={
            font:{
                bold:false
            }
        }
    }
//     wb.Sheets["Ventas"]["A2"]={};
    if(req.query.initialDate != null && req.query.lastDate !=null ){ 
        let initialDate = parseDate(req.query.initialDate);
        let offset = req.headers.offset ? Number(req.headers.offset) : 6        
        let lastDate = parseDate(req.query.lastDate);

        if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
            initialDate.setHours(offset,0,0,0);    
            lastDate.setHours(offset, 0, 0, 0);
        }
        else{
            initialDate.setHours(0,0,0,0);
            lastDate.setHours(0, 0, 0, 0);
    
        }      
        wb.Sheets["Ventas"]["B2"].v=dateDDMMAAAA(initialDate).substring(0,11);
        wb.Sheets["Ventas"]["B3"].v=dateDDMMAAAA(lastDate).substring(0,11);
    }
    if (sales.length>0){
        for (let index = 0; index < sales.length; index++) {
            xlsx.utils.sheet_add_aoa(wb.Sheets["Ventas"], [
                ['A', 'B','C','D','E','F','G',0,0,0,'K']
              ], {origin: -1});                     
        }
        let currentRow=8;
        sales.forEach(purchase=>{
            wb.Sheets["Ventas"]["A"+String(currentRow)].v=purchase['Folio'];
            wb.Sheets["Ventas"]["B"+String(currentRow)].v=purchase['Fecha'];
            wb.Sheets["Ventas"]["C"+String(currentRow)].v=purchase['Hora'];
            wb.Sheets["Ventas"]["D"+String(currentRow)].v=purchase['Sucursal código'];
            wb.Sheets["Ventas"]["E"+String(currentRow)].v=purchase['Sucursal nombre'];
            wb.Sheets["Ventas"]["F"+String(currentRow)].v=purchase['Empleado nombre'];
            wb.Sheets["Ventas"]["G"+String(currentRow)].v=purchase['Empleado correo'];
            wb.Sheets["Ventas"]["H"+String(currentRow)].v=purchase['Modelos diferentes'];
            wb.Sheets["Ventas"]["I"+String(currentRow)].v=purchase['Carritos totales'];
            wb.Sheets["Ventas"]["J"+String(currentRow)].v=purchase['Total venta'];
            wb.Sheets["Ventas"]["K"+String(currentRow)].v=purchase['Tipo de pago'];
            // wb.Sheets["Ventas"]["L"+String(currentRow)].v=purchase['Pagos descartados'];            
            // wb.Sheets["Ventas"]["M"+String(currentRow)].v=purchase['Total pagado'];            
            // wb.Sheets["Ventas"]["N"+String(currentRow)].v=purchase['Saldo restante'];            
            currentRow ++;
           // ['Nombre','Habilitado general','Código','Descripción','Precio unitario','Cantidad de ventas','Importe total']


        })
    }

     headers=["Folio","Fecha","Hora","Sucursal código","Sucursal nombre","Empleado nombre","Empleado correo","Modelos diferentes","Carritos totales","Total venta","Pagos sin descartar","Pagos descartados","Total pagado","Saldo restante"]
     //console.log(headers)

    // adjusting columns length added
     for (let i = 0; i < headers.length; i++) {  
         let columnWidth=headers[i].length;
         columnWidth=headers[i]=='Folio' ? columnWidth+20 : columnWidth;
         columnWidth=headers[i]=='Fecha' ? columnWidth+15 : columnWidth;
         columnWidth=headers[i]=='Hora' ? columnWidth+7 : columnWidth;
         columnWidth=headers[i]=='Sucursal código' ? columnWidth+5 : columnWidth;
         columnWidth=headers[i]=='Sucursal nombre' ? columnWidth+45: columnWidth;        
         columnWidth=headers[i]=='Empleado nombre' ? columnWidth+45: columnWidth;        
         columnWidth=headers[i]=='Empleado correo' ? columnWidth+15: columnWidth;
         columnWidth=headers[i]=='Total venta' ? columnWidth+15: columnWidth;
        //  columnWidth=headers[i]=='Modelo' ? columnWidth+10: columnWidth;        
        //  columnWidth=headers[i]=='Color' ? columnWidth+10: columnWidth;        
        //  columnWidth=headers[i]=='Etiqueta' ? columnWidth+20: columnWidth;        
        //  columnWidth=headers[i]=='Tiempo' ? columnWidth+5: columnWidth;        
        //  columnWidth=headers[i]=='Costo' ? columnWidth+5: columnWidth;
        //  columnWidth=headers[i]=='Tipo de pago' ? columnWidth+20: columnWidth;        
        
         wscols.push({ wch: columnWidth })
     } 
    wb.Sheets['Ventas']['!cols']=wscols;
    //console.log("Final Workbook: ",wb.Sheets["Products_vendidos"])
    let row = 8;
    while (wb.Sheets['Ventas']["G"+String(row)] != null) { 
        wb.Sheets['Ventas']["J"+String(row)].z="$0.00";
        // wb.Sheets['Ventas']["K"+String(row)].z="0.00";
        // wb.Sheets['Ventas']["L"+String(row)].z="0.00";
        // wb.Sheets['Ventas']["M"+String(row)].z="$0.00";
        // wb.Sheets['Ventas']["N"+String(row)].z="$0.00";
        row+=1;
        
    }

    let buf = XLSXStyle.write(wb, { type: "buffer" });

    reply.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    reply.header("Content-Disposition", 'attachment; filename="Ventas.xlsx"');
    return reply.send(buf); 

}
const reservesReport = async function (req, reply){    
    let aggregateQuery=[];
    let offset = await getOffsetSetting()

    if(req.query.branchId != null){
        let branchId = mongoose.Types.ObjectId(req.query.branchId)
        aggregateQuery.push({ "$match": {"branchId": branchId }});        
    }

    if(req.query.employeeId != null){
        let employeeId = mongoose.Types.ObjectId(req.query.employeeId)
        aggregateQuery.push({ "$match": {"userId": employeeId }});        
    }

    if(req.query.isDelivered!=null && req.query.isDelivered!=""){        
        if(req.query.isDelivered.toLowerCase()=="true"){
            aggregateQuery.push({ "$match": {"isDelivered": true }});
        }
        if(req.query.isDelivered.toLowerCase()=="false"){
            aggregateQuery.push({ "$match": {"isDelivered": false }});
        }
        
    }

    if(req.query.isCancelled!=null && req.query.isCancelled!=""){        
        if(req.query.isCancelled.toLowerCase()=="true"){
            aggregateQuery.push({ "$match": {"isCancelled": true }});
        }
        if(req.query.isCancelled.toLowerCase()=="false"){
            aggregateQuery.push({ "$match": {"isDelivered": false }});
        }        
    }

    if(req.query.isPaid!=null && req.query.isPaid!=""){        
        if(req.query.isPaid.toLowerCase()=="true"){
            aggregateQuery.push({ "$match": {"isPaid": true }});
        }
        if(req.query.isPaid.toLowerCase()=="false"){
            aggregateQuery.push({ "$match": {"isPaid": true }});
        }        
    }

    let dateMatchStage={};
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
        dateMatchStage['$match']={'createdAt': {"$gte": initialDay,"$lte":finalDay}} }
        
    if (req.query.initialDate!=null && req.query.finalDate==null){        
        let initialDay=new Date(req.query.initialDate);
        dateMatchStage['$match']={'createdAt': {"$gte": initialDay}} 
    }
    
    if (req.query.finalDate!=null && req.query.initialDate==null){
        let finalDay= addDays(req.query.finalDate,1)
        dateMatchStage['$match']={'createdAt': {"$gte": finalDay}} 
    }

    

    

    if(dateMatchStage['$match']!=null){
        aggregateQuery.push(dateMatchStage)
    }

    
    // if (req.query.initialDate != null && req.query.lastDate != null){
    //     let initialDate = parseDate(req.query.initialDate);
    //     //let offset = await getOffsetSetting();              
    //     //let offset = req.headers.offset ? Number(req.headers.offset) : 6        

    //     //initialDate.setHours(0,0,0,0);
    //     let lastDate = parseDate(req.query.lastDate);
    //     lastDate = addDays(lastDate, 1)
    //     if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
    //         initialDate.setHours(offset,0,0,0);    
    //         lastDate.setHours(offset, 0, 0, 0);
    //     }
    //     else{
    //         initialDate.setHours(0,0,0,0);
    //         lastDate.setHours(0, 0, 0, 0);
    
    //     }
    //     aggregateQuery.push({ "$match": {"createdAt": {"$gte": initialDate,"$lte":lastDate}}});        
    // }   
         
      
    aggregateQuery.push(
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
            '$project': {                
                'Folio':'$folio',
                'Cancelado':'$isCancelled',
                'Entregado':'$isDelivered',
                'Liquidado':'$isPaid',
                'Sucursal código':{
                    '$first': '$branchInfo.code'
                },
                'Sucursal nombre': {
                    '$first': '$branchInfo.name'
                
                },
                'Empleado nombre':{
                    '$first': '$employeeInfo.fullName'
                },
                'Empleado correo': {
                    '$first': '$employeeInfo.email'
                
                },
                'Modelos diferentes':{'$size': "$products"},
                'Carritos totales':{'$sum': "$products.quantity"},
                "Total apartado":"$totalSale", 
                "Cancellation":'$cancellationReason',
                "createdAt":'$createdAt'                               
                
            }
          } 
        //   {
        //     '$group': {
        //       '_id': '$_id', 
        //       'count': {
        //         '$sum': 1
        //       }
        //     }
        //   }
    )

    let reserves = await Reserve.aggregate(aggregateQuery);
    let allPayments = await Payment.find({operationType:'reserve', isDeleted:false});    
    //console.log("reserves: ", reserves[0]);    
    reserves.forEach(reserve=>{        
        let reservePayments = allPayments.filter(payment=>{
            return String(payment.reserveId) == String(reserve._id) && payment.isDiscarded==false;
        })

        let reserveDiscardedPayments = allPayments.filter(payment=>{
            return String(payment.reserveId) == String(reserve._id) && payment.isDiscarded==true;
        })

        reserve['Pagos actuales']=reservePayments.length;
        reserve['Total pagado']=0;
        reserve['Pagos cancelados']=reserveDiscardedPayments.length;

        reservePayments.forEach(payment=>{
            reserve['Total pagado']+=payment.amount
        })

        reserve['Saldo restante']=reserve['Total apartado']-reserve['Total pagado'];
        reserve.Cancelado  = reserve.Cancelado == true ? 'Si' :'No'
        reserve.Liquidado  = reserve.Liquidado == true ? 'Si' :'No'
        reserve.Entregado  = reserve.Entregado == true ? 'Si' :'No'

        if(reserve.createdAt){            
            reserve.createdAt = adjustTimeStamp (reserve.createdAt,offset);
            reserve.Fecha=dateDDMMAAAA(reserve.createdAt);            
            reserve.Hora=dateTimeHHSS(reserve.createdAt);  
            
        }
        
        
    })

    //console.log("reserves DATE ADJUSTED: ", reserves[0]);
    
   

    // if (reserves.length==0){
    //     let emptyPurchaseObj = {
    //         'Nombre': '', 
    //         'Habilitado general':'',
    //         'Cantidad de ventas':''            
    //     }
    //     reserves.push(emptyPurchaseObj)
    // }
   	
    let headers=[]; //created array for column names
    let wscols=[]; //array to store the width of the columns
    // create the export file
    //
    let wb = xlsx.utils.book_new();
    wb.Props = {
        Title: "Apartados",                
    };
    //let wbRows = reserves.length+4;   
    wb.SheetNames.push("Apartados");
    //addig the titles rows
    var ws_data = [['Sucursal','','','','','','','','','','','','','','','','','']]
    var ws = xlsx.utils.aoa_to_sheet(ws_data);       
    wb.Sheets["Apartados"] = ws;
    wb.Sheets["Apartados"]["A1"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            },       
    }
    xlsx.utils.sheet_add_aoa(wb.Sheets["Apartados"], [
            ['Empleado', '', '', '','','','','','','','','','','','','','','']
          ],{origin: -1});
    wb.Sheets["Apartados"]["A2"].s={        
        font: {				  		
                sz: 12, // tamaño de fuente
                bold: true // negrita
        },       
    }

    xlsx.utils.sheet_add_aoa(wb.Sheets["Apartados"], [
        ['¿Entregados?', '', '', '','','','','','','','','','','','','','','']
      ],{origin: -1});
    wb.Sheets["Apartados"]["A3"].s={        
        font: {				  		
            sz: 12, // tamaño de fuente
            bold: true // negrita
        },       
    }

    xlsx.utils.sheet_add_aoa(wb.Sheets["Apartados"], [
        ['¿Liquidados?', '', '', '','','','','','','','','','','','','','','']
      ],{origin: -1});
    wb.Sheets["Apartados"]["A4"].s={        
        font: {				  		
            sz: 12, // tamaño de fuente
            bold: true // negrita
        },       
    }

    xlsx.utils.sheet_add_aoa(wb.Sheets["Apartados"], [
        ['¿Cancelados?', '', '', '','','','','','','','','','','','','','','']
      ],{origin: -1});
    wb.Sheets["Apartados"]["A5"].s={        
        font: {				  		
            sz: 12, // tamaño de fuente
            bold: true // negrita
        },       
    }
    // xlsx.utils.sheet_add_aoa(wb.Sheets["Apartados"], [
    //     ['Cancelados', '', '', '','','','','','','','','','','','','','','']
    //   ],{origin: -1});
    // wb.Sheets["Apartados"]["A5"].s={        
    //     font: {				  		
    //         sz: 12, // tamaño de fuente
    //         bold: true // negrita
    //     },       
    // }

    
    if(req.query.initialDate != null && req.query.lastDate !=null ){        
        xlsx.utils.sheet_add_aoa(wb.Sheets["Apartados"], [
            ['Fecha inicial', '', '', '','','','','','','','','','','','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Apartados"], [
            ['Fecha final', '', '', '','','','','','','','','','','','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Apartados"], [
            ['', '', '', '','','','','','','','','','','','','','','']
          ], {origin: -1});

        wb.Sheets["Apartados"]["A6"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            }               
        }
        wb.Sheets["Apartados"]["A6"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            }               
        }
    }
    else{
        xlsx.utils.sheet_add_aoa(wb.Sheets["Apartados"], [
            ['Sin rango de fechas', '', '', '','','','','','','','','','','','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Apartados"], [
            ['', '', '', '','','','','','','','','','','','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Apartados"], [
            ['', '', '', '','','','','','','','','','','','','','','']
          ], {origin: -1});
        wb.Sheets["Apartados"]["A6"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            }               
        }
    }


    

    xlsx.utils.sheet_add_aoa(wb.Sheets["Apartados"], [
        ['Folio','Fecha','Hora','Entregado','Sucursal código','Sucursal nombre','Empleado nombre','Empleado correo','Modelos diferentes','Carritos totales','Total apartado','Pagos actuales','Pagos cancelados','Total pagado','Saldo restante','Liquidado','Cancelado','Motivo de cancelación']
      ], {origin: -1});
    
    wb.Sheets["Apartados"]["A9"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Apartados"]["B9"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Apartados"]["C9"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Apartados"]["D9"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Apartados"]["E9"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Apartados"]["F9"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Apartados"]["G9"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Apartados"]["H9"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Apartados"]["I9"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Apartados"]["J9"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Apartados"]["K9"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Apartados"]["L9"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Apartados"]["M9"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }

    wb.Sheets["Apartados"]["N9"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Apartados"]["O9"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Apartados"]["P9"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Apartados"]["Q9"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Apartados"]["R9"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    // wb.Sheets["Apartados"]["S8"].s={        
    //     font: {				  		
    //           sz: 12, // tamaño de fuente
    //           bold: true // negrita
    //     }               
    // }

//     wb.Sheets={
//         Apartados:{
//         }
//     }
//     wb.Sheets["Apartados"]["A1"]={
//         v:'Sucursal',
//         s: 
//         {				
//             font: {				  		
//                   sz: 12, // tamaño de fuente
//                   bold: true // negrita
//             },
//         }
//     }
    
//     wb.Sheets["Apartados"]["B1"]={};


    if(req.query.branchId != null){
        let branchInformation = await Branch.findOne({_id:req.query.branchId}) 
        wb.Sheets["Apartados"]["B1"].v= branchInformation!=null ? branchInformation.code+"-"+branchInformation.name : "";
        wb.Sheets["Apartados"]["B1"].s ={
            font:{
                bold:false
            }
        }
        //console.log(wb.Sheets["Apartados"]["B1"].v)        
    }
    else{
        wb.Sheets["Apartados"]["B1"].v="Todas"
        wb.Sheets["Apartados"]["B1"].s ={
            font:{
                bold:false
            }
        }
    }

    if(req.query.employeeId != null){
        let employeeInformation = await User.findOne({_id:req.query.employeeId}) 
        wb.Sheets["Apartados"]["B2"].v= employeeInformation!=null ? employeeInformation.fullName : "";
        wb.Sheets["Apartados"]["B2"].s ={
            font:{
                bold:false
            }
        }
        //console.log(wb.Sheets["Apartados"]["B1"].v)        
    }
    else{
        wb.Sheets["Apartados"]["B2"].v="Todos"
        wb.Sheets["Apartados"]["B2"].s ={
            font:{
                bold:false
            }
        }
    }
    

    if(req.query.isDelivered != null && req.query.isDelivered != ""){
        if(req.query.isDelivered.toLowerCase()=="true"){
            wb.Sheets["Apartados"]["B3"].v= "Si"
        }        
        if(req.query.isDelivered.toLowerCase()=="false"){
            wb.Sheets["Apartados"]["B3"].v= "No"
        }        
        
        wb.Sheets["Apartados"]["B3"].s ={
            font:{
                bold:false
            }
        }
        //console.log(wb.Sheets["Apartados"]["B1"].v)        
    }
    else{
        wb.Sheets["Apartados"]["B3"].v="Todos"
        wb.Sheets["Apartados"]["B3"].s ={
            font:{
                bold:false
            }
        }
    }

    if(req.query.isPaid != null && req.query.isPaid != ""){
        if(req.query.isPaid.toLowerCase()=="true"){
            wb.Sheets["Apartados"]["B4"].v= "Si"
        }        
        if(req.query.isPaid.toLowerCase()=="false"){
            wb.Sheets["Apartados"]["B4"].v= "No"
        }       
        
        wb.Sheets["Apartados"]["B4"].s ={
            font:{
                bold:false
            }
        }
        //console.log(wb.Sheets["Apartados"]["B1"].v)        
    }
    else{
        wb.Sheets["Apartados"]["B4"].v="Todos"
        wb.Sheets["Apartados"]["B4"].s ={
            font:{
                bold:false
            }
        }
    }

    if(req.query.isCancelled != null && req.query.isCancelled != ""){
        if(req.query.isCancelled.toLowerCase()=="true"){
            wb.Sheets["Apartados"]["B5"].v= "Si"
        }        
        if(req.query.isCancelled.toLowerCase()=="false"){
            wb.Sheets["Apartados"]["B5"].v= "No"
        }       
        
        wb.Sheets["Apartados"]["B5"].s ={
            font:{
                bold:false
            }
        }
        //console.log(wb.Sheets["Apartados"]["B1"].v)        
    }
    else{
        wb.Sheets["Apartados"]["B5"].v="Todos"
        wb.Sheets["Apartados"]["B5"].s ={
            font:{
                bold:false
            }
        }
    }
//     wb.Sheets["Apartados"]["A2"]={};
    if(req.query.initialDate != null && req.query.lastDate !=null ){ 
        let initialDate = parseDate(req.query.initialDate);
        let offset = req.headers.offset ? Number(req.headers.offset) : 6        
        let lastDate = parseDate(req.query.lastDate);

        if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
            initialDate.setHours(offset,0,0,0);    
            lastDate.setHours(offset, 0, 0, 0);
        }
        else{
            initialDate.setHours(0,0,0,0);
            lastDate.setHours(0, 0, 0, 0);
    
        }      
        wb.Sheets["Apartados"]["B6"].v=dateDDMMAAAA(initialDate).substring(0,11);
        wb.Sheets["Apartados"]["B6"].v=dateDDMMAAAA(lastDate).substring(0,11);
    }  
    
    if (reserves.length>0){
        for (let index = 0; index < reserves.length; index++) {
            xlsx.utils.sheet_add_aoa(wb.Sheets["Apartados"], [
                ['A','B','C','D','E','F','G','H',0,0,0,0,0,0,0,'P','Q','R']
              ], {origin: -1});                     
        }
        
        let currentRow=10;
        reserves.forEach(purchase=>{
            wb.Sheets["Apartados"]["A"+String(currentRow)].v=purchase['Folio'];
            wb.Sheets["Apartados"]["B"+String(currentRow)].v=purchase['Fecha'];
            wb.Sheets["Apartados"]["C"+String(currentRow)].v=purchase['Hora'];
            wb.Sheets["Apartados"]["D"+String(currentRow)].v=purchase['Entregado'];
            wb.Sheets["Apartados"]["E"+String(currentRow)].v=purchase['Sucursal código'];
            wb.Sheets["Apartados"]["F"+String(currentRow)].v=purchase['Sucursal nombre'];
            wb.Sheets["Apartados"]["G"+String(currentRow)].v=purchase['Empleado nombre'];
            wb.Sheets["Apartados"]["H"+String(currentRow)].v=purchase['Empleado correo'];
            wb.Sheets["Apartados"]["I"+String(currentRow)].v=purchase['Modelos diferentes'];
            wb.Sheets["Apartados"]["J"+String(currentRow)].v=purchase['Carritos totales'];
            wb.Sheets["Apartados"]["K"+String(currentRow)].v=purchase['Total apartado'];
            wb.Sheets["Apartados"]["L"+String(currentRow)].v=purchase['Pagos actuales'];
            wb.Sheets["Apartados"]["M"+String(currentRow)].v=purchase['Pagos cancelados'];            
            wb.Sheets["Apartados"]["N"+String(currentRow)].v=purchase['Total pagado'];            
            wb.Sheets["Apartados"]["O"+String(currentRow)].v=purchase['Saldo restante'];            
            wb.Sheets["Apartados"]["P"+String(currentRow)].v=purchase['Liquidado'];            
            wb.Sheets["Apartados"]["Q"+String(currentRow)].v=purchase['Cancelado'];            
            wb.Sheets["Apartados"]["R"+String(currentRow)].v=purchase['Cancellation'];            
            currentRow ++;
           // ['Nombre','Habilitado general','Código','Descripción','Precio unitario','Cantidad de Apartados','Importe total']


        })
    }

     headers=['Folio','Fecha','Hora','Entregado','Sucursal código','Sucursal nombre','Empleado nombre','Empleado correo','Modelos diferentes','Carritos totales','Total apartado','Pagos actuales','Pagos cancelados','Total pagado','Saldo restante','Liquidado','Cancelado','Motivo de cancelación']
     //console.log(headers)

    // adjusting columns length added
     for (let i = 0; i < headers.length; i++) {  
         let columnWidth=headers[i].length;
         columnWidth=headers[i]=='Folio' ? columnWidth+20 : columnWidth;
         columnWidth=headers[i]=='Fecha' ? columnWidth+15 : columnWidth;
         columnWidth=headers[i]=='Hora' ? columnWidth+7 : columnWidth;
         columnWidth=headers[i]=='Sucursal código' ? columnWidth+5 : columnWidth;
         columnWidth=headers[i]=='Sucursal nombre' ? columnWidth+45: columnWidth;        
         columnWidth=headers[i]=='Empleado nombre' ? columnWidth+45: columnWidth;        
         columnWidth=headers[i]=='Empleado correo' ? columnWidth+15: columnWidth;
         columnWidth=headers[i]=='Total apartado' ? columnWidth+15: columnWidth;
        //  columnWidth=headers[i]=='Modelo' ? columnWidth+10: columnWidth;        
        //  columnWidth=headers[i]=='Color' ? columnWidth+10: columnWidth;        
        //  columnWidth=headers[i]=='Etiqueta' ? columnWidth+20: columnWidth;        
        //  columnWidth=headers[i]=='Tiempo' ? columnWidth+5: columnWidth;        
        //  columnWidth=headers[i]=='Costo' ? columnWidth+5: columnWidth;
        //  columnWidth=headers[i]=='Tipo de pago' ? columnWidth+20: columnWidth;        
        
         wscols.push({ wch: columnWidth })
     } 
    wb.Sheets['Apartados']['!cols']=wscols;
    //console.log("Final Workbook: ",wb.Sheets["Products_vendidos"])
    let row = 10;
    while (wb.Sheets['Apartados']["I"+String(row)] != null) { 
        wb.Sheets['Apartados']["I"+String(row)].z="0";
        wb.Sheets['Apartados']["J"+String(row)].z="0";
        wb.Sheets['Apartados']["K"+String(row)].z="$0.00";
        wb.Sheets['Apartados']["L"+String(row)].z="0";
        wb.Sheets['Apartados']["M"+String(row)].z="0";
        wb.Sheets['Apartados']["N"+String(row)].z="$0.00";
        wb.Sheets['Apartados']["O"+String(row)].z="$0.00";
        row+=1;
        
    }

    let buf = XLSXStyle.write(wb, { type: "buffer" });

    reply.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    reply.header("Content-Disposition", 'attachment; filename="Apartados.xlsx"');
    return reply.send(buf); 

}

const balancesReport = async function (req, reply){    
    let aggregateQuery=[];
    let offset = await getOffsetSetting()

    if(req.query.branchId != null){
        let branchId = mongoose.Types.ObjectId(req.query.branchId)
        aggregateQuery.push({ "$match": {"branchId": branchId }});        
    }

    if(req.query.userId != null){
        let userId = mongoose.Types.ObjectId(req.query.userId)
        aggregateQuery.push({ "$match": {"userId": userId }});        
    }

    if(req.query.balanceType != null && req.query.balanceType != ""){
        if(req.query.balanceType.toLowerCase() !='rentals' ||req.query.balanceType.toLowerCase() !='payments'){
            return reply.code(400).send({
                status:'fail',
                message:'El tipo de operación recibido no es válido'
            })

        }
        let operationType = mongoose.Types.ObjectId(req.query.operationType.toLowerCase())
        aggregateQuery.push({ "$match": {"operationType": operationType }});        
    }

    let dateMatchStage={};
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
        dateMatchStage['$match']={'createdAt': {"$gte": initialDay,"$lte":finalDay}} }
        
    if (req.query.initialDate!=null && req.query.finalDate==null){        
        let initialDay=new Date(req.query.initialDate);
        dateMatchStage['$match']={'createdAt': {"$gte": initialDay}} 
    }
    
    if (req.query.finalDate!=null && req.query.initialDate==null){
        let finalDay= addDays(req.query.finalDate,1)
        dateMatchStage['$match']={'createdAt': {"$gte": finalDay}} 
        }

    if(dateMatchStage['$match']!=null){
        aggregateQuery.push(dateMatchStage)
    }

    
    // if (req.query.initialDate != null && req.query.lastDate != null){
    //     let initialDate = parseDate(req.query.initialDate);
    //     //let offset = await getOffsetSetting();              
    //     //let offset = req.headers.offset ? Number(req.headers.offset) : 6        

    //     //initialDate.setHours(0,0,0,0);
    //     let lastDate = parseDate(req.query.lastDate);
    //     lastDate = addDays(lastDate, 1)
    //     if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
    //         initialDate.setHours(offset,0,0,0);    
    //         lastDate.setHours(offset, 0, 0, 0);
    //     }
    //     else{
    //         initialDate.setHours(0,0,0,0);
    //         lastDate.setHours(0, 0, 0, 0);
    
    //     }
    //     aggregateQuery.push({ "$match": {"createdAt": {"$gte": initialDate,"$lte":lastDate}}});        
    // }   
         
      
    aggregateQuery.push(
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
              'localField': 'userId', 
              'foreignField': '_id', 
              'as': 'userInfo'
            }
          },
         {
            '$project': {
                'Folio':'$folio',
                'Tipo':'$balanceType',                
                'Sucursal código':{
                    '$first': '$branchInfo.code'
                },
                'Sucursal nombre': {
                    '$first': '$branchInfo.name'
                
                },
                'Empleado nombre':{
                    '$first': '$userInfo.fullName'
                },
                'Empleado correo': {
                    '$first': '$userInfo.email'                
                },                
                'Cantidad':'$quantity',
                'Monto':'$amount',
                'loginDate':1,
                'balanceDate':1,
                "createdAt":'$createdAt'                               
                
            }
          } 
        //   {
        //     '$group': {
        //       '_id': '$_id', 
        //       'count': {
        //         '$sum': 1
        //       }
        //     }
        //   }
    )

    let balances = await Balance.aggregate(aggregateQuery);        
    balances.forEach(sale=>{               

        if(sale.loginDate){            
            sale.loginDate = adjustTimeStamp (sale.loginDate,offset);
            sale['Fecha de sesión']=dateDDMMAAAA(sale.loginDate);            
            sale['Hora de sesión']=dateTimeHHSS(sale.loginDate);              
        }

        if(sale.balanceDate){            
            sale.balanceDate = adjustTimeStamp (sale.balanceDate,offset);
            sale['Fecha de corte']=dateDDMMAAAA(sale.createdAt);            
            sale['Hora de corte']=dateTimeHHSS(sale.createdAt);              
        } 
        if(sale.Tipo){
            if(sale.Tipo.toLowerCase()=='payments'){
                sale.Tipo = 'Pagos'
            }
            if(sale.Tipo.toLowerCase()=='rentals'){
                sale.Tipo = 'Rentas'
            }
        }
        
    }) 

    //console.log("BALANCES ADJUSTED: ", balances[0]);
  
    // if (balances.length==0){
    //     let emptyPurchaseObj = {
    //         'Nombre': '', 
    //         'Habilitado general':'',
    //         'Cantidad de ventas':''            
    //     }
    //     balances.push(emptyPurchaseObj)
    // }
   	
    let headers=[]; //created array for column names
    let wscols=[]; //array to store the width of the columns
    // create the export file
    //
    let wb = xlsx.utils.book_new();
    wb.Props = {
        Title: "Cortes",                
    };
    //let wbRows = balances.length+4;   
    wb.SheetNames.push("Cortes");
    //addig the titles rows
    var ws_data = [['Sucursal','','','','','','','','','','','','','']]
    var ws = xlsx.utils.aoa_to_sheet(ws_data);       
    wb.Sheets["Cortes"] = ws;
    wb.Sheets["Cortes"]["A1"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            },       
    }
    xlsx.utils.sheet_add_aoa(wb.Sheets["Cortes"], [
            ['Etiqueta', '', '', '','','','','','','','','','','']
          ],{origin: -1});
    wb.Sheets["Cortes"]["A2"].s={        
        font: {				  		
                sz: 12, // tamaño de fuente
                bold: true // negrita
        },       
    }

    xlsx.utils.sheet_add_aoa(wb.Sheets["Cortes"], [
        ['Empleado', '', '', '','','','','','','','','','','']
      ],{origin: -1});
    wb.Sheets["Cortes"]["A3"].s={        
        font: {				  		
            sz: 12, // tamaño de fuente
            bold: true // negrita
        },       
    }
    
    if(req.query.initialDate != null && req.query.lastDate !=null ){        
        xlsx.utils.sheet_add_aoa(wb.Sheets["Cortes"], [
            ['Fecha inicial', '', '', '','','','','','','','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Cortes"], [
            ['Fecha final', '', '', '','','','','','','','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Cortes"], [
            ['', '', '', '','','','','','','','','','','']
          ], {origin: -1});

        wb.Sheets["Cortes"]["A4"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            }               
        }
        wb.Sheets["Cortes"]["A5"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            }               
        }
    }
    else{
        xlsx.utils.sheet_add_aoa(wb.Sheets["Cortes"], [
            ['Sin rango de fechas', '', '', '','','','','','','','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Cortes"], [
            ['', '', '', '','','','','','','','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Cortes"], [
            ['', '', '', '','','','','','','','','','','']
          ], {origin: -1});
        wb.Sheets["Cortes"]["A4"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            }               
        }
    }

    xlsx.utils.sheet_add_aoa(wb.Sheets["Cortes"], [
        ['Folio','Tipo','Fecha de sesión','Hora de sesión','Fecha de corte','Hora de corte','Sucursal código','Sucursal nombre','Empleado nombre','Empleado correo','Cantidad','Monto']
      ], {origin: -1});
    
    wb.Sheets["Cortes"]["A7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Cortes"]["B7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Cortes"]["C7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Cortes"]["D7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Cortes"]["E7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Cortes"]["F7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Cortes"]["G7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Cortes"]["H7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Cortes"]["I7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Cortes"]["J7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Cortes"]["K7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Cortes"]["L7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    // wb.Sheets["Cortes"]["M7"].s={        
    //     font: {				  		
    //           sz: 12, // tamaño de fuente
    //           bold: true // negrita
    //     }               
    // }

    // wb.Sheets["Cortes"]["N7"].s={        
    //     font: {				  		
    //           sz: 12, // tamaño de fuente
    //           bold: true // negrita
    //     }               
    // }

//     wb.Sheets={
//         Cortes:{
//         }
//     }
//     wb.Sheets["Cortes"]["A1"]={
//         v:'Sucursal',
//         s: 
//         {				
//             font: {				  		
//                   sz: 12, // tamaño de fuente
//                   bold: true // negrita
//             },
//         }
//     }
    
//     wb.Sheets["Cortes"]["B1"]={};


    if(req.query.branchId != null){
        let branchInformation = await Branch.findOne({_id:req.query.branchId}) 
        wb.Sheets["Cortes"]["B1"].v= branchInformation!=null ? branchInformation.code+"-"+branchInformation.name : "";
        wb.Sheets["Cortes"]["B1"].s ={
            font:{
                bold:false
            }
        }
        //console.log(wb.Sheets["Cortes"]["B1"].v)        
    }
    else{
        wb.Sheets["Cortes"]["B1"].v="Todas"
        wb.Sheets["Cortes"]["B1"].s ={
            font:{
                bold:false
            }
        }
    }

    // if(req.query.carId != null){
    //     let carInformation = await Car.findOne({_id:req.query.carId}) 
    //     wb.Sheets["Cortes"]["B2"].v= carInformation!=null ? carInformation.name+"-"+carInformation.color : "";
    //     wb.Sheets["Cortes"]["B2"].s ={
    //         font:{
    //             bold:false
    //         }
    //     }
    //     //console.log(wb.Sheets["Cortes"]["B1"].v)        
    // }
    //else{
        wb.Sheets["Cortes"]["B2"].v="Todos"
        wb.Sheets["Cortes"]["B2"].s ={
            font:{
                bold:false
            }
        }
    //}

    if(req.query.userId != null){
        let userInformation = await User.findOne({_id:req.query.userId}) 
        wb.Sheets["Cortes"]["B3"].v= userInformation!=null ? userInformation.fullName+" - "+userInformation.email : "";
        wb.Sheets["Cortes"]["B3"].s ={
            font:{
                bold:false
            }
        }
        //console.log(wb.Sheets["Cortes"]["B1"].v)        
    }
    else{
        wb.Sheets["Cortes"]["B3"].v="Todos"
        wb.Sheets["Cortes"]["B3"].s ={
            font:{
                bold:false
            }
        }
    }
//     wb.Sheets["Cortes"]["A2"]={};
    if(req.query.initialDate != null && req.query.lastDate !=null ){ 
        let initialDate = parseDate(req.query.initialDate);
        let offset = req.headers.offset ? Number(req.headers.offset) : 6        
        let lastDate = parseDate(req.query.lastDate);

        if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
            initialDate.setHours(offset,0,0,0);    
            lastDate.setHours(offset, 0, 0, 0);
        }
        else{
            initialDate.setHours(0,0,0,0);
            lastDate.setHours(0, 0, 0, 0);
    
        }      
        wb.Sheets["Cortes"]["B2"].v=dateDDMMAAAA(initialDate).substring(0,11);
        wb.Sheets["Cortes"]["B3"].v=dateDDMMAAAA(lastDate).substring(0,11);
    }
    if (balances.length>0){
        for (let index = 0; index < balances.length; index++) {
            xlsx.utils.sheet_add_aoa(wb.Sheets["Cortes"], [
                ['A','B','C','D','E','F','G','H','I','J',0,0]
              ], {origin: -1});                     
        }
        let currentRow=8;
        balances.forEach(purchase=>{
            wb.Sheets["Cortes"]["A"+String(currentRow)].v=purchase['Folio'];
            wb.Sheets["Cortes"]["B"+String(currentRow)].v=purchase['Tipo'];
            wb.Sheets["Cortes"]["C"+String(currentRow)].v=purchase['Fecha de sesión'];
            wb.Sheets["Cortes"]["D"+String(currentRow)].v=purchase['Hora de sesión'];
            wb.Sheets["Cortes"]["E"+String(currentRow)].v=purchase['Fecha de corte'];
            wb.Sheets["Cortes"]["F"+String(currentRow)].v=purchase['Hora de corte'];
            wb.Sheets["Cortes"]["G"+String(currentRow)].v=purchase['Sucursal código'];
            wb.Sheets["Cortes"]["H"+String(currentRow)].v=purchase['Sucursal nombre'];
            wb.Sheets["Cortes"]["I"+String(currentRow)].v=purchase['Empleado nombre'];
            wb.Sheets["Cortes"]["J"+String(currentRow)].v=purchase['Empleado correo'];
            wb.Sheets["Cortes"]["K"+String(currentRow)].v=purchase['Cantidad'];
            wb.Sheets["Cortes"]["L"+String(currentRow)].v=purchase['Monto'];            
            // wb.Sheets["Cortes"]["L"+String(currentRow)].v=purchase['Pagos descartados'];            
            // wb.Sheets["Cortes"]["M"+String(currentRow)].v=purchase['Total pagado'];            
            // wb.Sheets["Cortes"]["N"+String(currentRow)].v=purchase['Saldo restante'];            
            currentRow ++;
           // ['Nombre','Habilitado general','Código','Descripción','Precio unitario','Cantidad de ventas','Importe total']


        })
    }

     headers=['Folio','Tipo','Fecha de sesión','Hora de sesión','Fecha de corte','Hora de corte','Sucursal código','Sucursal nombre','Empleado nombre','Empleado correo','Cantidad','Monto']
     //console.log(headers)

    // adjusting columns length added
     for (let i = 0; i < headers.length; i++) {  
         let columnWidth=headers[i].length;
         columnWidth=headers[i]=='Folio' ? columnWidth+25 : columnWidth;         
         columnWidth=headers[i]=='Tipo' ? columnWidth+5 : columnWidth;         
         columnWidth=headers[i]=='Sucursal código' ? columnWidth+5 : columnWidth;
         columnWidth=headers[i]=='Sucursal nombre' ? columnWidth+45: columnWidth;        
         columnWidth=headers[i]=='Empleado nombre' ? columnWidth+45: columnWidth;        
         columnWidth=headers[i]=='Empleado correo' ? columnWidth+15: columnWidth;         
         columnWidth=headers[i]=='Monto' ? columnWidth+15 : columnWidth;         
        //  columnWidth=headers[i]=='Modelo' ? columnWidth+10: columnWidth;        
        //  columnWidth=headers[i]=='Color' ? columnWidth+10: columnWidth;        
        //  columnWidth=headers[i]=='Etiqueta' ? columnWidth+20: columnWidth;        
        //  columnWidth=headers[i]=='Tiempo' ? columnWidth+5: columnWidth;        
        //  columnWidth=headers[i]=='Costo' ? columnWidth+5: columnWidth;
        //  columnWidth=headers[i]=='Tipo de pago' ? columnWidth+20: columnWidth;        
        
         wscols.push({ wch: columnWidth })
     } 
    wb.Sheets['Cortes']['!cols']=wscols;
    //console.log("Final Workbook: ",wb.Sheets["Products_vendidos"])
    let row = 8;
    while (wb.Sheets['Cortes']["K"+String(row)] != null) { 
        wb.Sheets['Cortes']["K"+String(row)].z="0";
        wb.Sheets['Cortes']["L"+String(row)].z="$0.00";
        // wb.Sheets['Cortes']["L"+String(row)].z="0.00";
        // wb.Sheets['Cortes']["M"+String(row)].z="$0.00";
        // wb.Sheets['Cortes']["N"+String(row)].z="$0.00";
        row+=1;
        
    }

    let buf = XLSXStyle.write(wb, { type: "buffer" });

    reply.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    reply.header("Content-Disposition", 'attachment; filename="Cortes.xlsx"');
    return reply.send(buf); 

}

const paymentsReport = async function (req, reply){    
    let aggregateQuery=[];
    let offset = await getOffsetSetting()

    if(req.query.branchId != null){
        let branchId = mongoose.Types.ObjectId(req.query.branchId)
        aggregateQuery.push({ "$match": {"branchId": branchId }});        
    }

    if(req.query.saleId != null){
        let saleId = mongoose.Types.ObjectId(req.query.saleId)
        aggregateQuery.push({ "$match": {"saleId": saleId }});        
    }
    
    if(req.query.reserveId != null){
        let reserveId = mongoose.Types.ObjectId(req.query.reserveId)
        aggregateQuery.push({ "$match": {"reseveId": reserveId }});        
    }

    if(req.query.userId != null){
        let userId = mongoose.Types.ObjectId(req.query.userId)
        aggregateQuery.push({ "$match": {"collectedBy": userId }});        
    }

    if(req.query.balanceType != null && req.query.balanceType != ""){
        if(req.query.balanceType.toLowerCase() !='single' ||req.query.balanceType.toLowerCase() !='reserve'){
            return reply.code(400).send({
                status:'fail',
                message:'El tipo de operación recibido no es válido'
            })

        }
        let operationType = mongoose.Types.ObjectId(req.query.operationType.toLowerCase())
        aggregateQuery.push({ "$match": {"operationType": operationType }});        
    }

    if (req.isDiscarded!=null && req.query.isDiscarded!=""){
        let cancelationFilter = req.isDiscarded.toLowerCase() == "true" ? true : false
        aggregateQuery.push({ "$match": {"isDiscarded": cancelationFilter }});        
    }

    let dateMatchStage={};
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
        dateMatchStage['$match']={'paidOn': {"$gte": initialDay,"$lte":finalDay}} }
        
    if (req.query.initialDate!=null && req.query.finalDate==null){        
        let initialDay=new Date(req.query.initialDate);
        dateMatchStage['$match']={'paidOn': {"$gte": initialDay}} 
    }
    
    if (req.query.finalDate!=null && req.query.initialDate==null){
        let finalDay= addDays(req.query.finalDate,1)
        dateMatchStage['$match']={'paidOn': {"$gte": finalDay}} 
        }

    if(dateMatchStage['$match']!=null){
        aggregateQuery.push(dateMatchStage)
    }         
      
    aggregateQuery.push(
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
              'localField': 'collectedBy', 
              'foreignField': '_id', 
              'as': 'userInfo'
            }
          },
          {
            '$lookup': {
              'from': 'sales', 
              'localField': 'saleId', 
              'foreignField': '_id', 
              'as': 'saleInfo'
            }
          },
          {
            '$lookup': {
              'from': 'reserves', 
              'localField': 'reserveId', 
              'foreignField': '_id', 
              'as': 'reserveInfo'
            }
          },


         {
            '$project': {
                'Tipo folio':'$operationType',                
                'Tipo pago':'$paymentType',
                'Descartado':'$isDiscarded',
                'Sucursal código':{
                    '$first': '$branchInfo.code'
                },
                'Sucursal nombre': {
                    '$first': '$branchInfo.name'
                
                },
                'Empleado nombre':{
                    '$first': '$userInfo.fullName'
                },
                'Empleado correo': {
                    '$first': '$userInfo.email'                
                },
                'saleId.folio':{
                    '$first': '$saleInfo.folio'
                },
                'saleId.total':{
                    '$first': '$saleInfo.totalSale'
                },
                'reserveId.folio':{
                    '$first': '$reserveInfo.folio'
                },
                'reserveId.total':{
                    '$first': '$reserveInfo.totalSale'
                },
                'Monto pago':'$amount',                                
                'paidOn':1,               
                
            }
          } 
        //   {
        //     '$group': {
        //       '_id': '$_id', 
        //       'count': {
        //         '$sum': 1
        //       }
        //     }
        //   }
    )

    let payments = await Payment.aggregate(aggregateQuery);        
    payments.forEach(payment=>{               

        if(payment.paidOn){            
            payment.paidOn = adjustTimeStamp (payment.paidOn,offset);
            payment['Fecha pago']=dateDDMMAAAA(payment.paidOn);            
            payment['Hora pago']=dateTimeHHSS(payment.paidOn);              
        }

        if(payment['Tipo folio']){
            if(payment['Tipo folio'].toLowerCase()=='single'){
                payment['Tipo folio'] = 'Venta'
            }
            if(payment['Tipo folio'].toLowerCase()=='reserve'){
                payment['Tipo folio'] = 'Apartado'
            }
        }

        if(payment.saleId && Object.keys(payment.saleId).length > 0 ){
            payment['Folio venta/apartado']=payment.saleId.folio
            payment['Monto total']=payment.saleId.total

        }
        if(payment.reserveId && Object.keys(payment.reserveId).length > 0){
            payment['Folio venta/apartado']=payment.reserveId.folio
            payment['Monto total']=payment.reserveId.total
        }

        payment.Descartado = payment.Descartado == true ? "Si" :"No"
        
    }) 

    //console.log("payments ADJUSTED: ", payments[0]);
  
    // if (payments.length==0){
    //     let emptyPurchaseObj = {
    //         'Nombre': '', 
    //         'Habilitado general':'',
    //         'Cantidad de ventas':''            
    //     }
    //     payments.push(emptyPurchaseObj)
    // }
   	
    let headers=[]; //created array for column names
    let wscols=[]; //array to store the width of the columns
    // create the export file
    //
    let wb = xlsx.utils.book_new();
    wb.Props = {
        Title: "Pagos",                
    };
    //let wbRows = payments.length+4;   
    wb.SheetNames.push("Pagos");
    //addig the titles rows
    var ws_data = [['Sucursal','','','','','','','','','','','','','']]
    var ws = xlsx.utils.aoa_to_sheet(ws_data);       
    wb.Sheets["Pagos"] = ws;
    wb.Sheets["Pagos"]["A1"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            },       
    }
    xlsx.utils.sheet_add_aoa(wb.Sheets["Pagos"], [
            ['Etiqueta', '', '', '','','','','','','','','','','']
          ],{origin: -1});
    wb.Sheets["Pagos"]["A2"].s={        
        font: {				  		
                sz: 12, // tamaño de fuente
                bold: true // negrita
        },       
    }

    xlsx.utils.sheet_add_aoa(wb.Sheets["Pagos"], [
        ['Empleado', '', '', '','','','','','','','','','','']
      ],{origin: -1});
    wb.Sheets["Pagos"]["A3"].s={        
        font: {				  		
            sz: 12, // tamaño de fuente
            bold: true // negrita
        },       
    }
    
    if(req.query.initialDate != null && req.query.lastDate !=null ){        
        xlsx.utils.sheet_add_aoa(wb.Sheets["Pagos"], [
            ['Fecha inicial', '', '', '','','','','','','','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Pagos"], [
            ['Fecha final', '', '', '','','','','','','','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Pagos"], [
            ['', '', '', '','','','','','','','','','','']
          ], {origin: -1});

        wb.Sheets["Pagos"]["A4"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            }               
        }
        wb.Sheets["Pagos"]["A5"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            }               
        }
    }
    else{
        xlsx.utils.sheet_add_aoa(wb.Sheets["Pagos"], [
            ['Sin rango de fechas', '', '', '','','','','','','','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Pagos"], [
            ['', '', '', '','','','','','','','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Pagos"], [
            ['', '', '', '','','','','','','','','','','']
          ], {origin: -1});
        wb.Sheets["Pagos"]["A4"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            }               
        }
    }

    xlsx.utils.sheet_add_aoa(wb.Sheets["Pagos"], [
        ['Descartado','Fecha pago','Hora pago','Sucursal código','Sucursal nombre','Empleado nombre','Empleado correo','Folio venta/apartado','Tipo folio','Monto total','Monto pago','Tipo pago']
      ], {origin: -1});
    
    wb.Sheets["Pagos"]["A7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Pagos"]["B7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Pagos"]["C7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Pagos"]["D7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Pagos"]["E7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Pagos"]["F7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Pagos"]["G7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Pagos"]["H7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Pagos"]["I7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Pagos"]["J7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Pagos"]["K7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Pagos"]["L7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    // wb.Sheets["Pagos"]["M7"].s={        
    //     font: {				  		
    //           sz: 12, // tamaño de fuente
    //           bold: true // negrita
    //     }               
    // }

    // wb.Sheets["Pagos"]["N7"].s={        
    //     font: {				  		
    //           sz: 12, // tamaño de fuente
    //           bold: true // negrita
    //     }               
    // }

//     wb.Sheets={
//         Pagos:{
//         }
//     }
//     wb.Sheets["Pagos"]["A1"]={
//         v:'Sucursal',
//         s: 
//         {				
//             font: {				  		
//                   sz: 12, // tamaño de fuente
//                   bold: true // negrita
//             },
//         }
//     }
    
//     wb.Sheets["Pagos"]["B1"]={};


    if(req.query.branchId != null){
        let branchInformation = await Branch.findOne({_id:req.query.branchId}) 
        wb.Sheets["Pagos"]["B1"].v= branchInformation!=null ? branchInformation.code+"-"+branchInformation.name : "";
        wb.Sheets["Pagos"]["B1"].s ={
            font:{
                bold:false
            }
        }
        //console.log(wb.Sheets["Pagos"]["B1"].v)        
    }
    else{
        wb.Sheets["Pagos"]["B1"].v="Todas"
        wb.Sheets["Pagos"]["B1"].s ={
            font:{
                bold:false
            }
        }
    }

    // if(req.query.carId != null){
    //     let carInformation = await Car.findOne({_id:req.query.carId}) 
    //     wb.Sheets["Pagos"]["B2"].v= carInformation!=null ? carInformation.name+"-"+carInformation.color : "";
    //     wb.Sheets["Pagos"]["B2"].s ={
    //         font:{
    //             bold:false
    //         }
    //     }
    //     //console.log(wb.Sheets["Pagos"]["B1"].v)        
    // }
    //else{
        wb.Sheets["Pagos"]["B2"].v="Todos"
        wb.Sheets["Pagos"]["B2"].s ={
            font:{
                bold:false
            }
        }
    //}

    if(req.query.userId != null){
        let userInformation = await User.findOne({_id:req.query.userId}) 
        wb.Sheets["Pagos"]["B3"].v= userInformation!=null ? userInformation.fullName+" - "+userInformation.email : "";
        wb.Sheets["Pagos"]["B3"].s ={
            font:{
                bold:false
            }
        }
        //console.log(wb.Sheets["Pagos"]["B1"].v)        
    }
    else{
        wb.Sheets["Pagos"]["B3"].v="Todos"
        wb.Sheets["Pagos"]["B3"].s ={
            font:{
                bold:false
            }
        }
    }
//     wb.Sheets["Pagos"]["A2"]={};
    if(req.query.initialDate != null && req.query.lastDate !=null ){ 
        let initialDate = parseDate(req.query.initialDate);
        let offset = req.headers.offset ? Number(req.headers.offset) : 6        
        let lastDate = parseDate(req.query.lastDate);

        if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
            initialDate.setHours(offset,0,0,0);    
            lastDate.setHours(offset, 0, 0, 0);
        }
        else{
            initialDate.setHours(0,0,0,0);
            lastDate.setHours(0, 0, 0, 0);
    
        }      
        wb.Sheets["Pagos"]["B2"].v=dateDDMMAAAA(initialDate).substring(0,11);
        wb.Sheets["Pagos"]["B3"].v=dateDDMMAAAA(lastDate).substring(0,11);
    }
    if (payments.length>0){
        for (let index = 0; index < payments.length; index++) {
            xlsx.utils.sheet_add_aoa(wb.Sheets["Pagos"], [
                ['A','B','C','D','E','F','G','H','I',0,0,'L']
              ], {origin: -1});                     
        }
        let currentRow=8;        
        payments.forEach(purchase=>{
            wb.Sheets["Pagos"]["A"+String(currentRow)].v=purchase['Descartado'];
            wb.Sheets["Pagos"]["B"+String(currentRow)].v=purchase['Fecha pago'];
            wb.Sheets["Pagos"]["C"+String(currentRow)].v=purchase['Hora pago'];
            wb.Sheets["Pagos"]["D"+String(currentRow)].v=purchase['Sucursal código'];
            wb.Sheets["Pagos"]["E"+String(currentRow)].v=purchase['Sucursal nombre'];
            wb.Sheets["Pagos"]["F"+String(currentRow)].v=purchase['Empleado nombre'];
            wb.Sheets["Pagos"]["G"+String(currentRow)].v=purchase['Empleado correo'];
            wb.Sheets["Pagos"]["H"+String(currentRow)].v=purchase['Folio venta/apartado'];
            wb.Sheets["Pagos"]["I"+String(currentRow)].v=purchase['Tipo folio'];
            wb.Sheets["Pagos"]["J"+String(currentRow)].v=purchase['Monto total'];
            wb.Sheets["Pagos"]["K"+String(currentRow)].v=purchase['Monto pago'];
            wb.Sheets["Pagos"]["L"+String(currentRow)].v=purchase['Tipo pago'];            
            // wb.Sheets["Pagos"]["L"+String(currentRow)].v=purchase['Pagos descartados'];            
            // wb.Sheets["Pagos"]["M"+String(currentRow)].v=purchase['Total pagado'];            
            // wb.Sheets["Pagos"]["N"+String(currentRow)].v=purchase['Saldo restante'];            
            currentRow ++;
           // ['Nombre','Habilitado general','Código','Descripción','Precio unitario','Cantidad de ventas','Importe total']


        })
    }

     headers=['Descartado','Fecha pago','Hora pago','Sucursal código','Sucursal nombre','Empleado nombre','Empleado correo','Folio venta/apartado','Tipo folio','Monto total','Monto pago','Tipo pago']
     //console.log(headers)

    // adjusting columns length added
     for (let i = 0; i < headers.length; i++) {  
         let columnWidth=headers[i].length;
         columnWidth=headers[i]=='Descartado' ? columnWidth+10 : columnWidth;         
         columnWidth=headers[i]=='Tipo' ? columnWidth+5 : columnWidth;         
         columnWidth=headers[i]=='Sucursal código' ? columnWidth+5 : columnWidth;
         columnWidth=headers[i]=='Sucursal nombre' ? columnWidth+45: columnWidth;        
         columnWidth=headers[i]=='Empleado nombre' ? columnWidth+45: columnWidth;        
         columnWidth=headers[i]=='Empleado correo' ? columnWidth+15: columnWidth;
         columnWidth=headers[i]=='Monto total' ? columnWidth+8 : columnWidth;                  
         columnWidth=headers[i]=='Monto pago' ? columnWidth+8 : columnWidth;                  
         columnWidth=headers[i]=='Folio venta/apartado' ? columnWidth+7 : columnWidth;         
        //  columnWidth=headers[i]=='Modelo' ? columnWidth+10: columnWidth;        
        //  columnWidth=headers[i]=='Color' ? columnWidth+10: columnWidth;        
        //  columnWidth=headers[i]=='Etiqueta' ? columnWidth+20: columnWidth;        
        //  columnWidth=headers[i]=='Tiempo' ? columnWidth+5: columnWidth;        
        //  columnWidth=headers[i]=='Costo' ? columnWidth+5: columnWidth;
        //  columnWidth=headers[i]=='Tipo de pago' ? columnWidth+20: columnWidth;        
        
         wscols.push({ wch: columnWidth })
     } 
    wb.Sheets['Pagos']['!cols']=wscols;
    //console.log("Final Workbook: ",wb.Sheets["Products_vendidos"])
    let row = 8;
    while (wb.Sheets['Pagos']["J"+String(row)] != null) { 
        wb.Sheets['Pagos']["J"+String(row)].z="$0.00";
        wb.Sheets['Pagos']["K"+String(row)].z="$0.00";
        // wb.Sheets['Pagos']["L"+String(row)].z="0.00";
        // wb.Sheets['Pagos']["M"+String(row)].z="$0.00";
        // wb.Sheets['Pagos']["N"+String(row)].z="$0.00";
        row+=1;
        
    }

    let buf = XLSXStyle.write(wb, { type: "buffer" });

    reply.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    reply.header("Content-Disposition", 'attachment; filename="Pagos.xlsx"');
    return reply.send(buf); 

}

const inventoryReport = async function (req, reply){    
    let aggregateQuery=[];
    let offset = await getOffsetSetting()

    if(req.query.modelId != null){
        let modelId = mongoose.Types.ObjectId(req.query.modelId)
        aggregateQuery.push({ "$match": {"modelId": modelId }});        
    }

    if(req.query.color != null){        
        aggregateQuery.push({ "$match": {"color": req.query.color.toLowerCase() }});        
    }

    // if(req.query.userId != null){
    //     let userId = mongoose.Types.ObjectId(req.query.userId)
    //     aggregateQuery.push({ "$match": {"userId": userId }});        
    // }

    // let dateMatchStage={};
    // if (req.query.initialDate!=null && req.query.finalDate!=null){        
    //     let initialDay=new Date(req.query.initialDate);
    //     let finalDayToDate =new Date(req.query.finalDate)
    //     if(initialDay.getTime() > finalDayToDate.getTime()){
    //         return reply.code(400).send({
    //             status:'fail',
    //             message:'La fecha inicial no puede ser mayor que la fecha final'
    //         })
    //     }

    //     let finalDay= addDays(finalDayToDate,1)              
    //     dateMatchStage['$match']={'createdAt': {"$gte": initialDay,"$lte":finalDay}} }
        
    // if (req.query.initialDate!=null && req.query.finalDate==null){        
    //     let initialDay=new Date(req.query.initialDate);
    //     dateMatchStage['$match']={'createdAt': {"$gte": initialDay}} 
    // }
    
    // if (req.query.finalDate!=null && req.query.initialDate==null){
    //     let finalDay= addDays(req.query.finalDate,1)
    //     dateMatchStage['$match']={'createdAt': {"$gte": finalDay}} 
    //     }

    // if(dateMatchStage['$match']!=null){
    //     aggregateQuery.push(dateMatchStage)
    // }

    
    // if (req.query.initialDate != null && req.query.lastDate != null){
    //     let initialDate = parseDate(req.query.initialDate);
    //     //let offset = await getOffsetSetting();              
    //     //let offset = req.headers.offset ? Number(req.headers.offset) : 6        

    //     //initialDate.setHours(0,0,0,0);
    //     let lastDate = parseDate(req.query.lastDate);
    //     lastDate = addDays(lastDate, 1)
    //     if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
    //         initialDate.setHours(offset,0,0,0);    
    //         lastDate.setHours(offset, 0, 0, 0);
    //     }
    //     else{
    //         initialDate.setHours(0,0,0,0);
    //         lastDate.setHours(0, 0, 0, 0);
    
    //     }
    //     aggregateQuery.push({ "$match": {"createdAt": {"$gte": initialDate,"$lte":lastDate}}});        
    // }   
         
      
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
                'Folio':'$folio',                
                'Modelo'  :{
                    '$first': '$modelInfo.name'
                },
                'Color'  :'$color',
                'Cantidad':"$quantity",                                
                "createdAt":'$createdAt',
                "updatedAt":"$updatedAt"                               
                
            }
          }         
    )

    let inventories = await Inventory.aggregate(aggregateQuery); 
    //console.log("RENTALS: ", rentals[0]);   
    inventories.forEach(inventory=>{        
        if(inventory.createdAt){            
            inventory.createdAt = adjustTimeStamp (inventory.createdAt,offset);
            inventory['Fecha de creacion']=dateDDMMAAAA(inventory.createdAt);            
            inventory['Hora de creacion']=dateTimeHHSS(inventory.createdAt);  
            
        }

        if(inventory.updatedAt){            
            inventory.updatedAt = adjustTimeStamp (inventory.updatedAt,offset);
            inventory['Fecha de actualizacion']=dateDDMMAAAA(inventory.updatedAt);            
            inventory['Hora de actualizacion']=dateTimeHHSS(inventory.updatedAt);  
            
        }

        // 
    })

    //console.log("RENTALS DATE ADJUSTED: ", rentals[0]);
    
   

    // if (rentals.length==0){
    //     let emptyPurchaseObj = {
    //         'Nombre': '', 
    //         'Habilitado general':'',
    //         'Cantidad de ventas':''            
    //     }
    //     rentals.push(emptyPurchaseObj)
    // }
   	
    let headers=[]; //created array for column names
    let wscols=[]; //array to store the width of the columns
    // create the export file
    //
    let wb = xlsx.utils.book_new();
    wb.Props = {
        Title: "Inventario",                
    };
    //let wbRows = rentals.length+4;   
    wb.SheetNames.push("Inventario");
    //addig the titles rows
    var ws_data = [['Modelo','','','','','','','','','','','','']]
    var ws = xlsx.utils.aoa_to_sheet(ws_data);       
    wb.Sheets["Inventario"] = ws;
    wb.Sheets["Inventario"]["A1"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            },       
    }
    xlsx.utils.sheet_add_aoa(wb.Sheets["Inventario"], [
            ['Color', '', '', '','','','','','','','','','']
          ],{origin: -1});
    wb.Sheets["Inventario"]["A2"].s={        
        font: {				  		
                sz: 12, // tamaño de fuente
                bold: true // negrita
        },       
    }

    xlsx.utils.sheet_add_aoa(wb.Sheets["Inventario"], [
        ['', '', '', '','','','','','','','','','']
      ],{origin: -1});
    // wb.Sheets["Inventario"]["A3"].s={        
    //     font: {				  		
    //         sz: 12, // tamaño de fuente
    //         bold: true // negrita
    // },       
    // }

    

    // xlsx.utils.sheet_add_aoa(wb.Sheets["Inventario"], [
    //     ['Empleado', '', '', '','','','','','','','','','']
    //   ],{origin: -1});
    // wb.Sheets["Inventario"]["A3"].s={        
    //     font: {				  		
    //         sz: 12, // tamaño de fuente
    //         bold: true // negrita
    //     },       
    // }
    
    // if(req.query.initialDate != null && req.query.lastDate !=null ){        
    //     xlsx.utils.sheet_add_aoa(wb.Sheets["Inventario"], [
    //         ['Fecha inicial', '', '', '','','','','','','','','','']
    //       ], {origin: -1});
    //     xlsx.utils.sheet_add_aoa(wb.Sheets["Inventario"], [
    //         ['Fecha final', '', '', '','','','','','','','','','']
    //       ], {origin: -1});
    //     xlsx.utils.sheet_add_aoa(wb.Sheets["Inventario"], [
    //         ['', '', '', '','','','','','','','','','']
    //       ], {origin: -1});

    //     wb.Sheets["Inventario"]["A4"].s={        
    //         font: {				  		
    //               sz: 12, // tamaño de fuente
    //               bold: true // negrita
    //         }               
    //     }
    //     wb.Sheets["Inventario"]["A5"].s={        
    //         font: {				  		
    //               sz: 12, // tamaño de fuente
    //               bold: true // negrita
    //         }               
    //     }
    // }
    // else{
    //     xlsx.utils.sheet_add_aoa(wb.Sheets["Inventario"], [
    //         ['Sin rango de fechas', '', '', '','','','','','','','','','']
    //       ], {origin: -1});
    //     xlsx.utils.sheet_add_aoa(wb.Sheets["Inventario"], [
    //         ['', '', '', '','','','','','','','','','']
    //       ], {origin: -1});
    //     xlsx.utils.sheet_add_aoa(wb.Sheets["Inventario"], [
    //         ['', '', '', '','','','','','','','','','']
    //       ], {origin: -1});
    //     wb.Sheets["Inventario"]["A4"].s={        
    //         font: {				  		
    //               sz: 12, // tamaño de fuente
    //               bold: true // negrita
    //         }               
    //     }
    // }

    xlsx.utils.sheet_add_aoa(wb.Sheets["Inventario"], [
        ['Fecha de creación','Hora de creación','Modelo','Color','Cantidad','Fecha de actualización','Hora de actualización']
      ], {origin: -1});
    
    wb.Sheets["Inventario"]["A4"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Inventario"]["B4"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Inventario"]["C4"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Inventario"]["D4"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Inventario"]["E4"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Inventario"]["F4"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Inventario"]["G4"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    // wb.Sheets["Inventario"]["H7"].s={        
    //     font: {				  		
    //           sz: 12, // tamaño de fuente
    //           bold: true // negrita
    //     }               
    // }
    // wb.Sheets["Inventario"]["I7"].s={        
    //     font: {				  		
    //           sz: 12, // tamaño de fuente
    //           bold: true // negrita
    //     }               
    // }
    // wb.Sheets["Inventario"]["J7"].s={        
    //     font: {				  		
    //           sz: 12, // tamaño de fuente
    //           bold: true // negrita
    //     }               
    // }
    // wb.Sheets["Inventario"]["K7"].s={        
    //     font: {				  		
    //           sz: 12, // tamaño de fuente
    //           bold: true // negrita
    //     }               
    // }
    // wb.Sheets["Inventario"]["L7"].s={        
    //     font: {				  		
    //           sz: 12, // tamaño de fuente
    //           bold: true // negrita
    //     }               
    // }
    // wb.Sheets["Inventario"]["M7"].s={        
    //     font: {				  		
    //           sz: 12, // tamaño de fuente
    //           bold: true // negrita
    //     }               
    // }

//     wb.Sheets={
//         Inventario:{
//         }
//     }
//     wb.Sheets["Inventario"]["A1"]={
//         v:'Sucursal',
//         s: 
//         {				
//             font: {				  		
//                   sz: 12, // tamaño de fuente
//                   bold: true // negrita
//             },
//         }
//     }
    
//     wb.Sheets["Inventario"]["B1"]={};


    if(req.query.modelId != null){
        let modelInformation = await Modelo.findOne({_id:req.query.modelId}) 
        wb.Sheets["Inventario"]["B1"].v= modelInformation!=null ? modelInformation.name: "";
        wb.Sheets["Inventario"]["B1"].s ={
            font:{
                bold:false
            }
        }
        //console.log(wb.Sheets["Inventario"]["B1"].v)        
    }
    else{
        wb.Sheets["Inventario"]["B1"].v="Todos"
        wb.Sheets["Inventario"]["B1"].s ={
            font:{
                bold:false
            }
        }
    }

    if(req.query.color != null){        
        wb.Sheets["Inventario"]["B2"].v= req.query.color
        wb.Sheets["Inventario"]["B2"].s ={
            font:{
                bold:false
            }
        }
        //console.log(wb.Sheets["Inventario"]["B1"].v)        
    }
    else{
        wb.Sheets["Inventario"]["B2"].v="Todos"
        wb.Sheets["Inventario"]["B2"].s ={
            font:{
                bold:false
            }
        }
    }

//     if(req.query.userId != null){
//         let userInformation = await User.findOne({_id:req.query.userId}) 
//         wb.Sheets["Inventario"]["B3"].v= userInformation!=null ? userInformation.fullName+" - "+userInformation.email : "";
//         wb.Sheets["Inventario"]["B3"].s ={
//             font:{
//                 bold:false
//             }
//         }
//         //console.log(wb.Sheets["Inventario"]["B1"].v)        
//     }
//     else{
//         wb.Sheets["Inventario"]["B3"].v="Todos"
//         wb.Sheets["Inventario"]["B3"].s ={
//             font:{
//                 bold:false
//             }
//         }
//     }
// //     wb.Sheets["Inventario"]["A2"]={};
//     if(req.query.initialDate != null && req.query.lastDate !=null ){ 
//         let initialDate = parseDate(req.query.initialDate);
//         let offset = req.headers.offset ? Number(req.headers.offset) : 6        
//         let lastDate = parseDate(req.query.lastDate);

//         if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
//             initialDate.setHours(offset,0,0,0);    
//             lastDate.setHours(offset, 0, 0, 0);
//         }
//         else{
//             initialDate.setHours(0,0,0,0);
//             lastDate.setHours(0, 0, 0, 0);
    
//         }      
//         wb.Sheets["Inventario"]["B2"].v=dateDDMMAAAA(initialDate).substring(0,11);
//         wb.Sheets["Inventario"]["B3"].v=dateDDMMAAAA(lastDate).substring(0,11);
//     }
    if (inventories.length>0){
        for (let index = 0; index < inventories.length; index++) {
            xlsx.utils.sheet_add_aoa(wb.Sheets["Inventario"], [
                ['A','B','C','D',0,'F','G']
              ], {origin: -1});                     
        }
        let currentRow=5;
        inventories.forEach(purchase=>{
            wb.Sheets["Inventario"]["A"+String(currentRow)].v=purchase['Fecha de creacion'];
            wb.Sheets["Inventario"]["B"+String(currentRow)].v=purchase['Hora de creacion'];
            wb.Sheets["Inventario"]["C"+String(currentRow)].v=purchase['Modelo'];
            wb.Sheets["Inventario"]["D"+String(currentRow)].v=purchase['Color'];
            wb.Sheets["Inventario"]["E"+String(currentRow)].v=purchase['Cantidad'];
            wb.Sheets["Inventario"]["F"+String(currentRow)].v=purchase['Fecha de actualizacion'];
            wb.Sheets["Inventario"]["G"+String(currentRow)].v=purchase['Hora de actualizacion'];            
            currentRow ++;
           // ['Nombre','Habilitado general','Código','Descripción','Precio unitario','Cantidad de ventas','Importe total']


        })
    }

     headers=['Fecha de creación','Hora de creación','Modelo','Color','Cantidad','Fecha de actualización','Hora de actualización']
     //console.log(headers)

    // adjusting columns length added
     for (let i = 0; i < headers.length; i++) {  
         let columnWidth=headers[i].length;
         //columnWidth=headers[i]=='Folio' ? columnWidth+20 : columnWidth;
         //columnWidth=headers[i]=='Fecha' ? columnWidth+15 : columnWidth;
         columnWidth=headers[i]=='Modelo' ? columnWidth+15 : columnWidth;
         columnWidth=headers[i]=='Color' ? columnWidth+10 : columnWidth;
        //  columnWidth=headers[i]=='Sucursal nombre' ? columnWidth+45: columnWidth;        
        //  columnWidth=headers[i]=='Empleado nombre' ? columnWidth+45: columnWidth;        
        //  columnWidth=headers[i]=='Empleado correo' ? columnWidth+45: columnWidth;
        //  columnWidth=headers[i]=='Modelo' ? columnWidth+10: columnWidth;        
        //  columnWidth=headers[i]=='Color' ? columnWidth+10: columnWidth;        
        //  columnWidth=headers[i]=='Etiqueta' ? columnWidth+20: columnWidth;        
        //  columnWidth=headers[i]=='Tiempo' ? columnWidth+5: columnWidth;        
        //  columnWidth=headers[i]=='Costo' ? columnWidth+5: columnWidth;
        //  columnWidth=headers[i]=='Tipo de pago' ? columnWidth+20: columnWidth;        
        
         wscols.push({ wch: columnWidth })
     } 
    wb.Sheets['Inventario']['!cols']=wscols;
    //console.log("Final Workbook: ",wb.Sheets["Products_vendidos"])
    let row = 5;
    while (wb.Sheets['Inventario']["E"+String(row)] != null) { 
        wb.Sheets['Inventario']["E"+String(row)].z="0";        
        row+=1;
        
    }

    let buf = XLSXStyle.write(wb, { type: "buffer" });

    reply.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    reply.header("Content-Disposition", 'attachment; filename="Inventario.xlsx"');
    return reply.send(buf); 

}

const batteriesReport = async function (req, reply){    
    let aggregateQuery=[];
    let offset = await getOffsetSetting()
    //let offset = req.headers.offset ? Number(req.headers.offset) : 6  

    if(req.query.branchId != null){
        let branchId = mongoose.Types.ObjectId(req.query.branchId)
        aggregateQuery.push({ "$match": {"branchId": branchId }});        
    }

    if(req.query.carId != null){
        let carId = mongoose.Types.ObjectId(req.query.carId)
        aggregateQuery.push({ "$match": {"carId": carId }});        
    }

    if(req.query.modelId != null){
        let modelId = mongoose.Types.ObjectId(req.query.modelId)
        aggregateQuery.push({ "$match": {"modelId": modelId }});        
    }

    aggregateQuery.push(
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
              'from': 'cars', 
              'localField': 'carId', 
              'foreignField': '_id', 
              'as': 'carInfo'
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
                'Sucursal código':{
                    '$first': '$branchInfo.code'
                },
                'Sucursal nombre': {
                    '$first': '$branchInfo.name'                
                },
                'Modelo':{
                    '$first': '$modelInfo.name'
                },                                
                'Etiqueta'  :{
                    '$first': '$carInfo.name'
                },
                'Color'  :{
                    '$first': '$carInfo.color'
                },
                "records":'$records',                
                
            }
          } 
     
    )

    if(req.query.color != null && req.query.color!=""){        
        aggregateQuery.push({ "$match": {"Color": req.query.color.toLowerCase()}});        
    }          
        
    let batteries = await Battery.aggregate(aggregateQuery); 
    let dateMatchStage={};
    if (batteries.length==0){
        return reply.code(400).send({
            status:'fail',
            message:'No se encontraron registros con los filtros seleccionados'
        })
    }

    let wb = xlsx.utils.book_new();
    wb.Props = {
        Title: "Baterias",                
    };

    console.log("BATERIAS: ",batteries[0])

    for (let battery of batteries) {
        let i = 1;
        let headers=[]; //created array for column names
        let wscols=[]; //array to store the width of the columns   
        let newSheet = battery.Etiqueta ? battery.Etiqueta : "Carrito "+i
        wb.SheetNames.push(newSheet);
        //addig the titles rows
        var ws_data = [['Sucursal','','','','','','','','','','','','']]
        var ws = xlsx.utils.aoa_to_sheet(ws_data);       
        wb.Sheets[newSheet] = ws;
        wb.Sheets[newSheet]["A1"].s={        
                font: {				  		
                      sz: 12, // tamaño de fuente
                      bold: true // negrita
                },       
        }
        xlsx.utils.sheet_add_aoa(wb.Sheets[newSheet], [
                ['Modelo', '', '', '','','','','','','','','','']
              ],{origin: -1});
        wb.Sheets[newSheet]["A2"].s={        
            font: {				  		
                    sz: 12, // tamaño de fuente
                    bold: true // negrita
            },       
        }

        xlsx.utils.sheet_add_aoa(wb.Sheets[newSheet], [
            ['Etiqueta', '', '', '','','','','','','','','','']
          ],{origin: -1});
        wb.Sheets[newSheet]["A3"].s={        
            font: {				  		
                sz: 12, // tamaño de fuente
                bold: true // negrita
            },       
        }

        xlsx.utils.sheet_add_aoa(wb.Sheets[newSheet], [
            ['Color', '', '', '','','','','','','','','','']
          ],{origin: -1});
        wb.Sheets[newSheet]["A4"].s={        
            font: {				  		
                sz: 12, // tamaño de fuente
                bold: true // negrita
            },       
        }

        if(req.query.initialDate != null && req.query.lastDate !=null ){        
            xlsx.utils.sheet_add_aoa(wb.Sheets[newSheet], [
                ['Fecha inicial', '', '', '','','','','','','','','','']
              ], {origin: -1});
            xlsx.utils.sheet_add_aoa(wb.Sheets[newSheet], [
                ['Fecha final', '', '', '','','','','','','','','','']
              ], {origin: -1});
            xlsx.utils.sheet_add_aoa(wb.Sheets[newSheet], [
                ['', '', '', '','','','','','','','','','']
              ], {origin: -1});

            wb.Sheets[newSheet]["A5"].s={        
                font: {				  		
                      sz: 12, // tamaño de fuente
                      bold: true // negrita
                }               
            }
            wb.Sheets[newSheet]["A6"].s={        
                font: {				 		
                      sz: 12, // tamaño de fuente
                      bold: true // negrita
                }               
            }
        }
        else{
            xlsx.utils.sheet_add_aoa(wb.Sheets[newSheet], [
                ['Sin rango de fechas', '', '', '','','','','','','','','','']
              ], {origin: -1});
            xlsx.utils.sheet_add_aoa(wb.Sheets[newSheet], [
                ['', '', '', '','','','','','','','','','']
              ], {origin: -1});            
            wb.Sheets[newSheet]["A5"].s={        
                font: {				  		
                      sz: 12, // tamaño de fuente
                      bold: true // negrita
                }               
            }
        }

        xlsx.utils.sheet_add_aoa(wb.Sheets[newSheet], [
            ['', '', '', '','','','','','','','','','']
         ],{origin: -1});
        

        xlsx.utils.sheet_add_aoa(wb.Sheets[newSheet], [
            ['Valor','Fecha','Hora']
          ], {origin: -1});
      
        wb.Sheets[newSheet]["A8"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            }               
        }
        wb.Sheets[newSheet]["B8"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            }               
        }
        wb.Sheets[newSheet]["C8"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            }               
        }
        // wb.Sheets[newSheet]["D9"].s={        
        //     font: {				  		
        //           sz: 12, // tamaño de fuente
        //           bold: true // negrita
        //     }               
        // }
        // wb.Sheets[newSheet]["E9"].s={        
        //     font: {				  		
        //           sz: 12, // tamaño de fuente
        //           bold: true // negrita
        //     }               
        // }
        // wb.Sheets[newSheet]["F9"].s={        
        //     font: {				  		
        //           sz: 12, // tamaño de fuente
        //           bold: true // negrita
        //     }               
        // }
        // wb.Sheets[newSheet]["G9"].s={        
        //     font: {				  		
        //           sz: 12, // tamaño de fuente
        //           bold: true // negrita
        //     }               
        // }
        // wb.Sheets[newSheet]["H9"].s={        
        //     font: {				  		
        //           sz: 12, // tamaño de fuente
        //           bold: true // negrita
        //     }               
        // }
        // wb.Sheets[newSheet]["I9"].s={        
        //     font: {				  		
        //           sz: 12, // tamaño de fuente
        //           bold: true // negrita
        //     }               
        // }
        // wb.Sheets[newSheet]["J9"].s={        
        //     font: {				  		
        //           sz: 12, // tamaño de fuente
        //           bold: true // negrita
        //     }               
        // }
        // wb.Sheets[newSheet]["K9"].s={        
        //     font: {				  		
        //           sz: 12, // tamaño de fuente
        //           bold: true // negrita
        //     }               
        // }
        // wb.Sheets[newSheet]["L9"].s={        
        //     font: {				  		
        //           sz: 12, // tamaño de fuente
        //           bold: true // negrita
        //     }               
        // }
        // wb.Sheets[newSheet]["M9"].s={        
        //     font: {				  		
        //           sz: 12, // tamaño de fuente
        //           bold: true // negrita
        //     }               
        // }

        
          
        wb.Sheets[newSheet]["B1"].v= battery['Sucursal código']!=null ? battery['Sucursal código']+"-"+battery['Sucursal nombre'] : "No registrada";
        wb.Sheets[newSheet]["B1"].s ={
            font:{
                bold:false
            }
        }    

        wb.Sheets[newSheet]["B2"].v= battery['Modelo']!=null ? battery['Modelo'] :"";
        wb.Sheets[newSheet]["B2"].s ={
            font:{
                 bold:false
            }
        }
        
        wb.Sheets[newSheet]["B3"].v= newSheet;
        wb.Sheets[newSheet]["B3"].s ={
            font:{
                 bold:false
            }
        }

        wb.Sheets[newSheet]["B4"].v= battery['Color']!=null ? battery['Color']:"";
        wb.Sheets[newSheet]["B4"].s ={
            font:{
                 bold:false
            }
        }
    

    //     wb.Sheets[newSheet]["A2"]={};
        if(req.query.initialDate != null && req.query.lastDate !=null ){ 
            let startDate = new Date (req.query.initialDate);
            let finalDate = new Date (req.query.lastDate);            
            let filteredRecords = battery.records.filter( record=>{
                return record.dateTime >= startDate && record.dateTime<=finalDate
            })

            battery.records = filteredRecords;


            let initialDate = parseDate(req.query.initialDate);                  
            let lastDate = parseDate(req.query.lastDate);

            if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
                initialDate.setHours(offset,0,0,0);    
                lastDate.setHours(offset, 0, 0, 0);
            }
            else{
                initialDate.setHours(0,0,0,0);
                lastDate.setHours(0, 0, 0, 0);
            
            }      
            wb.Sheets[newSheet]["B5"].v=dateDDMMAAAA(initialDate).substring(0,11);
            wb.Sheets[newSheet]["B6"].v=dateDDMMAAAA(lastDate).substring(0,11);
        }

        
    // if (req.query.initialDate!=null && req.query.finalDate!=null){        
    //     let initialDay=new Date(req.query.initialDate);
    //     let finalDayToDate =new Date(req.query.finalDate)
    //     if(initialDay.getTime() > finalDayToDate.getTime()){
    //         return reply.code(400).send({
    //             status:'fail',
    //             message:'La fecha inicial no puede ser mayor que la fecha final'
    //         })
    //     }

    //     let finalDay= addDays(finalDayToDate,1)              
    //     dateMatchStage['$match']={'createdAt': {"$gte": initialDay,"$lte":finalDay}} }
        
    // if (req.query.initialDate!=null && req.query.finalDate==null){        
    //     let initialDay=new Date(req.query.initialDate);
    //     dateMatchStage['$match']={'createdAt': {"$gte": initialDay}} 
    // }
    
    // if (req.query.finalDate!=null && req.query.initialDate==null){
    //     let finalDay= addDays(req.query.finalDate,1)
    //     dateMatchStage['$match']={'createdAt': {"$gte": finalDay}} 
    //     }

    // if(dateMatchStage['$match']!=null){
    //     aggregateQuery.push(dateMatchStage)
    // }  


        if (battery.records.length>0){            
            for (let index = 0; index < battery.records.length; index++) {                              
                xlsx.utils.sheet_add_aoa(wb.Sheets[newSheet], [
                    ['A', 'B','C']
                  ], {origin: -1});                     
            }
            let currentRow=9;
            battery.records.forEach(record=>{
                if(record.dateTime){            
                    record.dateTime = adjustTimeStamp (record.dateTime,offset);
                    record.Fecha=dateDDMMAAAA(record.dateTime);            
                    record.Hora=dateTimeHHSS(record.dateTime);  
                    
                }


                wb.Sheets[newSheet]["A"+String(currentRow)].v=record['value'];
                wb.Sheets[newSheet]["B"+String(currentRow)].v=record['Fecha'];
                wb.Sheets[newSheet]["C"+String(currentRow)].v=record['Hora'];
                // wb.Sheets[newSheet]["D"+String(currentRow)].v=purchase['Sucursal código'];
                // wb.Sheets[newSheet]["E"+String(currentRow)].v=purchase['Sucursal nombre'];
                // wb.Sheets[newSheet]["F"+String(currentRow)].v=purchase['Empleado nombre'];
                // wb.Sheets[newSheet]["G"+String(currentRow)].v=purchase['Empleado correo'];
                // wb.Sheets[newSheet]["H"+String(currentRow)].v=purchase['Modelo'];
                // wb.Sheets[newSheet]["I"+String(currentRow)].v=purchase['Color'];
                // wb.Sheets[newSheet]["J"+String(currentRow)].v=purchase['Etiqueta'];
                // wb.Sheets[newSheet]["K"+String(currentRow)].v=purchase['Tiempo'];
                // wb.Sheets[newSheet]["L"+String(currentRow)].v=purchase['Costo'];            
                // wb.Sheets[newSheet]["M"+String(currentRow)].v=purchase['Tipo de pago'];            
                currentRow ++;
               // ['Nombre','Habilitado general','Código','Descripción','Precio unitario','Cantidad de ventas','Importe total']
               headers=["Valor","Fecha","Hora"]
         //console.log(headers)

        // adjusting columns length added
                for (let i = 0; i < headers.length; i++) {  
                    let columnWidth=headers[i].length;
                    columnWidth=headers[i]=='Valor' ? columnWidth+15 : columnWidth;
                    columnWidth=headers[i]=='Fecha' ? columnWidth+15 : columnWidth;
                    columnWidth=headers[i]=='Hora' ? columnWidth+7 : columnWidth;
                   //  columnWidth=headers[i]=='Sucursal código' ? columnWidth+5 : columnWidth;
                   //  columnWidth=headers[i]=='Sucursal nombre' ? columnWidth+45: columnWidth;        
                   //  columnWidth=headers[i]=='Empleado nombre' ? columnWidth+45: columnWidth;        
                   //  columnWidth=headers[i]=='Empleado correo' ? columnWidth+45: columnWidth;
                   //  columnWidth=headers[i]=='Modelo' ? columnWidth+10: columnWidth;        
                   //  columnWidth=headers[i]=='Color' ? columnWidth+10: columnWidth;        
                   //  columnWidth=headers[i]=='Etiqueta' ? columnWidth+20: columnWidth;        
                   //  columnWidth=headers[i]=='Tiempo' ? columnWidth+5: columnWidth;        
                   //  columnWidth=headers[i]=='Costo' ? columnWidth+5: columnWidth;
                   //  columnWidth=headers[i]=='Tipo de pago' ? columnWidth+20: columnWidth;        
                                    wscols.push({ wch: columnWidth })
                } 
               wb.Sheets[newSheet]['!cols']=wscols;


            })
        }

         
        //console.log("Final Workbook: ",wb.Sheets["Products_vendidos"])
        // let row = 9;
        // while (wb.Sheets[newSheet]["G"+String(row)] != null) { 
        //     wb.Sheets[newSheet]["K"+String(row)].z="0.00";
        //     wb.Sheets[newSheet]["L"+String(row)].z="$0.00";
        //     row+=1;

        // }
        i++;
    }       
           	
        
    
    

    let buf = XLSXStyle.write(wb, { type: "buffer" });

    reply.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    reply.header("Content-Disposition", 'attachment; filename="Baterias.xlsx"');
    return reply.send(buf); 

}

const statusReport = async function (req, reply){    
    let aggregateQuery=[];
    let offset = await getOffsetSetting()

    if(req.query.branchId != null){
        let branchId = mongoose.Types.ObjectId(req.query.branchId)
        aggregateQuery.push({ "$match": {"branchId": branchId }});        
    }

    if(req.query.carId != null){
        let carId = mongoose.Types.ObjectId(req.query.carId)
        aggregateQuery.push({ "$match": {"carId": carId }});        
    }

    if(req.query.userId != null){
        let userId = mongoose.Types.ObjectId(req.query.userId)
        aggregateQuery.push({ "$match": {"userId": userId }});        
    }

    let dateMatchStage={};
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
        dateMatchStage['$match']={'createdAt': {"$gte": initialDay,"$lte":finalDay}} }
        
    if (req.query.initialDate!=null && req.query.finalDate==null){        
        let initialDay=new Date(req.query.initialDate);
        dateMatchStage['$match']={'createdAt': {"$gte": initialDay}} 
    }
    
    if (req.query.finalDate!=null && req.query.initialDate==null){
        let finalDay= addDays(req.query.finalDate,1)
        dateMatchStage['$match']={'createdAt': {"$gte": finalDay}} 
        }

    if(dateMatchStage['$match']!=null){
        aggregateQuery.push(dateMatchStage)
    }

    
    // if (req.query.initialDate != null && req.query.lastDate != null){
    //     let initialDate = parseDate(req.query.initialDate);
    //     //let offset = await getOffsetSetting();              
    //     //let offset = req.headers.offset ? Number(req.headers.offset) : 6        

    //     //initialDate.setHours(0,0,0,0);
    //     let lastDate = parseDate(req.query.lastDate);
    //     lastDate = addDays(lastDate, 1)
    //     if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
    //         initialDate.setHours(offset,0,0,0);    
    //         lastDate.setHours(offset, 0, 0, 0);
    //     }
    //     else{
    //         initialDate.setHours(0,0,0,0);
    //         lastDate.setHours(0, 0, 0, 0);
    
    //     }
    //     aggregateQuery.push({ "$match": {"createdAt": {"$gte": initialDate,"$lte":lastDate}}});        
    // }   
         
      
    aggregateQuery.push(
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
              'from': 'cars', 
              'localField': 'carId', 
              'foreignField': '_id', 
              'as': 'carInfo'
            }
          },
          {
            '$lookup': {
              'from': 'users', 
              'localField': 'userId', 
              'foreignField': '_id', 
              'as': 'userInfo'
            }
          },
         {
            '$project': {
                'Folio':'$folio',
                'Sucursal código':{
                    '$first': '$branchInfo.code'
                },
                'Sucursal nombre': {
                    '$first': '$branchInfo.name'
                
                },
                'Empleado nombre':{
                    '$first': '$userInfo.fullName'
                },
                'Empleado correo': {
                    '$first': '$userInfo.email'
                
                },
                'Modelo'  :{
                    '$first': '$carInfo.modelId'
                },
                'Color'  :{
                    '$first': '$carInfo.color'
                },
                'Etiqueta': {
                    '$first': '$carInfo.name'
                },
                "Tiempo":'$planType.time',
                "Costo":'$planType.price',
                "Tipo de pago":'$paymentType',
                "createdAt":'$createdAt'                               
                
            }
          } 
        //   {
        //     '$group': {
        //       '_id': '$_id', 
        //       'count': {
        //         '$sum': 1
        //       }
        //     }
        //   }
    )

    let rentals = await Rental.aggregate(aggregateQuery); 
    //console.log("RENTALS: ", rentals[0]);
    let allModels = await Modelo.find({});
    rentals.forEach(rental=>{
        if(rental['Tipo de pago']){
            switch (rental['Tipo de pago']) {
                case 'card':
                    rental['Tipo de pago']='Tarjeta'
                    break;
                case 'cash':
                    rental['Tipo de pago']='Efectivo'
                    break;
                    

                default:
                    break;
            }
        }
        if(rental.createdAt){            
            rental.createdAt = adjustTimeStamp (rental.createdAt,offset);
            rental.Fecha=dateDDMMAAAA(rental.createdAt);            
            rental.Hora=dateTimeHHSS(rental.createdAt);  
            
        }
        if (rental.Modelo){
            let modelInfo = allModels.find(element=>{
                return String(element._id) == String(rental.Modelo)
            })

            rental.Modelo = modelInfo ? modelInfo.name :"";
        }
        else{
            rental.Modelo = "";
        }
    })

    //console.log("RENTALS DATE ADJUSTED: ", rentals[0]);
    
   

    // if (rentals.length==0){
    //     let emptyPurchaseObj = {
    //         'Nombre': '', 
    //         'Habilitado general':'',
    //         'Cantidad de ventas':''            
    //     }
    //     rentals.push(emptyPurchaseObj)
    // }
   	
    let headers=[]; //created array for column names
    let wscols=[]; //array to store the width of the columns
    // create the export file
    //
    let wb = xlsx.utils.book_new();
    wb.Props = {
        Title: "Rentas",                
    };
    //let wbRows = rentals.length+4;   
    wb.SheetNames.push("Rentas");
    //addig the titles rows
    var ws_data = [['Sucursal','','','','','','','','','','','','']]
    var ws = xlsx.utils.aoa_to_sheet(ws_data);       
    wb.Sheets["Rentas"] = ws;
    wb.Sheets["Rentas"]["A1"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            },       
    }
    xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
            ['Etiqueta', '', '', '','','','','','','','','','']
          ],{origin: -1});
    wb.Sheets["Rentas"]["A2"].s={        
        font: {				  		
                sz: 12, // tamaño de fuente
                bold: true // negrita
        },       
    }

    xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
        ['Empleado', '', '', '','','','','','','','','','']
      ],{origin: -1});
    wb.Sheets["Rentas"]["A3"].s={        
        font: {				  		
            sz: 12, // tamaño de fuente
            bold: true // negrita
        },       
    }
    
    if(req.query.initialDate != null && req.query.lastDate !=null ){        
        xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
            ['Fecha inicial', '', '', '','','','','','','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
            ['Fecha final', '', '', '','','','','','','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
            ['', '', '', '','','','','','','','','','']
          ], {origin: -1});

        wb.Sheets["Rentas"]["A4"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            }               
        }
        wb.Sheets["Rentas"]["A5"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            }               
        }
    }
    else{
        xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
            ['Sin rango de fechas', '', '', '','','','','','','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
            ['', '', '', '','','','','','','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
            ['', '', '', '','','','','','','','','','']
          ], {origin: -1});
        wb.Sheets["Rentas"]["A4"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            }               
        }
    }

    xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
        ['Folio','Fecha','Hora','Sucursal código','Sucursal nombre','Empleado nombre','Empleado correo','Modelo','Color','Etiqueta','Tiempo','Costo','Tipo de pago']
      ], {origin: -1});
    
    wb.Sheets["Rentas"]["A7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["B7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["C7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["D7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["E7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["F7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["G7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["H7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["I7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["J7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["K7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["L7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["M7"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }

//     wb.Sheets={
//         Rentas:{
//         }
//     }
//     wb.Sheets["Rentas"]["A1"]={
//         v:'Sucursal',
//         s: 
//         {				
//             font: {				  		
//                   sz: 12, // tamaño de fuente
//                   bold: true // negrita
//             },
//         }
//     }
    
//     wb.Sheets["Rentas"]["B1"]={};


    if(req.query.branchId != null){
        let branchInformation = await Branch.findOne({_id:req.query.branchId}) 
        wb.Sheets["Rentas"]["B1"].v= branchInformation!=null ? branchInformation.code+"-"+branchInformation.name : "";
        wb.Sheets["Rentas"]["B1"].s ={
            font:{
                bold:false
            }
        }
        //console.log(wb.Sheets["Rentas"]["B1"].v)        
    }
    else{
        wb.Sheets["Rentas"]["B1"].v="Todas"
        wb.Sheets["Rentas"]["B1"].s ={
            font:{
                bold:false
            }
        }
    }

    if(req.query.carId != null){
        let carInformation = await Car.findOne({_id:req.query.carId}) 
        wb.Sheets["Rentas"]["B2"].v= carInformation!=null ? carInformation.name+"-"+carInformation.color : "";
        wb.Sheets["Rentas"]["B2"].s ={
            font:{
                bold:false
            }
        }
        //console.log(wb.Sheets["Rentas"]["B1"].v)        
    }
    else{
        wb.Sheets["Rentas"]["B2"].v="Todos"
        wb.Sheets["Rentas"]["B2"].s ={
            font:{
                bold:false
            }
        }
    }

    if(req.query.userId != null){
        let userInformation = await User.findOne({_id:req.query.userId}) 
        wb.Sheets["Rentas"]["B3"].v= userInformation!=null ? userInformation.fullName+" - "+userInformation.email : "";
        wb.Sheets["Rentas"]["B3"].s ={
            font:{
                bold:false
            }
        }
        //console.log(wb.Sheets["Rentas"]["B1"].v)        
    }
    else{
        wb.Sheets["Rentas"]["B3"].v="Todos"
        wb.Sheets["Rentas"]["B3"].s ={
            font:{
                bold:false
            }
        }
    }
//     wb.Sheets["Rentas"]["A2"]={};
    if(req.query.initialDate != null && req.query.lastDate !=null ){ 
        let initialDate = parseDate(req.query.initialDate);
        let offset = req.headers.offset ? Number(req.headers.offset) : 6        
        let lastDate = parseDate(req.query.lastDate);

        if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
            initialDate.setHours(offset,0,0,0);    
            lastDate.setHours(offset, 0, 0, 0);
        }
        else{
            initialDate.setHours(0,0,0,0);
            lastDate.setHours(0, 0, 0, 0);
    
        }      
        wb.Sheets["Rentas"]["B2"].v=dateDDMMAAAA(initialDate).substring(0,11);
        wb.Sheets["Rentas"]["B3"].v=dateDDMMAAAA(lastDate).substring(0,11);
    }
    if (rentals.length>0){
        for (let index = 0; index < rentals.length; index++) {
            xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
                ['A', 'B','C','D','E','F','G','H','I','J',0,0,'M']
              ], {origin: -1});                     
        }
        let currentRow=8;
        rentals.forEach(purchase=>{
            wb.Sheets["Rentas"]["A"+String(currentRow)].v=purchase['Folio'];
            wb.Sheets["Rentas"]["B"+String(currentRow)].v=purchase['Fecha'];
            wb.Sheets["Rentas"]["C"+String(currentRow)].v=purchase['Hora'];
            wb.Sheets["Rentas"]["D"+String(currentRow)].v=purchase['Sucursal código'];
            wb.Sheets["Rentas"]["E"+String(currentRow)].v=purchase['Sucursal nombre'];
            wb.Sheets["Rentas"]["F"+String(currentRow)].v=purchase['Empleado nombre'];
            wb.Sheets["Rentas"]["G"+String(currentRow)].v=purchase['Empleado correo'];
            wb.Sheets["Rentas"]["H"+String(currentRow)].v=purchase['Modelo'];
            wb.Sheets["Rentas"]["I"+String(currentRow)].v=purchase['Color'];
            wb.Sheets["Rentas"]["J"+String(currentRow)].v=purchase['Etiqueta'];
            wb.Sheets["Rentas"]["K"+String(currentRow)].v=purchase['Tiempo'];
            wb.Sheets["Rentas"]["L"+String(currentRow)].v=purchase['Costo'];            
            wb.Sheets["Rentas"]["M"+String(currentRow)].v=purchase['Tipo de pago'];            
            currentRow ++;
           // ['Nombre','Habilitado general','Código','Descripción','Precio unitario','Cantidad de ventas','Importe total']


        })
    }

     headers=["Folio","Fecha","Hora","Sucursal código","Sucursal nombre","Empleado nombre","Empleado correo","Modelo","Color","Etiqueta","Tiempo","Costo","Tipo de pago"]
     //console.log(headers)

    // adjusting columns length added
     for (let i = 0; i < headers.length; i++) {  
         let columnWidth=headers[i].length;
         columnWidth=headers[i]=='Folio' ? columnWidth+20 : columnWidth;
         columnWidth=headers[i]=='Fecha' ? columnWidth+15 : columnWidth;
         columnWidth=headers[i]=='Hora' ? columnWidth+7 : columnWidth;
         columnWidth=headers[i]=='Sucursal código' ? columnWidth+5 : columnWidth;
         columnWidth=headers[i]=='Sucursal nombre' ? columnWidth+45: columnWidth;        
         columnWidth=headers[i]=='Empleado nombre' ? columnWidth+45: columnWidth;        
         columnWidth=headers[i]=='Empleado correo' ? columnWidth+45: columnWidth;
         columnWidth=headers[i]=='Modelo' ? columnWidth+10: columnWidth;        
         columnWidth=headers[i]=='Color' ? columnWidth+10: columnWidth;        
         columnWidth=headers[i]=='Etiqueta' ? columnWidth+20: columnWidth;        
         columnWidth=headers[i]=='Tiempo' ? columnWidth+5: columnWidth;        
         columnWidth=headers[i]=='Costo' ? columnWidth+5: columnWidth;
         columnWidth=headers[i]=='Tipo de pago' ? columnWidth+20: columnWidth;        
        
         wscols.push({ wch: columnWidth })
     } 
    wb.Sheets['Rentas']['!cols']=wscols;
    //console.log("Final Workbook: ",wb.Sheets["Products_vendidos"])
    let row = 8;
    while (wb.Sheets['Rentas']["G"+String(row)] != null) { 
        wb.Sheets['Rentas']["K"+String(row)].z="0.00";
        wb.Sheets['Rentas']["L"+String(row)].z="$0.00";
        row+=1;
        
    }

    let buf = XLSXStyle.write(wb, { type: "buffer" });

    reply.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    reply.header("Content-Disposition", 'attachment; filename="Rentas.xlsx"');
    return reply.send(buf); 

}

function parseDate(input) {
    let parts = input.split('-');      
    // new Date(year, month [, day [, hours[, minutes[, seconds[, ms]]]]])
    return new Date(parts[0], parts[1]-1, parts[2]); // Note: months are 0-based
    //return new Date(2022, 04, 01); // Note: months are 0-based
}

function addDays(date, days) {
    var newDate = new Date(date.valueOf());
    newDate.setDate(newDate.getDate() + days);
    return newDate;
}

function adjustTimeStamp(timestamp,offset){
    if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
        timestamp.setHours(timestamp.getHours() - offset)
    }

    return timestamp
    
}

function dateDDMMAAAA(timestamp){ 
    // console.log("RECEIVED TIME STAMP DATE FUCN",timestamp)
    // if(offset!=null){
    //     timestamp.setHours(timestamp.getHours() - offset);
    // }
    // console.log("UPDATED TIME STAMP DATE FUCN",timestamp)

    let day = timestamp.getDate();
    let month = timestamp.getMonth() + 1
    let year = timestamp.getFullYear();
    let hours = timestamp.getHours();
    
    let minutes = timestamp.getMinutes()
    let hours12 = (hours % 12) || 12;
    let dayString = day > 9 ? day : "0"+day;
    let monthString = month > 9 ? month : "0"+month;
    let stringMinutes = minutes < 10 ? "0"+minutes : minutes;
    let stringHours = hours12 < 10 ? "0"+hours12 : hours12;
    let stringDate = dayString + "-" + monthString + "-" + year 
    //let stringDate = dayString + "-" + monthString + "-" + year + " "+stringHours+":"+stringMinutes;
    //stringDate = hours >= 12 ? stringDate +" "+"PM" : stringDate +" "+"AM";
    return stringDate
}

function dateTimeHHSS(timestamp){
    //console.log("OFFSET: ",offset);
    // console.log("RECEIVED TIME STAMP HOUR FUNCTION: ",timestamp)
    // if(offset!=null){
    //     timestamp.setHours(timestamp.getHours() - offset);
    //     console.log("UPDATED TIME STAMP :",timestamp)
    // }
    

    let hours = timestamp.getHours();    
    let minutes = timestamp.getMinutes()
    let hours12 = (hours % 12) || 12;     
    let stringMinutes = minutes < 10 ? "0"+minutes : minutes;
    let stringHours = hours12 < 10 ? "0"+hours12 : hours12;
    let stringDate = stringHours+":"+stringMinutes;
    stringDate = hours >= 12 ? stringDate +" "+"PM" : stringDate +" "+"AM";
    return stringDate
}



module.exports = { rentalsReport, salesReport, reservesReport, balancesReport, paymentsReport, inventoryReport, batteriesReport, statusReport }