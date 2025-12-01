import { Router } from "express";
import {verifyJwt} from "../middlewares/auth.middleware.js"
import { followUnFollowUser, getFollowersListByUserName,getFollowingListByUserName  } from "../controllers/followers.controller.js";

const router = Router()


router.route("/follow/:userId").post(verifyJwt, followUnFollowUser);
router.route("/followers-list/:username").get(verifyJwt, getFollowersListByUserName);
router.route("/following-list/:username").get(verifyJwt, getFollowingListByUserName);

export default router