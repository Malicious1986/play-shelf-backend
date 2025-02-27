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

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(graphqlUploadExpress());
app.use(
  session({
    secret: config.jwtSecret,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use("/auth", authRoutes);
app.use("/", tokenRoutes);

connectDB();
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwtSecret);
        return { user: decoded };
      } catch (err) {
        console.warn("Invalid token");
        
      }
    }
    return { user: null };
  },
});
async function startServer() {
    await server.start();
    server.applyMiddleware({ app, cors: corsOptions });
  
    app.listen(process.env.PORT || 5050, () => {
      console.log(`🚀 Server running at http://localhost:${process.env.PORT || 5050}${server.graphqlPath}`);
    });
  }
  
  startServer();
