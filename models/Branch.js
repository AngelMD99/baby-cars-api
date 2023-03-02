const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2');

const branchSchema = new mongoose.Schema({
    isDeleted: {
        type: Boolean,
        default: false
    },
    code:{
        type:String,
        required:true,
        uppercase:true
    },
    name: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    
},{
    timestamps: true,
  }
)

branchSchema.index({ name: "text" })

branchSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('Branch', branchSchema)