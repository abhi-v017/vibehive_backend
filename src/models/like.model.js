import mongoose, {Schema} from "mongoose";

const likeSchema = new Schema({
    post:{
        type: Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    },
    likedBy:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {timestamps: true})

export const Like = mongoose.model("Like", likeSchema)