const uuid = require("uuid");
const puppeteer = require('puppeteer');
const path = require("path");
const Rental = require('../models/Rental');
const User = require('../models/User');
const Banking = require('../models/Banking');
const Balance = require('../models/Balance');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const { getOffsetSetting } = require('../controllers/base.controller')
const Branch = require('../models/Branch');

const authorizeFunc = async function (req, reply) {
    try {

        if(!req.headers.authorization){
            return reply.code(401).send({
                status: 'fail',
                message: 'Sesión expirada'
            })
            
        }

        const decoded = await req.jwtVerify()
        // if (!decoded._id || (decoded.role!='admin') ) {
        //     return reply.code(401).send({
        //         status: 'fail',
        //         message: 'invalid_crm_token'
        //     })
        // }
    
        const branch = await Branch.findOne({_id: decoded._id, isDeleted:false});
    
        if(branch == null){
            return reply.code(401).send({
                status: 'fail',
                message: 'Sucursal autentificada no existe'
            })
        }
        // if(user.isEnabled == false){
        //     return reply.code(404).send({
        //         status: 'fail',
        //         message: 'user_disabled'
        //     })
        // }
    
        return decoded
    } catch (err) {
      return reply.code(401).send(err)
    }
}

const authorizeUserFunc = async function (req, reply) {
    try {

        if(!req.headers.authorization){
            return reply.code(401).send({
                status: 'fail',
                message: 'Sesión expirada'
            })            
        }
        const decoded = await req.jwtVerify()      
        const user = await User.findOne({_id: decoded._id, isDeleted:false});        
        if(user == null){
            return reply.code(401).send({
                status: 'fail',
                message: 'Usuario autentificado no existe'
            })             
        }
        if(user.isEnabled == false){
            return reply.code(404).send({
                status: 'fail',
                message: 'Usuario deshabilitado'
            })
        }
    
        return decoded
    } catch (err) {
      return reply.code(401).send(err)
    }
}



