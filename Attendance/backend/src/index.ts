import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db";
import studentRoutes from "./routes/student.routes";
import attendanceRoutes from "./routes/attendance.routes";
import errorHandler from "./middleware/errorHandler";
import { AppError } from "./utils/AppError";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.all("*", (req, _res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

app.use(errorHandler);

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();

export default app;
