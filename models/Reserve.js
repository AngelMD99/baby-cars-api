const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2');

const reserveSchema = new mongoose.Schema({
    isDeleted: {
        type: Boolean,
        default: false
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
},{
    timestamps: true,
  }
)

//statusSchema.index({ name: "text" })

reserveSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Reserve', reserveSchema)