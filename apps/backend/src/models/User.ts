import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole } from '@esta-feito/shared';

export interface IUser extends Document {
  fullName: string;
  email?: string;
  phone: string;
  whatsappNumber?: string;
  role: UserRole;
  avatarUrl?: string;
  avatarPublicId?: string;
  address?: {
    street?: string;
    neighbourhood?: string;
    city: string;
    province: string;
    country: string;
    coordinates: {
      type: 'Point';
      coordinates: [number, number];
    };
  };
  // Provider-specific fields
  bio?: string;
  categories?: string[];
  skills?: string[];
  yearsExperience?: number;
  idDocumentUrl?: string;
  isApproved?: boolean;
  rating?: number;
  reviewCount?: number;
  jobsCompleted?: number;
  totalEarnings?: number;
  availabilityRadius?: number;
  bankDetails?: {
    mpesaNumber?: string;
    emolaNumber?: string;
  };
  expoPushToken?: string;
  // Customer-specific
  jobsPosted?: number;
  totalSpent?: number;
  // Auth
  otp?: string;
  otpExpiry?: Date;
  isVerified: boolean;
  isActive: boolean;
  refreshToken?: string;
  compareOtp(candidateOtp: string): Promise<boolean>;
}

const AddressSchema = new Schema({
  street: String,
  neighbourhood: String,
  city: { type: String, required: true },
  province: { type: String, required: true },
  country: { type: String, default: 'Mozambique' },
  coordinates: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [33.5867, -16.1564] }, // Tete default
  },
}, { _id: false });

const UserSchema = new Schema<IUser>({
  fullName:        { type: String, required: true, trim: true },
  email:           { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  phone:           { type: String, required: true, unique: true, index: true },
  whatsappNumber:  { type: String },
  role:            { type: String, enum: Object.values(UserRole), required: true },
  avatarUrl:       String,
  avatarPublicId:  String,
  address:         AddressSchema,

  // Provider fields
  bio:               String,
  categories:        [{ type: String }],
  skills:            [{ type: String }],
  yearsExperience:   Number,
  idDocumentUrl:     String,
  isApproved:        { type: Boolean, default: false },
  rating:            { type: Number, default: 0, min: 0, max: 5 },
  reviewCount:       { type: Number, default: 0 },
  jobsCompleted:     { type: Number, default: 0 },
  totalEarnings:     { type: Number, default: 0 },
  availabilityRadius:{ type: Number, default: 10 }, // km
  bankDetails: {
    mpesaNumber: String,
    emolaNumber: String,
  },
  expoPushToken: String,

  // Customer fields
  jobsPosted:  { type: Number, default: 0 },
  totalSpent:  { type: Number, default: 0 },

  // Auth
  otp:         String,
  otpExpiry:   Date,
  isVerified:  { type: Boolean, default: false },
  isActive:    { type: Boolean, default: true },
  refreshToken:String,
}, {
  timestamps: true,
  toJSON: {
    transform(_doc, ret) {
      delete ret.otp;
      delete ret.otpExpiry;
      delete ret.refreshToken;
      return ret;
    },
  },
});

// Geospatial index for location-based queries
UserSchema.index({ 'address.coordinates': '2dsphere' });

// Hash OTP before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('otp') || !this.otp) return next();
  this.otp = await bcrypt.hash(this.otp, 10);
  next();
});

UserSchema.methods.compareOtp = async function (candidateOtp: string): Promise<boolean> {
  if (!this.otp) return false;
  return bcrypt.compare(candidateOtp, this.otp);
};

export const User = mongoose.model<IUser>('User', UserSchema);
