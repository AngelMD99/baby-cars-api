const Branch = require('../models/Branch');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");

const branchCreate = async function (req, reply){
    //let loggedUser = await req.jwtVerify();

    let branchCode = await Branch.findOne({code: req.body.code.toUpperCase(), isDeleted:false})
    if(branchCode != null){
        return reply.code(400).send({
            status: 'fail',
            message: 'branch_code_already_in_use'
        })
    }    

    if(req.body.code.indexOf(' ') >= 0){
            return reply.code(400).send({
                status: 'fail',
                message: 'white_spaces_not_allowed_on_branch_code'
            })
    }
    
    //let theCode = req.body.branchCode.toUpperCase();        
    
    const branch = new Branch(req.body);
    let plainPassword = branch.password;
    let hash = bcrypt.hashSync(plainPassword, 12)
    branch._id = mongoose.Types.ObjectId();
    branch.password=hash;
    await branch.save()

    //await saveHistory(loggedUser,"CREATED","Branch",branch)

    const branchObj = await branch.toObject()

    reply.code(201).send({
        status: 'success',
        data: branchObj
     }) 
     

}

const branchShow = async function (req, reply){
    
}

const branchUpdate = async function (req, reply){
    
}

const branchDelete = async function (req, reply){
    
}

const branchList = async function (req, reply){
    
}

const branchLogin = async function (req, reply){
    
}


module.exports = { branchCreate, branchShow, branchUpdate, branchDelete, branchList, branchLogin}
//module.exports = { branchList, branchData, branchIn, branchSchedules, branchOrders, branchChangeOrderStatus, branchDiscardOrder, branchProducts, branchOptions, getbranchProducts, branchProductsStatus, branchProductsOptions }