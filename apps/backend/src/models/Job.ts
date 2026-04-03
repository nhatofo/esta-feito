import mongoose, { Schema, Document } from 'mongoose';
import { JobStatus, ServiceCategory } from '@esta-feito/shared';

export interface IJob extends Document {
  title: string;
  description: string;
  category: ServiceCategory;
  status: JobStatus;
  customer: mongoose.Types.ObjectId;
  provider?: mongoose.Types.ObjectId;
  photos: Array<{ url: string; publicId: string }>;
  address: {
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
  budget: number;
  agreedPrice?: number;
  scheduledDate: Date;
  completedDate?: Date;
  quotes: Array<{
    _id?: mongoose.Types.ObjectId;
    provider: mongoose.Types.ObjectId;
    amount: number;
    message: string;
    estimatedDuration?: string;
    createdAt: Date;
  }>;
  whatsappDeepLink?: string;
}

const JobSchema = new Schema<IJob>({
  title:       { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, maxlength: 1000 },
  category:    { type: String, enum: Object.values(ServiceCategory), required: true },
  status:      { type: String, enum: Object.values(JobStatus), default: JobStatus.OPEN },
  customer:    { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  provider:    { type: Schema.Types.ObjectId, ref: 'User' },
  photos: [{
    url:      { type: String, required: true },
    publicId: { type: String, required: true },
    _id: false,
  }],
  address: {
    street:       String,
    neighbourhood:String,
    city:         { type: String, required: true },
    province:     { type: String, required: true },
    country:      { type: String, default: 'Mozambique' },
    coordinates: {
      type:        { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
  },
  budget:        { type: Number, required: true, min: 500 },
  agreedPrice:   Number,
  scheduledDate: { type: Date, required: true },
  completedDate: Date,
  quotes: [{
    provider:          { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount:            { type: Number, required: true },
    message:           { type: String, required: true, maxlength: 500 },
    estimatedDuration: String,
    createdAt:         { type: Date, default: Date.now },
  }],
  whatsappDeepLink: String,
}, {
  timestamps: true,
});

// Geospatial index for proximity queries
JobSchema.index({ 'address.coordinates': '2dsphere' });
JobSchema.index({ category: 1, status: 1 });
JobSchema.index({ customer: 1, createdAt: -1 });

export const Job = mongoose.model<IJob>('Job', JobSchema);
