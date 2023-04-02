const uuid = require("uuid");
const puppeteer = require('puppeteer');
const path = require("path");
const Rental = require('../models/Rental');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const { getOffsetSetting } = require('../controllers/base.controller')


module.exports = function (fastify, opts, done) {
    fastify.post("/rentals/ticket", async (req, reply) => {
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
                {path: 'carId', select: 'name'}]
            ); 
            
            let rentalObj = await rental.toObject();            
            if (rentalObj.branchId){
                rentalObj.branchCode=rentalObj.branchId.code ? rentalObj.branchId.code :"";
                rentalObj.branchName=rentalObj.branchId.name ? rentalObj.branchId.name :"";
                delete rentalObj.branchId;
            }
    
            if (rentalObj.carId){
                rentalObj.carName=rentalObj.carId.name ? rentalObj.carId.name :"";        
                delete rentalObj.carId;
            }
            let offset=req.headers.offset ? req.headers.offset:7
            let date = rental.createdAt
        // if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
        //     date.setHours(offset,0,0,0);    
        //     date.setHours(offset, 0, 0, 0);
        // }
        // else{
        //     date.setHours(0,0,0,0);
        //     date.setHours(0, 0, 0, 0);
        // }  
            var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
            let stringDate = date.toLocaleDateString('es-ES', options);
            let stringTime = date.toLocaleTimeString('en-ES') 
            rentalObj.planType.price=rentalObj.planType.price.toFixed(2)
            rentalObj.planType.time=Math.ceil(rentalObj.planType.time)
            rentalObj.date = stringDate
            rentalObj.time = stringTime        
            delete rentalObj.__v
            return generate("ticket", rentalObj );
        }

        else{
            let balanceObj ={};             
            balanceObj.branchCode=req.body.branchCode ? req.body.branchCode :"";
            balanceObj.branchName=req.body.branchName ? req.body.branchName :"";                       
            balanceObj.quantity=1;
            balanceObj.bankName="BANAMEX";
            balanceObj.accountNumber="144-44711547-4145";
            balanceObj.concept="Rentas diarias en efectivo";        
            balanceObj.total=req.body.total
            
            let offset=req.headers.offset ? req.headers.offset:7
            let date = new Date()
        // if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
        //     date.setHours(offset,0,0,0);    
        //     date.setHours(offset, 0, 0, 0);
        // }
        // else{
        //     date.setHours(0,0,0,0);
        //     date.setHours(0, 0, 0, 0);
        // }  
            var options = { weekday: 'long', year: 'numeric', month: 'long' }
            let stringDate = date.toLocaleDateString('es-ES', options);            
            balanceObj.date = stringDate            
            
            return generate("balance", balanceObj );           

        }
        
    });

    const generate = async function (template, body, footerText = '') {        


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
        var documentName = template + "." + uuid.v1() + ".pdf";        
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

        await page.pdf({ 
            path: documentLocation, 
            //format: 'A6',
            width:185,
            height:600,
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

function dateDDMMAAAA(timestamp,offset){ 
    // console.log("timestamp:",timestamp.getHours())
    if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
        date.setHours(offset,0,0,0);    
        date.setHours(offset, 0, 0, 0);
        }
        else{
            date.setHours(0,0,0,0);
            date.setHours(0, 0, 0, 0);
        }  
    // if(offset!=null){
    //     timestamp.setHours(timestamp.getHours() + offset);
    // }

    
    let day = timestamp.getDate();
    let month = timestamp.getMonth() + 1
    let year = timestamp.getFullYear();
    let hours = timestamp.getHours();
    
    let minutes = timestamp.getMinutes()
    let hours12 = (hours % 12) || 12;
    let dayString = day > 9 ? day : "0"+day;
    let monthString = "";
    switch (month) {
        case 1:
            monthString ="ENE"            
            break;
        case 2:
            monthString ="FEB"            
            break;
        case 3:
            monthString ="MAR"            
            break;
        case 4:
            monthString ="ABR"            
            break;
        case 5:
            monthString ="MAY"            
            break;
        case 6:
            monthString ="JUN"            
            break;
        case 7:
            monthString ="JUL"            
            break;
        case 8:
            monthString ="AGO"            
            break;
        case 9:
            monthString ="SEP"            
            break;
        case 10:
            monthString ="OCT"            
            break;
        case 11:
            monthString ="NOV"            
            break;
        case 12:
            monthString ="DIC"            
            break;
        default:
            break;
    }
    let stringMinutes = minutes < 10 ? "0"+minutes : minutes;
    let stringHours = hours12 < 10 ? "0"+hours12 : hours12;
    //let stringDate = dayString + "-" + monthString + "-" + year 
    let stringDate = dayString + "-" + monthString + "-" + year + " "+stringHours+":"+stringMinutes;
    stringDate = hours >= 12 ? stringDate +" "+"PM" : stringDate +" "+"AM";
    return stringDate
}