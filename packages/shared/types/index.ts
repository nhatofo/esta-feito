// ─────────────────────────────────────────────
//  Esta Feito – Shared TypeScript Types
//  Consumed by backend, web, and mobile apps
// ─────────────────────────────────────────────

// ── Enums ────────────────────────────────────

export enum UserRole {
  CUSTOMER = 'customer',
  PROVIDER = 'provider',
  ADMIN = 'admin',
}

export enum JobStatus {
  OPEN = 'open',
  QUOTED = 'quoted',
  BOOKED = 'booked',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  MPESA = 'mpesa',
  EMOLA = 'emola',
  CASH = 'cash',
}

export enum ServiceCategory {
  PLUMBING = 'plumbing',
  CLEANING = 'cleaning',
  ELECTRICAL = 'electrical',
  PAINTING = 'painting',
  MOVING = 'moving',
  MINING_EQUIPMENT = 'mining_equipment',
  CARPENTRY = 'carpentry',
  SECURITY = 'security',
  GARDENING = 'gardening',
  OTHER = 'other',
}

export enum NotificationType {
  JOB_POSTED = 'job_posted',
  QUOTE_RECEIVED = 'quote_received',
  BOOKING_CONFIRMED = 'booking_confirmed',
  JOB_STARTED = 'job_started',
  JOB_COMPLETED = 'job_completed',
  PAYMENT_RECEIVED = 'payment_received',
  REVIEW_RECEIVED = 'review_received',
  CHAT_MESSAGE = 'chat_message',
}

// ── Location ──────────────────────────────────

export interface GeoLocation {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Address {
  street?: string;
  neighbourhood?: string;
  city: string;           // e.g. "Tete" | "Maputo"
  province: string;
  country: string;        // "Mozambique"
  postalCode?: string;
  coordinates: GeoLocation;
}

// ── User ─────────────────────────────────────

export interface UserBase {
  _id: string;
  fullName: string;
  email?: string;
  phone: string;          // Format: +258XXXXXXXXX (Mozambique)
  whatsappNumber?: string;// May differ from phone
  role: UserRole;
  avatarUrl?: string;
  address?: Address;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerProfile extends UserBase {
  role: UserRole.CUSTOMER;
  jobsPosted: number;
  totalSpent: number;     // in MZN (Meticais)
}

export interface ProviderProfile extends UserBase {
  role: UserRole.PROVIDER;
  bio?: string;
  categories: ServiceCategory[];
  skills: string[];
  yearsExperience?: number;
  idDocumentUrl?: string;
  isApproved: boolean;    // Admin must approve providers
  rating: number;         // 0–5
  reviewCount: number;
  jobsCompleted: number;
  totalEarnings: number;  // in MZN
  availabilityRadius: number; // km
  bankDetails?: {
    mpesaNumber?: string;
    emolaNumber?: string;
  };
  expoPushToken?: string; // For push notifications
}

export type User = CustomerProfile | ProviderProfile;

// ── Job ───────────────────────────────────────

export interface JobPhoto {
  url: string;
  publicId: string; // Cloudinary public ID
}

export interface Quote {
  _id: string;
  provider: ProviderPublicProfile;
  amount: number;       // in MZN
  message: string;
  estimatedDuration?: string;
  createdAt: string;
}

export interface Job {
  _id: string;
  title: string;
  description: string;
  category: ServiceCategory;
  status: JobStatus;
  customer: CustomerProfile;
  provider?: ProviderPublicProfile;
  photos: JobPhoto[];
  address: Address;
  budget: number;         // Customer's max budget in MZN
  agreedPrice?: number;   // Final agreed price in MZN
  scheduledDate: string;
  completedDate?: string;
  quotes: Quote[];
  payment?: Payment;
  review?: Review;
  whatsappDeepLink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobDto {
  title: string;
  description: string;
  category: ServiceCategory;
  photos?: string[];      // Base64 or URLs
  address: Omit<Address, 'coordinates'> & {
    latitude: number;
    longitude: number;
  };
  budget: number;
  scheduledDate: string;
}

// ── Payment ───────────────────────────────────

export interface Payment {
  _id: string;
  job: string;            // Job ID
  customer: string;       // User ID
  provider: string;       // User ID
  amount: number;         // Total in MZN
  platformFee: number;    // 15–20% commission
  providerAmount: number; // amount - platformFee
  method: PaymentMethod;
  status: PaymentStatus;
  // M-Pesa specific
  mpesaTransactionId?: string;
  mpesaCheckoutRequestId?: string;
  // eMola specific
  emolaTransactionId?: string;
  // Deep links
  mpesaDeepLink?: string;
  emolaDeepLink?: string;
  // Confirmation
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InitiatePaymentDto {
  jobId: string;
  method: PaymentMethod;
  phoneNumber: string;    // Payer's phone (+258XXXXXXXXX)
}

export interface PaymentDeepLinks {
  mpesa?: string;
  emola?: string;
  whatsapp?: string;
}

// ── Review ────────────────────────────────────

export interface Review {
  _id: string;
  job: string;
  reviewer: string;       // User ID (customer)
  reviewee: string;       // User ID (provider)
  rating: number;         // 1–5
  comment?: string;
  createdAt: string;
}

export interface CreateReviewDto {
  jobId: string;
  rating: number;
  comment?: string;
}

// ── Chat ─────────────────────────────────────

export interface ChatMessage {
  _id: string;
  jobId: string;
  sender: string;         // User ID
  senderName: string;
  content: string;
  type: 'text' | 'image';
  imageUrl?: string;
  readAt?: string;
  createdAt: string;
}

// ── Notification ──────────────────────────────

export interface AppNotification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  read: boolean;
  createdAt: string;
}

// ── Public profiles (safe to expose) ─────────

export type ProviderPublicProfile = Pick<
  ProviderProfile,
  '_id' | 'fullName' | 'avatarUrl' | 'rating' | 'reviewCount' |
  'jobsCompleted' | 'categories' | 'bio' | 'yearsExperience' | 'skills'
>;

export type CustomerPublicProfile = Pick<
  CustomerProfile,
  '_id' | 'fullName' | 'avatarUrl'
>;

// ── API Response wrappers ─────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ── Auth ─────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface OtpRequestDto {
  phone: string;          // +258XXXXXXXXX
}

export interface OtpVerifyDto {
  phone: string;
  otp: string;
  fullName?: string;      // Required on first registration
  role?: UserRole;
}
