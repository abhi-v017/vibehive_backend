import mongoose, { Schema } from "mongoose";
import { User } from "./user.model.js";

const profileSchema = new Schema(
    {
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        bio: {
            type: String,
            required: true,
            trim: true
        },
        dob: {
            type: Date,
            required: true
        },
        location: {
            type: String,
            default: "Earth",
        },
    }
)

export const Profile = mongoose.model("Profile", profileSchema);