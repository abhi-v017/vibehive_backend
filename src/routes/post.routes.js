import { Router } from "express";
import {createPost, updatePostDetails, deletePost, getAllPosts, getPostByUsername, getMyPosts, updatePostImages, getPostById} from '../controllers/post.controller.js'
import { upload } from '../middlewares/multer.middleware.js'
import {verifyJwt} from "../middlewares/auth.middleware.js"

const router = Router()

router.route('/create-post').post(verifyJwt, upload.array('images'),createPost)
router.route('/delete/:id').delete(verifyJwt, deletePost)
router.route('/all-posts').get(verifyJwt, getAllPosts)
router.route('/update-post-detail/:id').patch(verifyJwt, updatePostDetails)
router.route('/update-post-image/:id').patch(verifyJwt, upload.array('images'), updatePostImages)
router.route('/get/u/:username').get(verifyJwt, getPostByUsername)
router.route("/get/my").get(verifyJwt, getMyPosts);
router.route("/get/:id").get(verifyJwt, getPostById)


export default router