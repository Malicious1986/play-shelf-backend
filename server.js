import express from "express";
import session from "express-session";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApolloServer } from "apollo-server-express";
import { graphqlUploadExpress } from "graphql-upload";
import passport from "passport";
import { connectDB } from "./config/database.js";
import { corsOptions } from "./config/cors.js";
import typeDefs from "./graphql/schema.js";
import resolvers from "./graphql/resolvers.js";
import authRoutes from "./routes/auth.js";
import tokenRoutes from "./routes/token.js";
import "./config/passport.js";
import jwt from "jsonwebtoken";
import { config } from "./config/dotenv.js";
import passwordRoutes from "./routes/passwordReset.js";
import { RedisStore } from "connect-redis";
import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL,
});
redisClient.connect().catch(console.error);

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(graphqlUploadExpress());
app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: config.jwtSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use("/auth", authRoutes);
app.use("/", tokenRoutes);
app.use("/password", passwordRoutes);

connectDB();
const server = new ApolloServer({
  typeDefs,
  cache: "bounded",
  resolvers,
  context: ({ req, res }) => {
    const token = req.headers.authorization?.split(" ")[1];
    let user = null;

    if (token) {
      try {
        user = jwt.verify(token, config.jwtSecret);
      } catch (err) {
        console.warn("Invalid token");
      }
    }
    return { user, res, req, server };
  },
});
async function startServer() {
  await server.start();
  server.applyMiddleware({ app, cors: corsOptions });

  app.listen(process.env.PORT || 5050, () => {
    console.log(
      `🚀 Server running at http://localhost:${process.env.PORT || 5050}${
        server.graphqlPath
      }`
    );
  });
}

startServer();
