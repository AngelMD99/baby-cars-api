const Rental = require('../models/Rental');
const Car = require('../models/Car');
const Branch = require('../models/Branch');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");
const xlsx = require('xlsx');
const XLSXStyle  = require("xlsx-style");

const rentalsReport = async function (req, reply){
    let aggregateQuery=[];

    if(req.query.branchId != null){
        let branchId = mongoose.Types.ObjectId(req.query.branchId)
        aggregateQuery.push({ "$match": {"branchId": branchId }});        
    }

    if(req.query.carId != null){
        let carId = mongoose.Types.ObjectId(req.query.carId)
        aggregateQuery.push({ "$match": {"carId": carId }});        
    }
    
    if (req.query.initialDate != null && req.query.lastDate != null){
        let initialDate = parseDate(req.query.initialDate);
        let offset = req.header.offset ? Number(req.header.offset) : 6        

        //initialDate.setHours(0,0,0,0);
        let lastDate = parseDate(req.query.lastDate);
        lastDate = addDays(lastDate, 1)
        if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
            initialDate.setHours(offset,0,0,0);    
            lastDate.setHours(offset, 0, 0, 0);
        }
        else{
            initialDate.setHours(0,0,0,0);
            lastDate.setHours(0, 0, 0, 0);
    
        }
        aggregateQuery.push({ "$match": {"createdAt": {"$gte": initialDate,"$lte":lastDate}}});        
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
            '$project': {
                'Sucursal código':{
                    '$first': '$branchInfo.code'
                },
                'Sucursal nombre': {
                    '$first': '$branchInfo.name'
                  },
                'Carrito': {
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
            rental.Fecha=dateDDMMAAAA(rental.createdAt);
            rental.Hora=dateTimeHHSS(rental.createdAt);
        }
    })
    
   

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
    var ws_data = [['Sucursal','','','','','','','']]
    var ws = xlsx.utils.aoa_to_sheet(ws_data);       
    wb.Sheets["Rentas"] = ws;
    wb.Sheets["Rentas"]["A1"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            },       
    }
    xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
            ['Carrito', '', '', '','','','','']
          ],{origin: -1});
    wb.Sheets["Rentas"]["A2"].s={        
        font: {				  		
                sz: 12, // tamaño de fuente
                bold: true // negrita
        },       
    }
    
    if(req.query.initialDate != null && req.query.lastDate !=null ){        
        xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
            ['Fecha inicial', '', '', '','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
            ['Fecha final', '', '', '','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
            ['', '', '', '','','','','']
          ], {origin: -1});

        wb.Sheets["Rentas"]["A3"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            }               
        }
        wb.Sheets["Rentas"]["A4"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            }               
        }
    }
    else{
        xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
            ['Sin rango de fechas', '', '', '','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
            ['', '', '', '','','','','']
          ], {origin: -1});
        xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
            ['', '', '', '','','','','']
          ], {origin: -1});
        wb.Sheets["Rentas"]["A3"].s={        
            font: {				  		
                  sz: 12, // tamaño de fuente
                  bold: true // negrita
            }               
        }
    }

    xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
        ['Fecha','Hora','Sucursal código','Sucursal nombre','Carrito','Tiempo','Costo','Tipo de pago']
      ], {origin: -1});
    
    wb.Sheets["Rentas"]["A6"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["B6"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["C6"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["D6"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["E6"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["F6"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["G6"].s={        
        font: {				  		
              sz: 12, // tamaño de fuente
              bold: true // negrita
        }               
    }
    wb.Sheets["Rentas"]["H6"].s={        
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
//     wb.Sheets["Rentas"]["A2"]={};
    if(req.query.initialDate != null && req.query.lastDate !=null ){ 
        let initialDate = parseDate(req.query.initialDate);
        let offset = req.header.offset ? Number(req.header.offset) : 6        
        let lastDate = parseDate(req.query.lastDate);

        if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
            initialDate.setHours(offset,0,0,0);    
            lastDate.setHours(offset, 0, 0, 0);
        }
        else{
            initialDate.setHours(0,0,0,0);
            lastDate.setHours(0, 0, 0, 0);
    
        }      
        wb.Sheets["Rentas"]["B2"].v=dateDDMMAAAA(initialDate,offset).substring(0,11);
        wb.Sheets["Rentas"]["B3"].v=dateDDMMAAAA(lastDate,offset).substring(0,11);
    }
    if (rentals.length>0){
        for (let index = 0; index < rentals.length; index++) {
            xlsx.utils.sheet_add_aoa(wb.Sheets["Rentas"], [
                ['A', 'B', 'C','D','E',0,0,'H']
              ], {origin: -1});                     
        }
        let currentRow=7;
        rentals.forEach(purchase=>{
            wb.Sheets["Rentas"]["A"+String(currentRow)].v=purchase['Fecha'];
            wb.Sheets["Rentas"]["B"+String(currentRow)].v=purchase['Hora'];
            wb.Sheets["Rentas"]["C"+String(currentRow)].v=purchase['Sucursal código'];
            wb.Sheets["Rentas"]["D"+String(currentRow)].v=purchase['Sucursal nombre'];
            wb.Sheets["Rentas"]["E"+String(currentRow)].v=purchase['Carrito'];
            wb.Sheets["Rentas"]["F"+String(currentRow)].v=purchase['Tiempo'];
            wb.Sheets["Rentas"]["G"+String(currentRow)].v=purchase['Costo'];
            wb.Sheets["Rentas"]["H"+String(currentRow)].v=purchase['Tipo de pago'];            
            currentRow ++;
           // ['Nombre','Habilitado general','Código','Descripción','Precio unitario','Cantidad de ventas','Importe total']


        })
    }

     headers=["Fecha","Hora","Sucursal código","Sucursal nombre","Carrito","Tiempo","Costo","Tipo de pago"]
     //console.log(headers)

    // adjusting columns length added
     for (let i = 0; i < headers.length; i++) {  
         let columnWidth=headers[i].length;
         columnWidth=headers[i]=='Fecha' ? columnWidth+15 : columnWidth;
         columnWidth=headers[i]=='Hora' ? columnWidth+7 : columnWidth;
         columnWidth=headers[i]=='Sucursal código' ? columnWidth+5 : columnWidth;
         columnWidth=headers[i]=='Sucursal nombre' ? columnWidth+45: columnWidth;        
         columnWidth=headers[i]=='Carrito' ? columnWidth+20: columnWidth;        
         columnWidth=headers[i]=='Tiempo' ? columnWidth+5: columnWidth;        
         columnWidth=headers[i]=='Costo' ? columnWidth+5: columnWidth;
         columnWidth=headers[i]=='Tipo de pago' ? columnWidth+20: columnWidth;        
        
         wscols.push({ wch: columnWidth })
     } 
    wb.Sheets['Rentas']['!cols']=wscols;
    //console.log("Final Workbook: ",wb.Sheets["Products_vendidos"])
    let row = 7;
    while (wb.Sheets['Rentas']["F"+String(row)] != null) { 
        wb.Sheets['Rentas']["F"+String(row)].z="0.00";
        wb.Sheets['Rentas']["G"+String(row)].z="$0.00";
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

function dateDDMMAAAA(timestamp,offset){ 
    if(offset!=null){
        timestamp.setHours(timestamp.getHours() - offset);
    }
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

function dateTimeHHSS(timestamp,offset){
    if(offset!=null){
        timestamp.setHours(timestamp.getHours() - offset);
    }    
    let hours = timestamp.getHours();    
    let minutes = timestamp.getMinutes()
    let hours12 = (hours % 12) || 12;    
    let stringMinutes = minutes < 10 ? "0"+minutes : minutes;
    let stringHours = hours12 < 10 ? "0"+hours12 : hours12;
    let stringDate = stringHours+":"+stringMinutes;
    stringDate = hours >= 12 ? stringDate +" "+"PM" : stringDate +" "+"AM";
    return stringDate
}



module.exports = { rentalsReport }