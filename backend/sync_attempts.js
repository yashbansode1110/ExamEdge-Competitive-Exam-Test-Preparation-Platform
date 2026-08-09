import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }));
  const TestAttempt = mongoose.model("TestAttempt", new mongoose.Schema({ userId: mongoose.Schema.Types.ObjectId }));
  
  const users = await User.find({});
  for (const u of users) {
    const attempts = await TestAttempt.countDocuments({ userId: u._id });
    await User.updateOne({ _id: u._id }, { $set: { testsAttempted: attempts } });
    console.log("User", u._id, "attempts:", attempts);
  }
  console.log("Done mapping.");
  process.exit(0);
}).catch(console.error);
