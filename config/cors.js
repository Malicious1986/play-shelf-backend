const allowedOrigins = [
  "http://localhost:5173",
  "https://play-shelf.vercel.app",
  "https://studio.apollographql.com/sandbox/explorer",
  "https://main.d19t645w93y4bm.amplifyapp.com",
];

export const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};