module.exports = function (fastify, opts, done) {
    fastify.post("/rentals/ticket", {preHandler:[authorizeUserFunc]}, async (req, reply) => {
        if(!req.body){
            return reply.code(401).send({
                status: 'fail',
                message: 'es_necesario_enviar_un_objeto'
            })
        }
        let validTypes=['rental','balance']        
        if(!req.body.type || !validTypes.includes(req.body.type)){
            return reply.code(401).send({
                status: 'fail',
                message: 'tipo de ticket no valido'
            })

        }
        if(!req.body.type=='rental' && !req.body.rentalId){
            return reply.code(401).send({
                status: 'fail',
                message: 'No se recibió el id de la renta'
            })
        }
        if(req.body.rentalId && !isValidObjectId(req.body.rentalId)){
            return reply.code(401).send({
                status: 'fail',
                message: 'Id de renta no valido'
            })
        }

        if(!req.body.type=='balance' && !req.body.balanceId){
            return reply.code(401).send({
                status: 'fail',
                message: 'No se recibió el id del corte'
            })
        }
        if(req.body.balanceId && !isValidObjectId(req.body.balanceId)){
            return reply.code(401).send({
                status: 'fail',
                message: 'Id de corte no valido'
            })
        }

        if(req.body.type=='rental'){
            const rental = await Rental.findOne({_id:req.body.rentalId}).select('-updatedAt -__v').populate('branchId', '_id name code');

            if (!rental){
                return reply.code(400).send({
                    status: 'fail',
                    message: 'renta_no_encontrada'
                })        
            } 
        
            await rental.populate(
                [{path: 'branchId', select: 'name code'},
                {path: 'carId', select: 'name color modelId'}]
            );  
            
            await rental.populate([
                { path:'carId.modelId', select:'name'}

            ])
                        
            let rentalObj = await rental.toObject();            
            if (rentalObj.branchId){
                rentalObj.branchCode=rentalObj.branchId.code ? rentalObj.branchId.code :"";
                rentalObj.branchName=rentalObj.branchId.name ? rentalObj.branchId.name :"";
                delete rentalObj.branchId;
            }
    
            if (rentalObj.carId){
                rentalObj.carName = rentalObj.carId.modelId && rentalObj.carId.modelId.name ? rentalObj.carId.modelId.name:"";
                rentalObj.carName = rentalObj.carId.color ? rentalObj.carName+" "+rentalObj.carId.color :rentalObj.carName;         
                rentalObj.carName = rentalObj.carId.name ? rentalObj.carName +" "+rentalObj.carId.name : rentalObj.carName;
                
                //delete rentalObj.carId;
            }
            let offset=req.headers.offset ? req.headers.offset:6
            let date = rental.createdAt
            
            let expirationDate = new Date(rental.createdAt)            
            expirationDate= addMinutes(expirationDate, rental.planType.time)

            let stringDate = "";
            let stringTime = "";
            let stringExpirationDate = "";
            let stringExpirationTime = "";
            
            var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
            console.log("ENVIRONMENT:",process.env.ENVIRONMENT)
            if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
                date.setHours(date.getHours() - offset);
                expirationDate.setHours(expirationDate.getHours() - offset);
                stringDate = dateDDMMAAAA(date,'date')
                stringTime = dateDDMMAAAA(date,'time')
                stringExpirationDate = dateDDMMAAAA(expirationDate,'date');
                stringExpirationTime = dateDDMMAAAA(expirationDate,'time');

            }

            else{
                stringDate = date.toLocaleDateString('es-ES', options);
                stringTime = date.toLocaleTimeString('en-ES')            
                stringExpirationDate = expirationDate.toLocaleDateString('es-ES', options);
                stringExpirationTime = expirationDate.toLocaleTimeString('en-ES')            
            }

            //console.log("DATE: ",date)
            //console.log("EXPIRATION DATE: ",expirationDate)
        // if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
        //     date.setHours(offset,0,0,0);    
        //     date.setHours(offset, 0, 0, 0);
        // }
        // else{
        //     date.setHours(0,0,0,0);
        //     date.setHours(0, 0, 0, 0);
        // }  

            rentalObj.planType.price=rentalObj.planType.price.toFixed(2)
            rentalObj.planType.time=Math.ceil(rentalObj.planType.time)
            rentalObj.date = stringDate
            rentalObj.time = stringTime        
            rentalObj.expirationDate = stringExpirationDate
            rentalObj.expirationTime = stringExpirationTime
            rentalObj.disclaimer={
                topic1:process.env.DISCLAIMER1,
                topic2:process.env.DISCLAIMER2,
                topic3:process.env.DISCLAIMER3,
                topic4:process.env.DISCLAIMER4,
                topic5:process.env.DISCLAIMER5,
            }

            //console.log("RENTAL OBJ:", rentalObj)

            delete rentalObj.__v
            let documentId = "ticket" 
            documentId = rentalObj.branchCode ? documentId+"-"+rentalObj.branchCode:documentId;
            if (rentalObj.carId){
                documentId = rentalObj.carId.modelId && rentalObj.carId.modelId.name ? documentId +"-"+ rentalObj.carId.modelId.name:documentId;
                documentId = rentalObj.carId.color ? documentId+"-"+rentalObj.carId.color :documentId;         
                documentId = rentalObj.carId.name ? documentId +"-"+rentalObj.carId.name : documentId;                                //delete rentalObj.carId;
            }
            

            documentId=documentId+"-"+ uuid.v1()+".pdf"
            return generate("ticket", rentalObj,documentId );
        }

        else{
            const balance = await Balance.findOne({_id:req.body.balanceId}).select('-updatedAt -__v').populate([
                { path:'branchId',select:'name code'},
                { path:'userId',select:'fullName email phone'}
            ]);
            if(!balance){
                return reply.code(400).send({
                    status: 'fail',
                    message: 'No se encontró el corte'
                })   
            }
            const bankingInfo = await Banking.findOne({branchId:balance.branchId._id})
            let balanceObj ={};             
            balanceObj.branchCode=balance.branchId && balance.branchId.code ? balance.branchId.code :"";
            balanceObj.branchName=balance.branchId && balance.branchId.name ? balance.branchId.name  :"";                       
            balanceObj.employee=balance.userId && balance.userId.fullName ? balance.userId.fullName :"";            
            balanceObj.quantity=1;
            //balanceObj.bankName=process.env.BANK
            //balanceObj.accountNumber=process.env.BANK_ACCOUNT;
            balanceObj.bankName=bankingInfo && bankingInfo.bank ? bankingInfo.bank :"";
            balanceObj.accountNumber=bankingInfo && bankingInfo.account ? bankingInfo.account :""
            balanceObj.reference=bankingInfo && bankingInfo.reference ? bankingInfo.reference :""
            if(balance.balanceType=='rentals'){
                balanceObj.concept="Corte de rentas cobradas en efectivo";        
            }
            if(balance.balanceType=='payments'){
                balanceObj.concept="Corte de pagos cobrados en efectivo";        
            }            
            balanceObj.total=balance.amount            
            let offset=req.headers.offset ? req.headers.offset:6
            // let date = new Date()
            let stringLoginDate = "";
            let stringLoginTime = "";            
            let ticketLoginDate="";
            let pdfLoginDate="";
            let stringBalanceDate = "";
            let stringBalanceTime = "";            
            let ticketBalanceDate="";
            let pdfBalanceDate="";            
            var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }            
            console.log("ENVIRONMENT:",process.env.ENVIRONMENT)
            if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
                balance.loginDate.setHours(balance.loginDate.getHours() - offset);
                balance.balanceDate.setHours(balance.balanceDate.getHours() - offset);
                //date.setHours(date.getHours() - offset);                
                stringLoginDate = dateDDMMAAAA(balance.loginDate,'date')
                stringLoginTime = dateDDMMAAAA(balance.loginDate,'time')
                stringBalanceDate = dateDDMMAAAA(balance.balanceDate,'date')
                stringBalanceTime = dateDDMMAAAA(balance.balanceDate,'time')                
                let loginDay = balance.loginDate.getDate();
                let loginMonth = balance.loginDate.getMonth() + 1   
                let loginYear = balance.loginDate.getFullYear();
                let balanceDay = balance.balanceDate.getDate();
                let balanceMonth = balance.balanceDate.getMonth() + 1   
                let balanceYear = balance.balanceDate.getFullYear();
                let loginDayString = loginDay > 9 ? loginDay : "0"+loginDay;                
                let loginMonthString = loginMonth > 9 ? loginMonth : "0"+loginMonth;  
                pdfLoginDate = loginDayString + "-" + loginMonthString + "-" + loginYear          
                let balanceDayString = balanceDay > 9 ? balanceDay : "0"+balanceDay;                
                let balanceMonthString = balanceMonth > 9 ? balanceMonth : "0"+balanceMonth;  
                pdfBalanceDate = balanceDayString + "-" + balanceMonthString + "-" + balanceYear          

            }
            else{
                stringLoginDate = balance.loginDate.toLocaleDateString('es-ES', options);
                stringLoginTime = balance.loginDate.toLocaleTimeString('en-ES')
                ticketLoginDate = balance.loginDate.toLocaleDateString('es-ES')            
                pdfLoginDate = ticketLoginDate.replaceAll('/', '-')                                       
                stringBalanceDate = balance.balanceDate.toLocaleDateString('es-ES', options);
                stringBalanceTime = balance.balanceDate.toLocaleTimeString('en-ES')
                ticketBalanceDate = balance.balanceDate.toLocaleDateString('es-ES')            
                pdfBalanceDate = ticketBalanceDate.replaceAll('/', '-')                                       
            }


        // if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
        //     date.setHours(offset,0,0,0);    
        //     date.setHours(offset, 0, 0, 0);
        // }
        // else{
        //     date.setHours(0,0,0,0);
        //     date.setHours(0, 0, 0, 0);
        // }

            balanceObj.loginDate = stringLoginDate;
            balanceObj.loginTime = stringLoginTime;
            balanceObj.balanceDate = stringBalanceDate;
            balanceObj.balanceTime = stringBalanceTime;

            let documentId = "balance" 
            documentId = balanceObj.branchCode && balanceObj.branchCode!="" ? documentId + "-" + balanceObj.branchCode:documentId;
            documentId = documentId + "-" + pdfBalanceDate + "-"+ uuid.v1()+ ".pdf"
            return generate("balance", balanceObj,documentId );           

        }
        
    });

    const generate = async function (template, body, documentId = '') {       
        
        // const footer = `
        // <footer style="margin: 0 4mm; width: 100%; font-size: 2mm;">
        //     <p class="float-left" style="width: 33%; float: left">
        //         <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB8AAAAfCAYAAAAfrhY5AAABgmlDQ1BzUkdCIElFQzYxOTY2LTIuMQAAKJF1kb9LQlEUxz9ZYaShUENBg4Q1ZZiB1NKglAXVYAb9WvT5K1B7vGeEtAatQUHU0q+h/oJag+YgKIog2oLmopaS13kqKJHncu753O+953DvuWCJZJSs3uSFbC6vhUMB1/zCosv6io0unPjxRRVdnZ4dj1DXvh5oMOOdx6xV/9y/ZosndAUaWoRHFVXLC08IT63nVZN3hTuUdDQufC7cr8kFhe9NPVbmN5NTZf4xWYuEg2BxCrtSNRyrYSWtZYXl5bizmTWlch/zJfZEbm5WYo94NzphQgRwMckYQenJICMy+/HgY0BW1Mn3lvJnWJVcRWaVAhorpEiTp1/UNamekJgUPSEjQ8Hs/9++6skhX7m6PQDNL4bx0QvWHShuG8b3sWEUT6DxGa5y1fzVIxj+FH27qrkPwbEJF9dVLbYHl1vQ+aRGtWhJahS3JJPwfgZtC9B+C61L5Z5V9jl9hMiGfNUN7B9An5x3LP8C6RZoIdhCA94AAAAJcEhZcwAACxMAAAsTAQCanBgAAAFsSURBVEiJ5dcxSxxBFADg79a90tiEGBOsrEyTBPwD2lpY2hibYHlFCpFUYp0uRcp0EkhhZacISjoRK22EFAqiWGhCmqDmLG4X9W73jjt37gI+GBZmmPlmZx/z2JL7URI2qlmd09hKBkO2n1hAfwq/6QJa35ZS/FMP8GOUouTNux1DiGPZSXaE6wKxlyhnDaxrPJbBAmHYyTDKUcFIW/F48RhfsFrX/6cHewkW/1/CxcnzBd7haYfrbON7JxPHceVh1+XXFkbusVfQ18muHxoRfvUCTvHPOOsFHmMXw5iUnXDPsSjAhZRm+1+s5MAbIWAtFk3h0RBwMzw4nIc3g0/Vvn8QvBU8gf0QeFdhbrO9SDjSeKKZPyMRBgqEYQaXde1tHv6+QLitiDDVJpxVCy7adA/UTkTF/VJ3gldNJsY4rJvz+s74rNYl+AO1UrqH33iGb5hLdpYX//ADT5J5H7F2Z3wEYzjPaJuYxzKqNy1axbbt20VrAAAAAElFTkSuQmCC" 
        //         class="icon" style="height: 10px; width: 10px; margin: 0px 5px 0px 0px; vertical-align: middle;"/>
        //         www.input.mx
        //     </p>
        //     <p style='text-align: center; float: left;'>`
        //         +footerText+
        //     `</p>
        //     <p style="float: right;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></p>
        // </footer>`

        var html = await fastify.view(
            "public/document_" + template + ".html",
            body
        );
        // var documentName = template + "." + uuid.v1() + ".pdf";        
        var documentName = documentId;        
        let prePath = __dirname.replace('routes','')        
        //var documentLocation = path.join(__dirname, "public/docs/") + documentName;
        var documentLocation = path.join(prePath, "public/docs/") + documentName;        
        // Uncomment line 99 and comment from 100 to 103 to run on Windows
        // const browser = await puppeteer.launch();
        const browserFetcher = puppeteer.createBrowserFetcher();
        let revisionInfo = await browserFetcher.download('1095492');
        const browser = await puppeteer.launch();

        // const browser =await puppeteer.launch({
        //   executablePath: revisionInfo.executablePath,
        //   ignoreDefaultArgs: ['--disable-extensions'],
        //   headless: true,
        //   args: ['--no-sandbox', "--disabled-setupid-sandbox"]
        // });
        // const browser = await puppeteer.launch({
        //     executablePath: '/usr/bin/chromium-browser',
        //     args: ['--no-sandbox']
        // });
        const page = await browser.newPage();
        await page.setContent(html);
        let ticketHeight = template == 'ticket' ? 1400 : 550
        //console.log("TICKET HEIGHT:",ticketHeight)

        await page.pdf({ 
            path: documentLocation, 
            //format: 'A6',
            width:210,
            height:ticketHeight,
            //displayHeaderFooter: true,
            //footerTemplate: footer
        });
        await browser.close();

        return { 
            status:'success',
            path: "docs/" + documentName 
        };
    };

    done();
};

