const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2');


const modelSchema = new mongoose.Schema({
    isDeleted: {
        type: Boolean,
        default: false
    },    
    
    name: {
        type: String,
        required: false
    },
    colors: [{
        type:String,
        lowercase:true
    }
        
    ],    
    
    
},{
    timestamps: true,
  }
)




modelSchema.index({ name: "name" })
modelSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Modelo', modelSchema)