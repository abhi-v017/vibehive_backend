import { Router } from "express";
import {verifyJwt} from "../middlewares/auth.middleware.js"
import { likeDislikePost } from "../controllers/likes.controller.js";


const router = Router()
router.route("/like/:postId").post(verifyJwt, likeDislikePost);


export default router