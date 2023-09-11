const Balance = require('../models/Balance');
const Status = require('../models/Status');
const Branch = require('../models/Branch');
const Rental = require('../models/Rental');
const Payment = require('../models/Payment');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
const Modelo = require('../models/Modelo');
const Car = require('../models/Car');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");
const { getOffsetSetting } = require('../controllers/base.controller');
const User = require('../models/User');
const { integer } = require('sharp/lib/is');

const balanceRentalsCreate = async function (req,reply){
    let branchInfo = await Branch.findOne({_id:req.params.id, isDeleted:false})
    if(!branchInfo){
        if (!branchInfo){
            return reply.code(400).send({
                status: 'fail',
                message: 'sucursal_no_encontrada'
            })        
        } 
    }
    const decoded = await req.jwtVerify();    
    let loggedUser = await User.findOne({_id:decoded._id})  
    
    if(loggedUser == null){
        return reply.code(401).send({
            status: 'fail',
            message: 'Usuario autentificado no existe'
        })
    }
    let today = new Date ();    
    let searchQuery = {
        isDeleted: false,
        branchId:ObjectId(req.params.id),
        updatedAt:{"$gte": loggedUser.lastLogin,"$lte":today},        
        paymentType:{ $regex:"efectivo",$options:'i'}
		
    };
    let rentalsQuery = await Rental.find(searchQuery)
    let userBalanceValidation= await Balance.findOne({
        balanceType:'payments',
        branchId: req.params.id,
        userId: loggedUser._id,
        loginDate:loggedUser.lastLogin,

    })
    if(userBalanceValidation){
        if (rentalsQuery.length>0){
            let rentalSum = 0; 
            userBalanceValidation.quantity=rentalsQuery.length
            rentalsQuery.forEach(cashRental=>{
            rentalSum = rentalSum + cashRental.planType.price
            })        
            userBalanceValidation.amount = rentalSum;           
        }
        await userBalanceValidation.save();
        await userBalanceValidation.populate([
            { path:'branchId',select:'name code'},
            { path:'userId',select:'fullName email phone'}
        ])    
        const balanceSavedObj = await userBalanceValidation.toObject()
        delete balanceSavedObj._v;
        return reply.code(201).send({
            status: 'success',
            data:balanceSavedObj
        })
    }

    else{        
        let balanceObj={
            balanceType:'payments',
            branchId:req.params.id,
            userId: loggedUser._id,
            loginDate:loggedUser.lastLogin,
            amount:0,
            quantity:0
        };
    
        if (rentalsQuery.length>0){
            balanceObj.quantity=rentalsQuery.length
            rentalsQuery.forEach(cashRental=>{
            balanceObj.amount = balanceObj.amount + cashRental.planType.price
            })         
            
        }
    
        const balance = new Balance(balanceObj);
        balance._id = new mongoose.Types.ObjectId();
        await balance.save();
        await balance.populate([
            { path:'branchId',select:'name code'},
            { path:'userId',select:'fullName email phone'}
        ])
    
        const balanceSavedObj = await balance.toObject()
        delete balanceSavedObj._v;
        return reply.code(201).send({
            status: 'success',
            data:balanceSavedObj
        })   
    }              

}

const balancePaymentsCreate = async function (req,reply){
    let branchInfo = await Branch.findOne({_id:req.params.id, isDeleted:false})
    if(!branchInfo){
        if (!branchInfo){
            return reply.code(400).send({
                status: 'fail',
                message: 'sucursal_no_encontrada'
            })        
        } 
    }
    const decoded = await req.jwtVerify();    
    let loggedUser = await User.findOne({_id:decoded._id})  
    
    if(loggedUser == null){
        return reply.code(401).send({
            status: 'fail',
            message: 'Usuario autentificado no existe'
        })
    }
    let today = new Date ();    
    let searchQuery = {
        isDeleted: false,
        isDiscarded:false,
        branchId:ObjectId(req.params.id),
        paidOn:{"$gte": loggedUser.lastLogin,"$lte":today},
        paymentType:{ $regex:"efectivo",$options:'i'}
    };
    console.log("SEARCH QUERY: ",searchQuery);
    let paymentsQuery = await Payment.find(searchQuery)
    console.log("RENTALS QUERY: ",paymentsQuery)

    let userBalanceValidation= await Balance.findOne({
        balanceType:'payments',
        branchId: req.params.id,
        userId: loggedUser._id,
        loginDate:loggedUser.lastLogin,

    })
    if(userBalanceValidation){
        if (paymentsQuery.length>0){
            let rentalSum = 0; 
            userBalanceValidation.quantity=paymentsQuery.length
            paymentsQuery.forEach(cashPayment=>{
            rentalSum = rentalSum + cashPayment.amount
            })        
            userBalanceValidation.amount = rentalSum;           
        }
        await userBalanceValidation.save();
        await userBalanceValidation.populate([
            { path:'branchId',select:'name code'},
            { path:'userId',select:'fullName email phone'}
        ])    
        const balanceSavedObj = await userBalanceValidation.toObject()
        delete balanceSavedObj._v;
        return reply.code(201).send({
            status: 'success',
            data:balanceSavedObj
        })
    }

    else{
        console.log("NEW")
        let balanceObj={
            balanceType:'payments',
            branchId:req.params.id,
            userId: loggedUser._id,
            loginDate:loggedUser.lastLogin,
            amount:0,
            quantity:0
        };
    
        if (paymentsQuery.length>0){
            balanceObj.quantity=paymentsQuery.length
            paymentsQuery.forEach(cashPayment=>{
            balanceObj.amount = balanceObj.amount + cashPayment.amount
            })         
            
        }
    
        const balance = new Balance(balanceObj);
        balance._id = new mongoose.Types.ObjectId();
        await balance.save();
        await balance.populate([
            { path:'branchId',select:'name code'},
            { path:'userId',select:'fullName email phone'}
        ])
    
        const balanceSavedObj = await balance.toObject()
        delete balanceSavedObj._v;
        return reply.code(201).send({
            status: 'success',
            data:balanceSavedObj
        })   
    }              

}

const balanceShow = async function (req,reply){
    
}

const balanceList = async function (req,reply){
    
}

const balanceDelete = async function (req,reply){
    
}

const balanceUpdate = async function (req,reply){
    
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

module.exports = { balanceRentalsCreate, balanceDelete, balanceList, balanceShow, balanceUpdate, balancePaymentsCreate}