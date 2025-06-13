import cors from 'cors';

const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};

const configureCors = () => {
  return cors(corsOptions);
};

export { configureCors };
