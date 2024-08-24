
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import twilio from 'twilio';
import crypto from 'crypto';
import mongoose from 'mongoose';
import UserAuth from './Schema/authSchema.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const corsOpts = {
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
};

app.use(cors(corsOpts));
app.use(express.json());

// Mongoose connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Database connected"))
  .catch((error) => console.log("Error connecting DB:", error));

// Generate OTP
const generateOTP = async (phoneNumber) => {
  const otp = crypto.randomInt(100000, 999999).toString();
  let userAuth = await UserAuth.findOne({ phoneNumber });

  if (userAuth) {
    userAuth.otp = otp;
    // Set OTP expiry (optional)
    userAuth.expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry
    await userAuth.save();
  } else {
    userAuth = new UserAuth({ phoneNumber, otp });
    // Set OTP expiry (optional)
    userAuth.expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry
    await userAuth.save();
  }
  return otp;
};

// Send OTP
app.post("/send-otp", async (req, res) => {
  const { phoneNumber, name, age: ageStr, gender: genderStr } = req.body;

  // Normalize and log data
  const age = parseInt(ageStr, 10);
  const gender = genderStr.toLowerCase();

  // console.log("Request Data:", {
  //   phoneNumber,
  //   name,
  //   age,
  //   gender
  // });

  if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
    return res.status(400).json({ status: "Invalid phone number" });
  }

  if (!name || !/^[a-zA-Z\s]+$/.test(name)) {
    return res.status(400).json({ status: "Invalid name" });
  }

  if (isNaN(age) || age < 0 || age > 150) {
    return res.status(400).json({ status: "Invalid age" });
  }

  const validGenders = ['male', 'female', 'other'];
  if (!validGenders.includes(gender)) {
    return res.status(400).json({ status: "Invalid gender" });
  }

  try {
    // Create and save the new user document
    const newUser = new UserAuth({
      phoneNumber,
      name,
      age,
      gender
    });

    console.log("User Document to be Saved:", newUser);

    await newUser.save();

    const otp = await generateOTP(phoneNumber);

    await client.messages.create({
      body: `Hello ${name}, your verification code is: ${otp}. Age: ${age}, Gender: ${gender}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${phoneNumber}`,
    });

    res.status(200).json({ status: 200, message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error saving user:", error);
    res.status(500).json({ status: "Error sending OTP", error: error.message });
  }
});


// Verify OTP
app.get("/verify-otp/:phoneNumber/:otp", async (req, res) => {
  const { phoneNumber, otp } = req.params;

  if (/^[6-9]\d{9}$/.test(phoneNumber)) {
    try {
      const userAuth = await UserAuth.findOne({ phoneNumber });

      if (!userAuth) {
        return res.status(404).json({ status: 404, message: "Phone number not found. Please request a new OTP." });
      }

      // Check OTP expiry
      if (userAuth.expiry < new Date()) {
        return res.status(400).json({ status: 400, message: "OTP has expired. Please request a new OTP." });
      }

      if (userAuth.otp === otp) {
        userAuth.isVerified = true;
        await userAuth.save();
        res.status(200).json({ status: 200, message: "OTP verified successfully" });
      } else {
        res.status(400).json({ status: 400, message: "Invalid OTP" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: "Error verifying OTP", error: error.message });
    }
  } else {
    res.status(400).json({ status: 400, message: "Invalid phone number" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
