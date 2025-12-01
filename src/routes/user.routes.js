import { Router } from "express";
import {registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateUserDetails, updateAvtar, getProfileByUserName, getMyProfile} from '../controllers/user.controller.js'
import { upload } from '../middlewares/multer.middleware.js'
import {verifyJwt} from "../middlewares/auth.middleware.js"

const router = Router()
router.route('/register').post(
    upload.fields([
        {
            name: "avtar",
            maxCount:1
        }
    ]),
    registerUser)
router.route('/login').post(loginUser)

//secured routes
router.route('/logout').post(verifyJwt, logoutUser)
router.route('/refresh-token').post(refreshAccessToken)
router.route('/change-password').post(verifyJwt, changeCurrentPassword)
router.route('/current-user').get(verifyJwt, getCurrentUser)
router.route('/update-details').patch(verifyJwt, upload.single('avtar'), updateUserDetails)
router.route('/update-avtar').patch(verifyJwt, upload.single('avtar'), updateAvtar)
router.route('/c/:username').get(verifyJwt, getProfileByUserName)
router.route('/').get(verifyJwt, getMyProfile)




export default router