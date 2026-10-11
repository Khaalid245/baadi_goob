import dotenv from "dotenv";
import { app } from "./app";

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

process.on("SIGTERM", () => {
  server.close(() => {
    console.log("Server closed gracefully");
  });
});

process.on("SIGINT", () => {
  server.close(() => {
    console.log("Server closed gracefully");
  });
});

export default server;
