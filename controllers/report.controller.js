const Rental = require('../models/Rental');
const Sale = require('../models/Sale');
const Payment = require('../models/Payment');
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
const { getOffsetSetting } = require('../controllers/base.controller')

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
    console.log("RENTALS: ", rentals[0]);
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

    console.log("RENTALS DATE ADJUSTED: ", rentals[0]);
    
   

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
    console.log("sales: ", sales[0]);    
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

    console.log("sales DATE ADJUSTED: ", sales[0]);
    
   

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



module.exports = { rentalsReport, salesReport }