function isValidObjectId(id){
    
    if(ObjectId.isValid(id)){
        if((String)(new ObjectId(id)) === id)
            return true;
        return false;
    }
    return false;
}

function dateDDMMAAAA(timestamp,type){ 

    console.log("DATE RECEIVED IN FUNCTION: ", timestamp)
    let day = timestamp.getDate();
    let weekday =  timestamp.getDay();
    let month = timestamp.getMonth() + 1
    let year = timestamp.getFullYear();
    let hours = timestamp.getHours();
    
    let minutes = timestamp.getMinutes()
    let hours12 = (hours % 12) || 12;
    let dayString = day > 9 ? day : "0"+day;
    let monthString = "";
    switch (month) {
        case 1:
            monthString ="Enero"            
            break;
        case 2:
            monthString ="Febrero"            
            break;
        case 3:
            monthString ="Marzo"            
            break;
        case 4:
            monthString ="Abril"            
            break;
        case 5:
            monthString ="Mayo"            
            break;
        case 6:
            monthString ="Junio"            
            break;
        case 7:
            monthString ="Julio"            
            break;
        case 8:
            monthString ="Agosto"            
            break;
        case 9:
            monthString ="Septiembre"            
            break;
        case 10:
            monthString ="Octubre"            
            break;
        case 11:
            monthString ="Noviembre"            
            break;
        case 12:
            monthString ="Diciembre"            
            break;
        default:
            break;
    }

    let stringDay=""
    switch (weekday) {
        case 0:
            stringDay ="Domingo"            
            break;
        case 1:
            stringDay ="Lunes"            
            break;
        case 2:
            stringDay ="Martes"            
            break;
        case 3:
            stringDay ="Miercoles"            
            break;
        case 4:
            stringDay ="Jueves"            
            break;
        case 5:
            stringDay ="Viernes"            
            break;
        case 6:
            stringDay ="Sabado"            
            break;
        case 7:
            stringDay ="Domingo"            
            break;        
        default:
            break;
    }

    let stringMinutes = minutes < 10 ? "0"+minutes : minutes;
    let stringHours = hours12;
    //let stringDate = dayString + "-" + monthString + "-" + year 
    let stringDate = stringDay + " " + dayString + "-" + monthString + "-" + year;
    let stringTime = stringHours+":"+stringMinutes;
    stringTime = hours >= 12 ? stringTime +" "+"PM" : stringTime +" "+"AM";
    console.log("DATE ADJUSTED IN FUNCTION: ",stringDate)
    console.log("TIME ADJUSTED IN FUNCTION: ",stringTime)

    if(type=='date'){
        return stringDate
    }

    else{
        return stringTime
    }
    
    
}

function addMinutes(date, minutes) { 
    //console.log(date)   ;
    date.setMinutes(date.getMinutes() + minutes);  
 
    return date;
}