const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2');

const settingSchema = new mongoose.Schema(
    
    {
      isDeleted:{
        type:Boolean,
        default:false
      },
      isEnabled:{
        type:Boolean,
        default:true
      },

      offset: {
        type: Number,      
      },                 
    },
    {
      timestamps: true,
    }
  );

settingSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('Setting', settingSchema)