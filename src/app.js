import express from 'express'
import cors from'cors'
import cookieParser from 'cookie-parser'

const app = express()

app.use(cors({
    origin: [
      'http://localhost:5173',           // local frontend
      'https://vibhive.vercel.app',      // deployed frontend
    ],
    credentials: true,
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

// import user router
import userRouter from './routes/user.routes.js'
import postRouter from './routes/post.routes.js'
import likeRouter from './routes/like.routes.js'
import followRouter from './routes/follow.routes.js'
// import videoRouter from './routes/video.routes.js'

// route declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/posts", postRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/follows", followRouter)

export { app }