const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2');

const reserveSchema = new mongoose.Schema({
    isDeleted: {
        type: Boolean,
        default: false
    },
    folio:{
        type:String
    },
    modelId: {
        type: mongoose.Schema.Types.ObjectId,              
        ref: "Car", 
    },
    color:String,
    clientId: {
        type: mongoose.Schema.Types.ObjectId,              
        ref: "Client", 
    }, 
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch", 
    },       
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", 
    },
},{
    timestamps: true,
  }
)

//statusSchema.index({ name: "text" })

reserveSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Reserve', reserveSchema)