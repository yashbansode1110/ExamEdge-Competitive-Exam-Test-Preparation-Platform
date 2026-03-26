import dotenv from "dotenv";
import http from "http";
import { connectMongoWithRetry } from "./config/database.js";

dotenv.config({ path: new URL("./.env", import.meta.url) });

const { app } = await import("./app.js");

const PORT = Number(process.env.PORT || 4000);
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  // eslint-disable-next-line no-console
  console.error("Missing MONGO_URI");
  process.exit(1);
}
if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  // eslint-disable-next-line no-console
  console.error("Missing JWT secrets");
  process.exit(1);
}

connectMongoWithRetry(MONGO_URI);

const server = http.createServer(app);
server.on("error", (err) => {
  if (err?.code === "EADDRINUSE") {
    // eslint-disable-next-line no-console
    console.error(`Port ${PORT} is already in use.`);
    // eslint-disable-next-line no-console
    console.error(`Fix: stop the process using it, or change PORT in backend/.env (current PORT=${PORT}).`);
    // eslint-disable-next-line no-console
    console.error(`PowerShell: netstat -ano | Select-String ':${PORT}'  (then Stop-Process -Id <PID> -Force)`);
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`ExamEdge backend listening on :${PORT}`);
});

