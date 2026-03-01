import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authRouter } from "./routes/auth";
import { excursionsRouter } from "./routes/excursions";
import { adminUsersRouter } from "./routes/adminUsers";
import { statsRouter } from "./routes/stats";
import { usersRouter } from "./routes/users";
import { adminApplicationsRouter } from "./routes/adminApplications";
import { adminSelectionRouter } from "./routes/adminSelection";
import activityTypesRouter from "./routes/activityTypes";
import childrenRouter from "./routes/children";
import { adminHistoryRouter } from "./routes/adminHistory";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
  const now = new Date();
  res.json({ status: "ok", timestamp: now.toISOString() });
});

// Routes principales
app.use("/auth", authRouter);
app.use("/excursions", excursionsRouter);
app.use("/admin/users", adminUsersRouter);
app.use("/admin/stats", statsRouter);
app.use("/admin/applications", adminApplicationsRouter);
app.use("/admin/selection", adminSelectionRouter);
app.use("/admin/activity-types", activityTypesRouter);
app.use("/admin/children", childrenRouter);
app.use("/admin/history", adminHistoryRouter);
app.use("/users", usersRouter);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`OCP Excursions backend running on port ${PORT}`);
});


