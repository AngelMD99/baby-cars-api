const axios = require('axios');
var Moment = require('moment');
const Setting = require('../models/Setting');



const main = async function(req,reply){
    return 'Baby Cars API\n All Rights Reserved.'
}

const getOffsetSetting = async function(){
    let currentSetting = await Setting.findOne({isDeleted:false, isEnabled:true});

    if (currentSetting!=null){
        return currentSetting.offset;        
    }
    else{
        return 7
    }


}

module.exports = { main, getOffsetSetting }