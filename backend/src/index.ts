import express, { Request, Response } from "express";
import config from "./utils/config";
import cors from "cors";
const app = express();
const PORT = config.PORT;
app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello from the backend of Helix!");
});
app.use("/api/auth", require("./routers/authRouter").default);
app.use("/api/db", require("./routers/dbRouter").default);
app.use("/api/indexing", require("./routers/indexingRouter").default);
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
