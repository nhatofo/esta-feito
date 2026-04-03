/**
 * Esta Feito — Database Seed Script
 * ------------------------------------
 * Populates MongoDB with realistic Mozambican dummy data:
 *   • 1 admin
 *   • 8 customers (Tete + Maputo)
 *   • 12 providers (various categories, approved)
 *   • 30 jobs (open, quoted, booked, completed)
 *   • 20 quotes
 *   • 10 payments
 *   • 15 reviews
 *
 * Usage:
 *   cd apps/backend
 *   npx ts-node src/seeds/seed.ts
 *
 * To reset and re-seed:
 *   npx ts-node src/seeds/seed.ts --reset
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/esta-feito';

// ── Minimal inline schemas (avoids import complexity) ─────

const GeoSchema = { type: { type: String, default: 'Point' }, coordinates: [Number] };

const UserSchema = new mongoose.Schema({
  fullName: String, email: String, phone: String,
  whatsappNumber: String, role: String,
  avatarUrl: String,
  address: {
    street: String, neighbourhood: String, city: String,
    province: String, country: { type: String, default: 'Mozambique' },
    coordinates: GeoSchema,
  },
  bio: String, categories: [String], skills: [String],
  yearsExperience: Number, idDocumentUrl: String,
  isApproved: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  jobsCompleted: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  availabilityRadius: { type: Number, default: 10 },
  bankDetails: { mpesaNumber: String, emolaNumber: String },
  jobsPosted: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  otp: String, otpExpiry: Date,
  isVerified: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  expoPushToken: String,
}, { timestamps: true });
UserSchema.index({ 'address.coordinates': '2dsphere' });

const JobSchema = new mongoose.Schema({
  title: String, description: String, category: String,
  status: { type: String, default: 'open' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  photos: [{ url: String, publicId: String }],
  address: {
    street: String, neighbourhood: String, city: String,
    province: String, country: { type: String, default: 'Mozambique' },
    coordinates: GeoSchema,
  },
  budget: Number, agreedPrice: Number,
  scheduledDate: Date, completedDate: Date,
  quotes: [{
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: Number, message: String, estimatedDuration: String,
    createdAt: { type: Date, default: Date.now },
  }],
  whatsappDeepLink: String,
}, { timestamps: true });
JobSchema.index({ 'address.coordinates': '2dsphere' });

const ReviewSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rating: Number, comment: String,
}, { timestamps: true });

const PaymentSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: Number, platformFee: Number, providerAmount: Number,
  method: String, status: { type: String, default: 'completed' },
  mpesaTransactionId: String, emolaTransactionId: String,
  confirmedAt: Date, manuallyConfirmed: Boolean,
}, { timestamps: true });

const User    = mongoose.model('User',    UserSchema);
const Job     = mongoose.model('Job',     JobSchema);
const Review  = mongoose.model('Review',  ReviewSchema);
const Payment = mongoose.model('Payment', PaymentSchema);

// ── Helpers ───────────────────────────────────

function teteCoords(offsetLat = 0, offsetLng = 0) {
  return { type: 'Point', coordinates: [33.5867 + offsetLng, -16.1564 + offsetLat] };
}
function maputoCoords(offsetLat = 0, offsetLng = 0) {
  return { type: 'Point', coordinates: [32.5832 + offsetLng, -25.9692 + offsetLat] };
}
function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function daysAgo(n: number) { return new Date(Date.now() - n * 86400000); }
function daysFromNow(n: number) { return new Date(Date.now() + n * 86400000); }
function genMpesaRef() { return 'MPE' + Math.random().toString(36).slice(2, 10).toUpperCase(); }

// ── Data definitions ──────────────────────────

const TETE_NEIGHBOURHOODS = ['Bairro 1', 'Bairro 2', 'Bairro 3', 'Matundo', 'Chingodzi', 'Mateúsa', 'Cimento', 'Ndzuwa'];
const MAPUTO_NEIGHBOURHOODS = ['Polana', 'Sommerchield', 'Malhangalene', 'Alto Maé', 'Maxaquene', 'Chamanculo', 'Hulene'];

const PROVIDER_BIOS: Record<string, string> = {
  plumbing:         'Canalizador profissional com 8 anos de experiência em instalações e reparações residenciais e comerciais em Tete.',
  electrical:       'Electricista certificado. Instalação, manutenção e reparação de sistemas eléctricos. Disponível 24h para emergências.',
  cleaning:         'Serviço de limpeza profissional para casas, escritórios e eventos. Equipa de 3 pessoas, material incluído.',
  painting:         'Pintor experiente em interiores e exteriores. Trabalho rigoroso e acabamento de alta qualidade garantido.',
  moving:           'Serviço de mudanças com carrinha e equipa. Embalagem, transporte e montagem de mobiliário.',
  mining_equipment: 'Técnico especializado em equipamento mineiro. Experiência com minas de carvão em Moatize e Tete.',
  carpentry:        'Carpinteiro com 12 anos de experiência. Mobiliário personalizado, portas, janelas e reparações.',
  gardening:        'Jardinagem e manutenção de espaços verdes. Corte de relva, poda e paisagismo.',
};

// ── Main seed function ────────────────────────

async function seed() {
  const args = process.argv.slice(2);
  const reset = args.includes('--reset');

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB:', MONGODB_URI);

  if (reset) {
    await Promise.all([User.deleteMany({}), Job.deleteMany({}), Review.deleteMany({}), Payment.deleteMany({})]);
    console.log('🗑️  Database reset complete');
  }

  const existing = await User.countDocuments();
  if (existing > 0 && !reset) {
    console.log(`⚠️  Database already has ${existing} users. Use --reset to re-seed.`);
    await mongoose.disconnect();
    return;
  }

  // ── 1. Admin ──────────────────────────────
  console.log('👤 Creating admin...');
  const admin = await User.create({
    fullName: 'Admin Esta Feito',
    email: 'admin@estafeito.co.mz',
    phone: '+258840000001',
    whatsappNumber: '+258840000001',
    role: 'admin',
    isVerified: true, isActive: true, isApproved: true,
    address: {
      neighbourhood: 'Cimento', city: 'Tete', province: 'Tete',
      coordinates: teteCoords(),
    },
  });

  // ── 2. Customers ──────────────────────────
  console.log('👥 Creating customers...');
  const customerData = [
    { fullName: 'Ana Machava',      phone: '+258841111001', city: 'Tete',   neighbourhood: 'Bairro 3',       coords: teteCoords(0.01, 0.02),   spent: 12500 },
    { fullName: 'Carlos Tembe',     phone: '+258841111002', city: 'Tete',   neighbourhood: 'Matundo',         coords: teteCoords(-0.02, 0.01),  spent: 8750 },
    { fullName: 'Fatima Sitoe',     phone: '+258841111003', city: 'Tete',   neighbourhood: 'Chingodzi',       coords: teteCoords(0.03, -0.01),  spent: 22300 },
    { fullName: 'João Nhantumbo',   phone: '+258841111004', city: 'Maputo', neighbourhood: 'Polana',          coords: maputoCoords(0.01, 0.01), spent: 45000 },
    { fullName: 'Maria Cossa',      phone: '+258841111005', city: 'Maputo', neighbourhood: 'Sommerchield',    coords: maputoCoords(-0.01, 0.02), spent: 18200 },
    { fullName: 'Pedro Machungo',   phone: '+258841111006', city: 'Tete',   neighbourhood: 'Mateúsa',         coords: teteCoords(0.02, 0.03),   spent: 5500 },
    { fullName: 'Sofia Muiambo',    phone: '+258841111007', city: 'Maputo', neighbourhood: 'Alto Maé',        coords: maputoCoords(0.02, -0.01), spent: 31000 },
    { fullName: 'Tomás Nuvunga',    phone: '+258841111008', city: 'Tete',   neighbourhood: 'Ndzuwa',          coords: teteCoords(-0.01, -0.02), spent: 9800 },
  ];

  const customers = await User.insertMany(customerData.map(c => ({
    fullName: c.fullName, phone: c.phone, role: 'customer',
    whatsappNumber: c.phone,
    isVerified: true, isActive: true,
    jobsPosted: randInt(2, 12), totalSpent: c.spent,
    address: {
      neighbourhood: c.neighbourhood, city: c.city,
      province: c.city === 'Maputo' ? 'Maputo Cidade' : 'Tete',
      coordinates: c.coords,
    },
  })));

  // ── 3. Providers ──────────────────────────
  console.log('🔧 Creating providers...');
  const providerData = [
    { fullName: 'António Chissano',  phone: '+258842222001', cats: ['plumbing'],                      city: 'Tete',   neigh: 'Bairro 2',    coords: teteCoords(0.005, 0.01),   rating: 4.8, jobs: 47, earnings: 85000,  mpesa: '84222001' },
    { fullName: 'Berta Mucavel',     phone: '+258842222002', cats: ['cleaning'],                       city: 'Tete',   neigh: 'Cimento',     coords: teteCoords(-0.01, 0.005),  rating: 4.6, jobs: 63, earnings: 52000,  mpesa: '84222002' },
    { fullName: 'David Mondlane',    phone: '+258842222003', cats: ['electrical', 'plumbing'],         city: 'Tete',   neigh: 'Matundo',     coords: teteCoords(0.015, -0.005), rating: 4.9, jobs: 89, earnings: 134000, mpesa: '84222003' },
    { fullName: 'Elisa Nguenha',     phone: '+258842222004', cats: ['painting'],                       city: 'Tete',   neigh: 'Chingodzi',   coords: teteCoords(-0.005, 0.015), rating: 4.5, jobs: 28, earnings: 43000,  mpesa: '84222004' },
    { fullName: 'Fernando Mahlanze', phone: '+258842222005', cats: ['mining_equipment', 'electrical'], city: 'Tete',   neigh: 'Mateúsa',     coords: teteCoords(0.02, 0.02),    rating: 4.7, jobs: 34, earnings: 210000, emola: '86222005' },
    { fullName: 'Graça Timane',      phone: '+258842222006', cats: ['cleaning', 'gardening'],          city: 'Tete',   neigh: 'Bairro 1',    coords: teteCoords(-0.015, -0.01), rating: 4.4, jobs: 41, earnings: 38000,  mpesa: '84222006' },
    { fullName: 'Hélio Buque',       phone: '+258842222007', cats: ['carpentry'],                      city: 'Tete',   neigh: 'Ndzuwa',      coords: teteCoords(0.01, -0.015),  rating: 4.8, jobs: 55, earnings: 97000,  mpesa: '84222007' },
    { fullName: 'Inês Sitoe',        phone: '+258842222008', cats: ['moving'],                         city: 'Tete',   neigh: 'Bairro 3',    coords: teteCoords(-0.02, 0.02),   rating: 4.3, jobs: 22, earnings: 61000,  emola: '86222008' },
    { fullName: 'Jorge Manhiça',     phone: '+258842222009', cats: ['electrical'],                     city: 'Maputo', neigh: 'Polana',       coords: maputoCoords(0.005, 0.005), rating: 4.9, jobs: 112, earnings: 178000, mpesa: '84222009' },
    { fullName: 'Lurdes Macuane',    phone: '+258842222010', cats: ['cleaning', 'painting'],           city: 'Maputo', neigh: 'Sommerchield', coords: maputoCoords(-0.005, 0.01), rating: 4.6, jobs: 74, earnings: 89000,  mpesa: '84222010' },
    { fullName: 'Manuel Macamo',     phone: '+258842222011', cats: ['plumbing', 'carpentry'],          city: 'Maputo', neigh: 'Alto Maé',     coords: maputoCoords(0.01, -0.005), rating: 4.7, jobs: 58, earnings: 115000, emola: '86222011' },
    { fullName: 'Nazira Cumbe',      phone: '+258842222012', cats: ['gardening', 'cleaning'],          city: 'Maputo', neigh: 'Maxaquene',    coords: maputoCoords(-0.01, -0.01), rating: 4.5, jobs: 33, earnings: 44000,  mpesa: '84222012' },
  ];

  const providers = await User.insertMany(providerData.map(p => ({
    fullName: p.fullName, phone: p.phone, role: 'provider',
    whatsappNumber: p.phone,
    isVerified: true, isActive: true, isApproved: true,
    bio: PROVIDER_BIOS[p.cats[0]] ?? 'Profissional com experiência em serviços residenciais.',
    categories: p.cats,
    skills: p.cats.map(c => c.replace('_', ' ')),
    yearsExperience: randInt(3, 15),
    rating: p.rating,
    reviewCount: randInt(10, 60),
    jobsCompleted: p.jobs,
    totalEarnings: p.earnings,
    availabilityRadius: randInt(5, 20),
    bankDetails: {
      mpesaNumber: p.mpesa ? `+258${p.mpesa}` : undefined,
      emolaNumber: p.emola ? `+258${p.emola}` : undefined,
    },
    address: {
      neighbourhood: p.neigh, city: p.city,
      province: p.city === 'Maputo' ? 'Maputo Cidade' : 'Tete',
      coordinates: p.coords,
    },
  })));

  // ── 4. Jobs ───────────────────────────────
  console.log('📋 Creating jobs...');

  type JobSpec = {
    title: string; desc: string; cat: string;
    status: string; custIdx: number; provIdx?: number;
    budget: number; agreedPrice?: number;
    city: 'Tete' | 'Maputo'; neigh: string;
    coords: any; scheduledDaysFromNow: number;
    completedDaysAgo?: number;
  };

  const jobSpecs: JobSpec[] = [
    // OPEN jobs
    { title: 'Reparar cano partido na cozinha',        desc: 'Cano de água debaixo da pia partido, preciso reparação urgente.',         cat: 'plumbing',         status: 'open',      custIdx: 0, budget: 3500,  city: 'Tete',   neigh: 'Bairro 3',     coords: teteCoords(0.01, 0.02),    scheduledDaysFromNow: 2  },
    { title: 'Limpeza geral apartamento T3',           desc: 'Apartamento de 3 quartos precisa de limpeza profunda após mudança.',       cat: 'cleaning',         status: 'open',      custIdx: 1, budget: 5000,  city: 'Tete',   neigh: 'Matundo',      coords: teteCoords(-0.02, 0.01),   scheduledDaysFromNow: 3  },
    { title: 'Instalação eléctrica nova moradia',      desc: 'Casa nova de 4 assoalhadas precisa instalação eléctrica completa.',       cat: 'electrical',       status: 'open',      custIdx: 2, budget: 25000, city: 'Tete',   neigh: 'Chingodzi',    coords: teteCoords(0.03, -0.01),   scheduledDaysFromNow: 5  },
    { title: 'Pintura exterior vivenda',               desc: 'Vivenda de 2 pisos, exterior a precisar de pintura completa.',            cat: 'painting',         status: 'open',      custIdx: 3, budget: 18000, city: 'Maputo', neigh: 'Polana',        coords: maputoCoords(0.01, 0.01),  scheduledDaysFromNow: 7  },
    { title: 'Jardim residencial — manutenção mensal', desc: 'Jardim de 200m² precisa de corte de relva e poda trimestral.',           cat: 'gardening',        status: 'open',      custIdx: 4, budget: 4000,  city: 'Maputo', neigh: 'Sommerchield',  coords: maputoCoords(-0.01, 0.02), scheduledDaysFromNow: 4  },
    { title: 'Reparação bomba de água mina',           desc: 'Bomba de extracção de água na mina Moatize avariada.',                   cat: 'mining_equipment', status: 'open',      custIdx: 5, budget: 45000, city: 'Tete',   neigh: 'Mateúsa',      coords: teteCoords(0.02, 0.03),    scheduledDaysFromNow: 1  },
    { title: 'Mudança escritório andar 2 para 5',      desc: 'Escritório com mobiliário pesado, precisamos de equipa e carrinha.',     cat: 'moving',           status: 'open',      custIdx: 6, budget: 12000, city: 'Maputo', neigh: 'Alto Maé',      coords: maputoCoords(0.02, -0.01), scheduledDaysFromNow: 6  },
    { title: 'Carpintaria — guarda-fato embutido',     desc: 'Quarto principal precisa guarda-fato embutido de 3m de comprimento.',    cat: 'carpentry',        status: 'open',      custIdx: 7, budget: 22000, city: 'Tete',   neigh: 'Ndzuwa',       coords: teteCoords(-0.01, -0.02),  scheduledDaysFromNow: 10 },

    // QUOTED jobs
    { title: 'Desentupimento casa de banho',           desc: 'WC entupido há 2 dias, água não escoa.',                                 cat: 'plumbing',         status: 'quoted',    custIdx: 0, budget: 2500,  city: 'Tete',   neigh: 'Bairro 3',     coords: teteCoords(0.012, 0.022),  scheduledDaysFromNow: 1,  provIdx: 0 },
    { title: 'Limpeza pós-obra escritório',            desc: 'Escritório de 80m² após renovações, pó e resíduos de construção.',      cat: 'cleaning',         status: 'quoted',    custIdx: 1, budget: 7500,  city: 'Tete',   neigh: 'Cimento',      coords: teteCoords(-0.015, 0.008), scheduledDaysFromNow: 2,  provIdx: 1 },
    { title: 'Instalação ar condicionado',             desc: '2 unidades split 12000 BTU, preciso instalação eléctrica completa.',    cat: 'electrical',       status: 'quoted',    custIdx: 2, budget: 15000, city: 'Tete',   neigh: 'Matundo',      coords: teteCoords(0.025, -0.008), scheduledDaysFromNow: 3,  provIdx: 2 },
    { title: 'Pintura interior 3 quartos',             desc: 'Casa de 3 quartos, paredes em mau estado, tecto e paredes.',            cat: 'painting',         status: 'quoted',    custIdx: 3, budget: 9000,  city: 'Maputo', neigh: 'Malhangalene',  coords: maputoCoords(0.008, 0.008), scheduledDaysFromNow: 5, provIdx: 3 },

    // BOOKED jobs
    { title: 'Reparação torneiras 3 casas de banho',   desc: 'Torneiras a pingar em 3 WC, substituição completa dos mecanismos.',     cat: 'plumbing',         status: 'booked',    custIdx: 0, budget: 4500,  agreedPrice: 4000,  city: 'Tete',   neigh: 'Bairro 3',    coords: teteCoords(0.009, 0.019),  scheduledDaysFromNow: 1,  provIdx: 0 },
    { title: 'Limpeza moradia antes de arrendamento',  desc: 'Casa a ser arrendada, precisa limpeza profissional completa.',          cat: 'cleaning',         status: 'booked',    custIdx: 1, budget: 6000,  agreedPrice: 5500,  city: 'Tete',   neigh: 'Matundo',     coords: teteCoords(-0.018, 0.012), scheduledDaysFromNow: 2,  provIdx: 1 },
    { title: 'Quadro eléctrico — substituição',        desc: 'Quadro antigo a disparar, trocar por painel moderno 20 disjuntores.',  cat: 'electrical',       status: 'booked',    custIdx: 2, budget: 12000, agreedPrice: 11000, city: 'Tete',   neigh: 'Chingodzi',   coords: teteCoords(0.028, -0.012), scheduledDaysFromNow: 2,  provIdx: 2 },
    { title: 'Pintura sala e cozinha',                 desc: 'Sala de estar e cozinha, cores a combinar no local.',                  cat: 'painting',         status: 'booked',    custIdx: 4, budget: 7000,  agreedPrice: 6500,  city: 'Maputo', neigh: 'Sommerchield', coords: maputoCoords(-0.008, 0.018), scheduledDaysFromNow: 3, provIdx: 3 },
    { title: 'Manutenção geradora mina',               desc: 'Geradora 100kVA parada, diagnóstico e reparação.',                    cat: 'mining_equipment', status: 'booked',    custIdx: 5, budget: 80000, agreedPrice: 75000, city: 'Tete',   neigh: 'Mateúsa',     coords: teteCoords(0.022, 0.028),  scheduledDaysFromNow: 1,  provIdx: 4 },

    // COMPLETED jobs
    { title: 'Instalação canalização nova casa',       desc: 'Casa nova, instalação completa de canalização de água e esgoto.',      cat: 'plumbing',         status: 'completed', custIdx: 2, budget: 35000, agreedPrice: 32000, city: 'Tete',   neigh: 'Chingodzi',   coords: teteCoords(0.032, -0.015), scheduledDaysFromNow: -10, completedDaysAgo: 8, provIdx: 0 },
    { title: 'Limpeza hotel — 20 quartos',             desc: 'Hotel pequeno, limpeza profunda de todos os quartos e áreas comuns.',  cat: 'cleaning',         status: 'completed', custIdx: 3, budget: 15000, agreedPrice: 14000, city: 'Maputo', neigh: 'Polana',       coords: maputoCoords(0.012, 0.012), scheduledDaysFromNow: -15, completedDaysAgo: 13, provIdx: 9 },
    { title: 'Electricidade moradia T4 Maputo',        desc: 'Moradia de 4 assoalhadas, wiring completo e quadro eléctrico.',       cat: 'electrical',       status: 'completed', custIdx: 6, budget: 45000, agreedPrice: 42000, city: 'Maputo', neigh: 'Alto Maé',     coords: maputoCoords(0.018, -0.008), scheduledDaysFromNow: -20, completedDaysAgo: 17, provIdx: 8 },
    { title: 'Pintura exterior condomínio',            desc: '8 apartamentos, exterior completo, incluindo muros e portão.',        cat: 'painting',         status: 'completed', custIdx: 4, budget: 55000, agreedPrice: 52000, city: 'Maputo', neigh: 'Sommerchield', coords: maputoCoords(-0.012, 0.022), scheduledDaysFromNow: -12, completedDaysAgo: 10, provIdx: 3 },
    { title: 'Jardinagem condomínio — mensal',         desc: 'Manutenção de jardim em condomínio de 12 unidades.',                 cat: 'gardening',        status: 'completed', custIdx: 7, budget: 8000,  agreedPrice: 7500,  city: 'Tete',   neigh: 'Ndzuwa',      coords: teteCoords(-0.012, -0.025), scheduledDaysFromNow: -7, completedDaysAgo: 5, provIdx: 5 },
    { title: 'Mudança residencial completa',           desc: 'T3 completo com electrodomésticos, mudança do Bairro 1 para Polana.', cat: 'moving',           status: 'completed', custIdx: 5, budget: 20000, agreedPrice: 18500, city: 'Maputo', neigh: 'Polana',       coords: maputoCoords(0.005, 0.005), scheduledDaysFromNow: -9, completedDaysAgo: 7, provIdx: 7 },
    { title: 'Carpintaria — cozinha equipada',         desc: 'Cozinha completa em MDF, móveis superiores e inferiores.',           cat: 'carpentry',        status: 'completed', custIdx: 3, budget: 75000, agreedPrice: 70000, city: 'Maputo', neigh: 'Polana',       coords: maputoCoords(0.014, 0.014), scheduledDaysFromNow: -25, completedDaysAgo: 22, provIdx: 6 },
    { title: 'Reparação britadeira mina Moatize',      desc: 'Britadeira primária parada 3 dias, peças em stock.',                 cat: 'mining_equipment', status: 'completed', custIdx: 2, budget: 120000, agreedPrice: 115000, city: 'Tete', neigh: 'Mateúsa',     coords: teteCoords(0.025, 0.032),  scheduledDaysFromNow: -18, completedDaysAgo: 15, provIdx: 4 },
  ];

  const jobs = await Job.insertMany(jobSpecs.map(j => {
    const custId = customers[j.custIdx]!._id;
    const provId = j.provIdx !== undefined ? providers[j.provIdx]!._id : undefined;
    const whatsLink = provId
      ? `https://wa.me/${providerData[j.provIdx!]!.phone.replace('+','')}?text=Ol%C3%A1%21+Sou+cliente+da+Esta+Feito.+Trabalho%3A+${encodeURIComponent(j.title)}`
      : undefined;

    return {
      title: j.title, description: j.desc, category: j.cat,
      status: j.status, customer: custId,
      provider: j.status !== 'open' && j.status !== 'quoted' ? provId : undefined,
      budget: j.budget, agreedPrice: j.agreedPrice,
      scheduledDate: daysFromNow(j.scheduledDaysFromNow),
      completedDate: j.completedDaysAgo ? daysAgo(j.completedDaysAgo) : undefined,
      whatsappDeepLink: whatsLink,
      photos: [],
      address: {
        neighbourhood: j.neigh, city: j.city,
        province: j.city === 'Maputo' ? 'Maputo Cidade' : 'Tete',
        coordinates: j.coords,
      },
    };
  }));

  // ── 5. Quotes on QUOTED/BOOKED jobs ────────
  console.log('💬 Creating quotes...');
  const quotedJobs = jobs.filter(j => j.status === 'quoted' || j.status === 'booked');
  for (const job of quotedJobs) {
    const spec = jobSpecs.find(s => s.title === job.title)!;
    const provIdx = spec.provIdx ?? 0;
    const quoteMessages = [
      'Tenho experiência neste tipo de trabalho. Posso começar amanhã.',
      'Profissional disponível imediatamente. Materiais de qualidade garantidos.',
      'Trabalho rigoroso com garantia de 3 meses. Orçamento inclui material.',
      'Especialista certificado. Prazo de 2 dias para conclusão.',
    ];
    job.quotes.push({
      provider: providers[provIdx]!._id,
      amount: job.agreedPrice ?? Math.round(job.budget * 0.9),
      message: rand(quoteMessages),
      estimatedDuration: rand(['1 dia', '2 dias', '3-4 horas', 'meio dia']),
      createdAt: daysAgo(randInt(1, 3)),
    } as any);

    // Add a second competing quote for some jobs
    if (Math.random() > 0.5) {
      const altProvIdx = (provIdx + 1) % providers.length;
      job.quotes.push({
        provider: providers[altProvIdx]!._id,
        amount: Math.round(job.budget * 0.95),
        message: 'Disponível para avaliação gratuita no local. Preço competitivo.',
        estimatedDuration: rand(['1 dia', '3 horas', '2 dias']),
        createdAt: daysAgo(randInt(1, 2)),
      } as any);
    }
    await job.save();
  }

  // ── 6. Reviews for COMPLETED jobs ──────────
  console.log('⭐ Creating reviews...');
  const completedJobs = jobs.filter(j => j.status === 'completed');
  const reviewComments = [
    'Excelente trabalho! Muito profissional e pontual. Recomendo vivamente.',
    'Serviço de qualidade. Ficou melhor do que esperava. Voltarei a contratar.',
    'Bom trabalho no geral, pequeno atraso mas compensou com a qualidade.',
    'Profissional de confiança. Trabalho limpo e bem acabado. 5 estrelas.',
    'Muito satisfeita com o resultado. Preço justo e trabalho impecável.',
    'Rápido e eficiente. Resolveu o problema em menos tempo do que esperava.',
    'Boa qualidade mas poderia ter comunicado melhor os atrasos.',
    'Superou as expectativas. Material de qualidade e mão de obra excelente.',
  ];

  const reviews = [];
  for (const job of completedJobs) {
    const spec = jobSpecs.find(s => s.title === job.title)!;
    if (spec.provIdx === undefined) continue;
    const rating = parseFloat((Math.random() * 1.5 + 3.5).toFixed(1));
    reviews.push({
      job: job._id,
      reviewer: job.customer,
      reviewee: providers[spec.provIdx]!._id,
      rating: Math.min(5, Math.round(rating)),
      comment: rand(reviewComments),
    });
  }
  await Review.insertMany(reviews);

  // ── 7. Payments for COMPLETED jobs ─────────
  console.log('💳 Creating payments...');
  const payments = [];
  for (const job of completedJobs) {
    const spec = jobSpecs.find(s => s.title === job.title)!;
    if (!job.agreedPrice || spec.provIdx === undefined) continue;
    const platformFee    = Math.round(job.agreedPrice * 0.15);
    const providerAmount = job.agreedPrice - platformFee;
    const method = Math.random() > 0.5 ? 'mpesa' : 'emola';
    payments.push({
      job: job._id,
      customer: job.customer,
      provider: providers[spec.provIdx]!._id,
      amount: job.agreedPrice,
      platformFee,
      providerAmount,
      method,
      status: 'completed',
      mpesaTransactionId: method === 'mpesa' ? genMpesaRef() : undefined,
      emolaTransactionId: method === 'emola' ? 'EMOLA' + Date.now() : undefined,
      confirmedAt: job.completedDate,
      manuallyConfirmed: Math.random() > 0.6,
    });
  }
  await Payment.insertMany(payments);

  // ── 8. Update provider totals ──────────────
  console.log('📊 Recalculating provider stats...');
  for (let i = 0; i < providers.length; i++) {
    const provPayments = payments.filter(
      p => String(p.provider) === String(providers[i]!._id)
    );
    if (provPayments.length > 0) {
      const totalEarnings = provPayments.reduce((s, p) => s + p.providerAmount, 0);
      await User.findByIdAndUpdate(providers[i]!._id, { totalEarnings });
    }
  }

  // ── 9. Update customer totalSpent ──────────
  for (let i = 0; i < customers.length; i++) {
    const custPayments = payments.filter(
      p => String(p.customer) === String(customers[i]!._id)
    );
    if (custPayments.length > 0) {
      await User.findByIdAndUpdate(customers[i]!._id, {
        totalSpent: custPayments.reduce((s, p) => s + p.amount, 0),
      });
    }
  }

  // ── Summary ───────────────────────────────
  const counts = {
    users:    await User.countDocuments(),
    jobs:     await Job.countDocuments(),
    reviews:  await Review.countDocuments(),
    payments: await Payment.countDocuments(),
  };

  console.log('\n✅ Seed complete!');
  console.log(`   👤 Users:    ${counts.users}  (1 admin + ${customers.length} customers + ${providers.length} providers)`);
  console.log(`   📋 Jobs:     ${counts.jobs}`);
  console.log(`   ⭐ Reviews:  ${counts.reviews}`);
  console.log(`   💳 Payments: ${counts.payments}`);
  console.log('\n🔑 Test accounts (OTP is logged to console in dev mode):');
  console.log('   Admin:    +258840000001');
  console.log('   Customer: +258841111001  (Ana Machava — Tete)');
  console.log('   Customer: +258841111004  (João Nhantumbo — Maputo)');
  console.log('   Provider: +258842222001  (António Chissano — Plumbing)');
  console.log('   Provider: +258842222003  (David Mondlane — Electrical)');
  console.log('   Provider: +258842222005  (Fernando Mahlanze — Mining)');

  await mongoose.disconnect();
  console.log('\n👋 Disconnected from MongoDB');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
