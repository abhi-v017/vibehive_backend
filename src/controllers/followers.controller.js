import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Follow } from "../models/follow.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { getMongoosePaginationOptions } from '../utils/getMongoosePaginationOptions.js'


const followUnFollowUser = asyncHandler(async (req, res) => {
    const { userId: toBeFollowedUserId } = req.params;
    console.log(toBeFollowedUserId);

    // See if user that is being followed exist
    const toBeFollowed = await User.findById(toBeFollowedUserId);

    if (!toBeFollowed) {
        throw new ApiError(404, "User does not exist");
    }

    // Check of the user who is being followed is not the one who is requesting
    if (toBeFollowedUserId.toString() === req.user._id.toString()) {
        throw new ApiError(422, "You cannot follow yourself");
    }

    // Check if logged user is already following the to be followed user
    const isAlreadyFollowing = await Follow.findOne({
        followerId: req.user._id,
        followeeId: toBeFollowed._id,
    });

    if (isAlreadyFollowing) {
        // if yes, then unfollow the user by deleting the follow entry from the DB
        await Follow.findOneAndDelete({
            followerId: req.user._id,
            followeeId: toBeFollowed._id,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    following: false,
                },
                "Un-followed successfully"
            )
        );
    } else {
        // if no, then create a follow entry
        await Follow.create({
            followerId: req.user._id,
            followeeId: toBeFollowed._id,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    following: true,
                },
                "Followed successfully"
            )
        );
    }
});

const getFollowersListByUserName = asyncHandler(async (req, res) => {
    const { username } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const userAggregation = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase(),
            },
        },
        {
            $lookup: {
                // lookup for the each user's profile
                from: "users",
                localField: "_id",
                foreignField: "owner",
                as: "profile",
                pipeline: [
                    {
                        $project: {
                            username:1,
                            bio: 1,
                            location: 1,
                            coverImage: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: { profile: { $first: "$profile" } },
        },
        {
            $project: {
                username: 1,
                email: 1,
                avtar: 1,
                profile: 1,
            },
        },
    ]);

    const user = userAggregation[0];

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }
    const userId = user._id;
    const followersAggregate = Follow.aggregate([
        {
            $match: {
                followeeId: new mongoose.Types.ObjectId(userId),
            },
        },
        // Now we have all the follow documents where current user is followee (who is being followed)
        {
            $lookup: {
                // Lookup for the followers (users which are following current users)
                from: "users",
                localField: "followerId",
                foreignField: "_id",
                as: "follower",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "_id",
                            foreignField: "owner",
                            as: "profile",
                        },
                    },
                    {
                        $lookup: {
                            from: "follows",
                            localField: "_id",
                            foreignField: "followeeId",
                            as: "isFollowing",
                            pipeline: [
                                {
                                    $match: {
                                        followerId: new mongoose.Types.ObjectId(req.user?._id), // Only get documents where logged in user is the follower
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            profile: { $first: "$profile" },
                            isFollowing: {
                                $cond: {
                                    if: {
                                        $gte: [
                                            {
                                                // if the isFollowing key has document in it
                                                $size: "$isFollowing",
                                            },
                                            1,
                                        ],
                                    },
                                    then: true,
                                    else: false,
                                },
                            },
                        },
                    },
                    {
                        $project: {
                            username: 1,
                            email: 1,
                            avtar: 1,
                            profile: 1,
                            isFollowing: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                follower: { $first: "$follower" },
            },
        },
        {
            $project: {
                _id: 0,
                follower: 1,
            },
        },
        {
            $replaceRoot: {
                newRoot: "$follower",
            },
        },
    ]);

    const followersList = await Follow.aggregatePaginate(
        followersAggregate,
        getMongoosePaginationOptions({
            page,
            limit,
            customLabels: {
                totalDocs: "totalFollowers",
                docs: "followers",
            },
        })
    );
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user, ...followersList },
                "Followers list fetched successfully"
            )
        );
});
const getFollowingListByUserName = asyncHandler(async (req, res) => {
    const { username } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const userAggregation = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase(),
            },
        },
        {
            $lookup: {
                // lookup for the each user's profile
                from: "users",
                localField: "_id",
                foreignField: "owner",
                as: "profile",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            bio: 1,
                            location: 1,
                            coverImage: 1,
                            avtar: 1, // Include avtar in the profile projection
                        },
                    },
                ],
            },
        },
        {
            $addFields: { profile: { $first: "$profile" } },
        },
        {
            $project: {
                username: 1,
                email: 1,
                avtar: 1, // Include avtar in the main user projection
                profile: 1,
            },
        },
    ]);

    const user = userAggregation[0];

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const userId = user._id;
    const followingAggregate = Follow.aggregate([
        {
            $match: {
                followerId: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "followeeId",
                foreignField: "_id",
                as: "following",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "_id",
                            foreignField: "owner",
                            as: "profile",
                        },
                    },
                    {
                        $lookup: {
                            from: "follows",
                            localField: "_id",
                            foreignField: "followeeId",
                            as: "isFollowing",
                            pipeline: [
                                {
                                    $match: {
                                        followerId: new mongoose.Types.ObjectId(req.user?._id), // Only get documents where logged in user is the follower
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            profile: { $first: "$profile" },
                            isFollowing: {
                                $cond: {
                                    if: {
                                        $gte: [
                                            {
                                                $size: "$isFollowing",
                                            },
                                            1,
                                        ],
                                    },
                                    then: true,
                                    else: false,
                                },
                            },
                        },
                    },
                    {
                        $project: {
                            username: 1,
                            email: 1,
                            avtar: 1,
                            profile: 1,
                            isFollowing: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                following: { $first: "$following" },
            },
        },
        {
            $project: {
                _id: 0,
                following: 1,
            },
        },
        {
            $replaceRoot: {
                newRoot: "$following",
            },
        },
    ]);

    const followingList = await Follow.aggregatePaginate(
        followingAggregate,
        getMongoosePaginationOptions({
            page,
            limit,
            customLabels: {
                totalDocs: "totalFollowing",
                docs: "following",
            },
        })
    );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user, ...followingList },
                "Following list fetched successfully"
            )
        );
});



export {
    followUnFollowUser,
    getFollowersListByUserName,
    getFollowingListByUserName
};