import { asyncHandler } from "../utils/asyncHandler.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Post } from "../models/post.model.js";

const likeDislikePost = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    console.log(post);
    if (!post) {
        return next(new ApiError(404, "Post not found"));
    }
    const isAlreadyLiked = await Like.findOne({
        post: postId,
        likedBy: req.user?._id,
    });
    if (isAlreadyLiked) {
        // if already liked, dislike it by removing the record from the DB
        await Like.findOneAndDelete({
            post: postId,
            likedBy: req.user?._id,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    isLiked: false,
                },
                "Unliked successfully"
            )
        );
    }else{
        await Like.create({
            post: postId,
            likedBy: req.user?._id,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    isLiked: true,
                },
                "Liked successfully"
            )
        );
    }
});



export { likeDislikePost }