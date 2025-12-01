import mongoose, {Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const postSchema = new Schema(
    {
        images:{
            type: [
                {
                    url: String,
                }
            ],
            default: [],
            required: true,
        },
        content:{
            type: String,
            required: true,
        },
        tags:{
            type: [String],
            default: []
        },
        likesCount:{
            type: [Schema.Types.ObjectId],
            ref: "Likes",
            default: []
        },
        owner:{
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
)
postSchema.plugin(mongooseAggregatePaginate);

export const Post = mongoose.model("Post", postSchema)