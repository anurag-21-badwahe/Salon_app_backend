import mongoose from 'mongoose';

// Define the schema for user authentication with timestamps
const userAuthSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^[6-9]\d{9}$/.test(v); // Validate for 10-digit Indian phone numbers
      },
      message: 'Invalid phone number format',
    },
  },
  otp: {
    type: String,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  name: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^[a-zA-Z\s]+$/.test(v); // Ensure name contains only alphabets and spaces
      },
      message: 'Invalid name format',
    },
  },
  age: {
    type: Number,
    required: true,
    min: 0,
    max: 150,
  },
  gender: {
    type: String,
    required: true,
    enum: ['male', 'female', 'other'], // Only allow these values
  },
}, { timestamps: true }); // Enable timestamps

// Create and export the model
const UserAuth = mongoose.model('UserAuth', userAuthSchema);
export default UserAuth;
