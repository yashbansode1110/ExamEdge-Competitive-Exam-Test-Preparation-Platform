import mongoose from "mongoose";

export async function connectMongo(uri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    autoIndex: false,
    serverSelectionTimeoutMS: 10_000
  });
}

export function connectMongoWithRetry(uri, { initialDelayMs = 500, maxDelayMs = 10_000 } = {}) {
  let delay = initialDelayMs;
  const attempt = async () => {
    try {
      await connectMongo(uri);
      // eslint-disable-next-line no-console
      console.log("Mongo connected");
    } catch {
      // eslint-disable-next-line no-console
      console.warn(`Mongo connect failed; retrying in ${delay}ms`);
      setTimeout(attempt, delay);
      delay = Math.min(maxDelayMs, Math.floor(delay * 1.8));
    }
  };
  attempt();
}

