import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/user.model.js'
import { Follow } from '../models/follow.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    //get user details from front end ---------done
    //validation not empty ---------done
    //validation - {email, username} ----------done
    //check for image, check for avtar ----------done
    //upload on cloudinary ----------done
    //create user object from db
    //remove refresh token and password from response
    //check for creation of user
    // return response


    //get user details from front end ---------done
    const { fullName, username, email, password, bio, dob, location } = req.body
    console.log('email', email)

    // if(fullName === ''){
    //     throw new ApiError(400, "name is required")
    // }

    //validation not empty ---------done
    if (
        [fullName, email, username, password, bio, dob, location].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "all fields are required")
    }

    //validation - {email, username} ----------done
    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    })
    if (existedUser) {
        throw new ApiError(409, 'user already exist')
    }

    //check for image, check for avtar ----------done
    // Use optional chaining on both req.files and the avtar array to avoid runtime TypeError
    const avtarLocalPath = req.files?.avtar?.[0]?.path;

    if (!avtarLocalPath) {
        throw new ApiError(400, 'avtar image is required')
    }

    //upload on cloudinary ----------done
    const avtar = await uploadOnCloudinary(avtarLocalPath);
    if (!avtar) {
        throw new ApiError(400, 'avtar image is required')
    }

    //create user object from db
    const user = await User.create({
        fullName,
        avtar: avtar.url,
        email,
        password,
        bio,
        dob,
        location,
        username: username.toLowerCase()
    })

    //remove refresh token and password from response
    const createdUser = await User.findById(user._id).select(
        '-password -refreshToken'
    )

    //check for creation of user
    if (!createdUser) {
        throw new ApiError(500, 'something went wrong while registering user')
    }

    // return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, 'user registered successfully')
    )

})

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie

    const { email, username, password } = req.body

    if (!(username || email)) {
        throw new ApiError(400, "username or email not found")
    }
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (!user) {
        throw new ApiError(404, 'user does not exist')
    }
    const isPasswordCorrect = await user.isPasswordCorrect(password)
    if (!isPasswordCorrect) {
        throw new ApiError(401, 'invalid user password')
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "user logged in successfully"
            )
        )
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(

        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "user logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(402, "invalid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "refresh token is expired or used")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id)
        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "access token granted"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    console.log(req.body)
    const { oldPassword, newPassword } = req.body

    // if(!(newPassword===confpassword)){
    //     throw new ApiError(400,"password does not match")
    // }
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if (!isPasswordCorrect) {
        throw new ApiError(401, "password is not correct")
    }
    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "password changed succesfully"))

})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "user fetched successfully"))
})

const updateUserDetails = asyncHandler(async (req, res) => {
    const { username, bio } = req.body
    
    // Check if at least one field is provided (username, bio, or avatar)
    if (!username && !bio && !req.file) {
        throw new ApiError(400, "At least one of username, bio, or avatar is required");
    }

    const updateData = {};
    if (username) updateData.username = username.toLowerCase();
    if (bio) updateData.bio = bio;

    // Handle avatar if provided
    if (req.file) {
        const avtarLocalPath = req.file.path;
        const avtar = await uploadOnCloudinary(avtarLocalPath);
        if (avtar && avtar.url) {
            updateData.avtar = avtar.url;
        }
    }

    // If no fields to update, return error
    if (Object.keys(updateData).length === 0) {
        throw new ApiError(400, "No valid fields to update");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: updateData
        },
        {
            new: true,
        }
    ).select("-password")
    
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Profile updated successfully!"))
})

const updateAvtar = asyncHandler(async (req, res) => {
    const avtarLocalPath = req.file?.path
    if (!avtarLocalPath) {
        throw new ApiError(400, " avtar image required")
    }

    const avtar = await uploadOnCloudinary(avtarLocalPath)
    if (!avtar.url) {
        throw new ApiError(400, " error while uploading file on cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avtar: avtar.url
            }
        },
        {
            new: true
        }
    ).select("-password")
    return res
        .status(200)
        .json(200, user, "avtar changed successfully")


    // TODO: delete the old uploaded image
})

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath) {
        throw new ApiError(400, " cover image required")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!coverImage.url) {
        throw new ApiError(400, " error while uploading file on cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password")
    return res
        .status(200)
        .json(200, user, "cover Image changed successfully")
})
const getUserProfile = async (userId, req, isCurrentUser=false) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    let profile = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "follows",
                localField: "_id",
                foreignField: "followerId",
                as: "following", // users that are followed by current user
            },
        },
        {
            $lookup: {
                from: "follows",
                localField: "_id",
                foreignField: "followeeId",
                as: "followedBy", // users that are following the current user
            },
        },
        {
            $addFields: {
                followersCount: { $size: "$followedBy" },
                followingCount: { $size: "$following" },
            },
        },
        {
            $project: {
                followedBy: 0,
                following: 0,
            },
        },
    ]);
    let isFollowing = false;
    if (!isCurrentUser && req.user?._id && req.user?._id?.toString() !== userId.toString()) {
        const followInstance = await Follow.findOne({
            followerId: req.user?._id,
            followeeId: userId,
        });
        isFollowing = followInstance ? true : false;
    }
    const userProfile = profile[0];
    if (!userProfile) {
        throw new ApiError(404, "User profile does not exist");
    }
    return { ...userProfile, isFollowing };
};
const getMyProfile = asyncHandler(async (req, res) => {
    let profile = await getUserProfile(req.user._id, req, true);
    return res
        .status(200)
        .json(new ApiResponse(200, profile, "User profile fetched successfully"));
});
const getProfileByUserName = asyncHandler(async (req, res) => {
    const { username } = req.params;

    const user = await User.findOne({ username });

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const userProfile = await getUserProfile(user._id, req);

    return res
        .status(200)
        .json(
            new ApiResponse(200, userProfile, "User profile fetched successfully")
        );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserDetails,
    updateAvtar,
    updateCoverImage,
    getMyProfile,
    getProfileByUserName
}