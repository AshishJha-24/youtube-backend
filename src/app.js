import express from 'express'
import cookieParser from 'cookie-parser';
import cors from "cors"
const app = express();


app.use(cors({
    origin:"http://localhost:1234",
    credentials: true
}))
app.use(express.json({
    limit:"50mb"
}))

app.use(express.urlencoded({
    extended:true,
    limit:"50mb"
}))
app.use(express.static("public"))

app.use(cookieParser())



//routes import
import userRouter from "./routes/user.routes.js"
import tweetRouter from "./routes/tweet.routes.js"
import commentRouter from "./routes/comment.routes.js"
import videoRouter from "./routes/video.routes.js"
import dashboardRouter from "./routes/dashboard.routes.js";
import healthcheckRouter from "./routes/healthcheck.routes.js"
import likeRouter from "./routes/likes.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"
app.use("/api/v1/healthcheck",healthcheckRouter)


//routes declaration
app.use("/api/v1/users",userRouter)
// http://localhost:8000/api/v1/users/register

app.use("/api/v1/tweets",tweetRouter)
app.use("/api/v1/comment",commentRouter)
app.use("/api/v1/video",videoRouter)
app.use("/api/v1/dashboard",dashboardRouter);
app.use("/api/v1/likes",likeRouter);
app.use("/api/v1/playlist",playlistRouter);
app.use("/api/v1/subscriptions",subscriptionRouter)

export {app};