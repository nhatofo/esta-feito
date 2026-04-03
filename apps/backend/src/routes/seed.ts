/**
 * Esta Feito — Seed API Route
 * ----------------------------
 * POST /api/seed  (protected by SEED_SECRET header)
 *
 * This lets you seed the production database without needing
 * ts-node on the server. Call it once after first deployment:
 *
 *   curl -X POST https://YOUR_CLOUD_RUN_URL/api/seed \
 *        -H "x-seed-secret: YOUR_SEED_SECRET"
 *
 * Add SEED_SECRET to your Cloud Run env vars before using.
 * Remove or disable this route after initial seeding.
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

const router = Router();

// Re-use the models already registered on the mongoose connection
function getModels() {
  return {
    User:    mongoose.models['User']!,
    Job:     mongoose.models['Job']!,
    Review:  mongoose.models['Review']  ?? mongoose.model('Review', new mongoose.Schema({}, { strict: false })),
    Payment: mongoose.models['Payment'] ?? mongoose.model('Payment', new mongoose.Schema({}, { strict: false })),
  };
}

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]!; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function daysAgo(n: number) { return new Date(Date.now() - n * 86400000); }
function daysFromNow(n: number) { return new Date(Date.now() + n * 86400000); }
function teteCoords(lat = 0, lng = 0) { return { type: 'Point', coordinates: [33.5867 + lng, -16.1564 + lat] }; }
function maputoCoords(lat = 0, lng = 0) { return { type: 'Point', coordinates: [32.5832 + lng, -25.9692 + lat] }; }
function genMpesaRef() { return 'MPE' + Math.random().toString(36).slice(2, 10).toUpperCase(); }

router.post('/', async (req: Request, res: Response) => {
  // Guard with secret
  const secret = process.env.SEED_SECRET;
  if (!secret || req.headers['x-seed-secret'] !== secret) {
    res.status(403).json({ success: false, error: 'Forbidden.' });
    return;
  }

  const reset = req.query.reset === 'true';

  try {
    const { User, Job, Review, Payment } = getModels();

    if (reset) {
      await Promise.all([User.deleteMany({}), Job.deleteMany({}), Review.deleteMany({}), Payment.deleteMany({})]);
      logger.info('Seed: database reset');
    }

    const existing = await User.countDocuments();
    if (existing > 0 && !reset) {
      res.json({ success: true, message: `Already seeded (${existing} users). Use ?reset=true to re-seed.` });
      return;
    }

    // ── Admin ─────────────────────────────────
    await User.create({
      fullName: 'Admin Esta Feito', email: 'admin@estafeito.co.mz',
      phone: '+258840000001', whatsappNumber: '+258840000001',
      role: 'admin', isVerified: true, isActive: true, isApproved: true,
      address: { neighbourhood: 'Cimento', city: 'Tete', province: 'Tete', coordinates: teteCoords() },
    });

    // ── Customers ─────────────────────────────
    const customerDefs = [
      { fullName: 'Ana Machava',    phone: '+258841111001', city: 'Tete',   neigh: 'Bairro 3',    coords: teteCoords(0.01, 0.02) },
      { fullName: 'Carlos Tembe',   phone: '+258841111002', city: 'Tete',   neigh: 'Matundo',     coords: teteCoords(-0.02, 0.01) },
      { fullName: 'Fatima Sitoe',   phone: '+258841111003', city: 'Tete',   neigh: 'Chingodzi',   coords: teteCoords(0.03, -0.01) },
      { fullName: 'João Nhantumbo', phone: '+258841111004', city: 'Maputo', neigh: 'Polana',       coords: maputoCoords(0.01, 0.01) },
      { fullName: 'Maria Cossa',    phone: '+258841111005', city: 'Maputo', neigh: 'Sommerchield', coords: maputoCoords(-0.01, 0.02) },
      { fullName: 'Pedro Machungo', phone: '+258841111006', city: 'Tete',   neigh: 'Mateúsa',     coords: teteCoords(0.02, 0.03) },
      { fullName: 'Sofia Muiambo',  phone: '+258841111007', city: 'Maputo', neigh: 'Alto Maé',    coords: maputoCoords(0.02, -0.01) },
      { fullName: 'Tomás Nuvunga',  phone: '+258841111008', city: 'Tete',   neigh: 'Ndzuwa',      coords: teteCoords(-0.01, -0.02) },
    ];
    const customers = await User.insertMany(customerDefs.map(c => ({
      fullName: c.fullName, phone: c.phone, role: 'customer',
      whatsappNumber: c.phone, isVerified: true, isActive: true,
      jobsPosted: randInt(2, 12), totalSpent: randInt(5000, 50000),
      address: { neighbourhood: c.neigh, city: c.city, province: c.city === 'Maputo' ? 'Maputo Cidade' : 'Tete', coordinates: c.coords },
    })));

    // ── Providers ─────────────────────────────
    const providerDefs = [
      { fullName: 'António Chissano',  phone: '+258842222001', cats: ['plumbing'],                      city: 'Tete',   neigh: 'Bairro 2',    coords: teteCoords(0.005, 0.01),    rating: 4.8, jobs: 47, earnings: 85000,  mpesa: '+25884222001' },
      { fullName: 'Berta Mucavel',     phone: '+258842222002', cats: ['cleaning'],                       city: 'Tete',   neigh: 'Cimento',     coords: teteCoords(-0.01, 0.005),   rating: 4.6, jobs: 63, earnings: 52000,  mpesa: '+25884222002' },
      { fullName: 'David Mondlane',    phone: '+258842222003', cats: ['electrical', 'plumbing'],         city: 'Tete',   neigh: 'Matundo',     coords: teteCoords(0.015, -0.005),  rating: 4.9, jobs: 89, earnings: 134000, mpesa: '+25884222003' },
      { fullName: 'Elisa Nguenha',     phone: '+258842222004', cats: ['painting'],                       city: 'Tete',   neigh: 'Chingodzi',   coords: teteCoords(-0.005, 0.015),  rating: 4.5, jobs: 28, earnings: 43000,  mpesa: '+25884222004' },
      { fullName: 'Fernando Mahlanze', phone: '+258842222005', cats: ['mining_equipment', 'electrical'], city: 'Tete',   neigh: 'Mateúsa',     coords: teteCoords(0.02, 0.02),     rating: 4.7, jobs: 34, earnings: 210000, emola: '+25886222005' },
      { fullName: 'Graça Timane',      phone: '+258842222006', cats: ['cleaning', 'gardening'],          city: 'Tete',   neigh: 'Bairro 1',    coords: teteCoords(-0.015, -0.01),  rating: 4.4, jobs: 41, earnings: 38000,  mpesa: '+25884222006' },
      { fullName: 'Hélio Buque',       phone: '+258842222007', cats: ['carpentry'],                      city: 'Tete',   neigh: 'Ndzuwa',      coords: teteCoords(0.01, -0.015),   rating: 4.8, jobs: 55, earnings: 97000,  mpesa: '+25884222007' },
      { fullName: 'Inês Sitoe',        phone: '+258842222008', cats: ['moving'],                         city: 'Tete',   neigh: 'Bairro 3',    coords: teteCoords(-0.02, 0.02),    rating: 4.3, jobs: 22, earnings: 61000,  emola: '+25886222008' },
      { fullName: 'Jorge Manhiça',     phone: '+258842222009', cats: ['electrical'],                     city: 'Maputo', neigh: 'Polana',       coords: maputoCoords(0.005, 0.005), rating: 4.9, jobs: 112, earnings: 178000, mpesa: '+25884222009' },
      { fullName: 'Lurdes Macuane',    phone: '+258842222010', cats: ['cleaning', 'painting'],           city: 'Maputo', neigh: 'Sommerchield', coords: maputoCoords(-0.005, 0.01), rating: 4.6, jobs: 74, earnings: 89000,  mpesa: '+25884222010' },
      { fullName: 'Manuel Macamo',     phone: '+258842222011', cats: ['plumbing', 'carpentry'],          city: 'Maputo', neigh: 'Alto Maé',     coords: maputoCoords(0.01, -0.005), rating: 4.7, jobs: 58, earnings: 115000, emola: '+25886222011' },
      { fullName: 'Nazira Cumbe',      phone: '+258842222012', cats: ['gardening', 'cleaning'],          city: 'Maputo', neigh: 'Maxaquene',    coords: maputoCoords(-0.01, -0.01), rating: 4.5, jobs: 33, earnings: 44000,  mpesa: '+25884222012' },
    ];
    const providers = await User.insertMany(providerDefs.map(p => ({
      fullName: p.fullName, phone: p.phone, role: 'provider',
      whatsappNumber: p.phone, isVerified: true, isActive: true, isApproved: true,
      bio: `Profissional com ${randInt(3, 15)} anos de experiência em ${p.cats[0]?.replace('_', ' ')}.`,
      categories: p.cats, skills: p.cats, yearsExperience: randInt(3, 15),
      rating: p.rating, reviewCount: randInt(10, 60), jobsCompleted: p.jobs,
      totalEarnings: p.earnings, availabilityRadius: randInt(5, 20),
      bankDetails: { mpesaNumber: (p as any).mpesa, emolaNumber: (p as any).emola },
      address: { neighbourhood: p.neigh, city: p.city, province: p.city === 'Maputo' ? 'Maputo Cidade' : 'Tete', coordinates: p.coords },
    })));

    // ── Jobs: open ────────────────────────────
    const openJobs = await Job.insertMany([
      { title: 'Reparar cano partido na cozinha', description: 'Cano de água debaixo da pia partido.', category: 'plumbing', status: 'open', customer: customers[0]!._id, budget: 3500, scheduledDate: daysFromNow(2), address: { neighbourhood: 'Bairro 3', city: 'Tete', province: 'Tete', coordinates: teteCoords(0.01, 0.02) }, photos: [] },
      { title: 'Limpeza geral apartamento T3', description: 'Apartamento de 3 quartos após mudança.', category: 'cleaning', status: 'open', customer: customers[1]!._id, budget: 5000, scheduledDate: daysFromNow(3), address: { neighbourhood: 'Matundo', city: 'Tete', province: 'Tete', coordinates: teteCoords(-0.02, 0.01) }, photos: [] },
      { title: 'Instalação eléctrica nova moradia', description: 'Casa nova de 4 assoalhadas.', category: 'electrical', status: 'open', customer: customers[2]!._id, budget: 25000, scheduledDate: daysFromNow(5), address: { neighbourhood: 'Chingodzi', city: 'Tete', province: 'Tete', coordinates: teteCoords(0.03, -0.01) }, photos: [] },
      { title: 'Pintura exterior vivenda', description: 'Vivenda de 2 pisos, exterior completo.', category: 'painting', status: 'open', customer: customers[3]!._id, budget: 18000, scheduledDate: daysFromNow(7), address: { neighbourhood: 'Polana', city: 'Maputo', province: 'Maputo Cidade', coordinates: maputoCoords(0.01, 0.01) }, photos: [] },
      { title: 'Reparação bomba mina Moatize', description: 'Bomba de extracção avariada.', category: 'mining_equipment', status: 'open', customer: customers[5]!._id, budget: 45000, scheduledDate: daysFromNow(1), address: { neighbourhood: 'Mateúsa', city: 'Tete', province: 'Tete', coordinates: teteCoords(0.02, 0.03) }, photos: [] },
      { title: 'Mudança escritório', description: 'Mobiliário pesado, equipa e carrinha.', category: 'moving', status: 'open', customer: customers[6]!._id, budget: 12000, scheduledDate: daysFromNow(6), address: { neighbourhood: 'Alto Maé', city: 'Maputo', province: 'Maputo Cidade', coordinates: maputoCoords(0.02, -0.01) }, photos: [] },
      { title: 'Guarda-fato embutido', description: 'Quarto principal, 3m de comprimento.', category: 'carpentry', status: 'open', customer: customers[7]!._id, budget: 22000, scheduledDate: daysFromNow(10), address: { neighbourhood: 'Ndzuwa', city: 'Tete', province: 'Tete', coordinates: teteCoords(-0.01, -0.02) }, photos: [] },
    ]);

    // ── Jobs: booked ─────────────────────────
    const bookedJobs = await Job.insertMany([
      { title: 'Reparação torneiras 3 WC', description: 'Torneiras a pingar, substituição dos mecanismos.', category: 'plumbing', status: 'booked', customer: customers[0]!._id, provider: providers[0]!._id, budget: 4500, agreedPrice: 4000, scheduledDate: daysFromNow(1), address: { neighbourhood: 'Bairro 3', city: 'Tete', province: 'Tete', coordinates: teteCoords(0.009, 0.019) }, whatsappDeepLink: `https://wa.me/258842222001?text=Ol%C3%A1%21+Esta+Feito`, photos: [] },
      { title: 'Limpeza pré-arrendamento', description: 'Limpeza profissional completa.', category: 'cleaning', status: 'booked', customer: customers[1]!._id, provider: providers[1]!._id, budget: 6000, agreedPrice: 5500, scheduledDate: daysFromNow(2), address: { neighbourhood: 'Matundo', city: 'Tete', province: 'Tete', coordinates: teteCoords(-0.018, 0.012) }, whatsappDeepLink: `https://wa.me/258842222002?text=Ol%C3%A1%21+Esta+Feito`, photos: [] },
      { title: 'Quadro eléctrico substituição', description: 'Painel moderno 20 disjuntores.', category: 'electrical', status: 'booked', customer: customers[2]!._id, provider: providers[2]!._id, budget: 12000, agreedPrice: 11000, scheduledDate: daysFromNow(2), address: { neighbourhood: 'Chingodzi', city: 'Tete', province: 'Tete', coordinates: teteCoords(0.028, -0.012) }, whatsappDeepLink: `https://wa.me/258842222003?text=Ol%C3%A1%21+Esta+Feito`, photos: [] },
      { title: 'Manutenção geradora mina', description: 'Geradora 100kVA parada.', category: 'mining_equipment', status: 'booked', customer: customers[5]!._id, provider: providers[4]!._id, budget: 80000, agreedPrice: 75000, scheduledDate: daysFromNow(1), address: { neighbourhood: 'Mateúsa', city: 'Tete', province: 'Tete', coordinates: teteCoords(0.022, 0.028) }, whatsappDeepLink: `https://wa.me/258842222005?text=Ol%C3%A1%21+Esta+Feito`, photos: [] },
    ]);

    // ── Jobs: completed ───────────────────────
    const completedJobs = await Job.insertMany([
      { title: 'Canalização nova casa completa', description: 'Instalação completa de canalização.', category: 'plumbing', status: 'completed', customer: customers[2]!._id, provider: providers[0]!._id, budget: 35000, agreedPrice: 32000, scheduledDate: daysAgo(18), completedDate: daysAgo(8), address: { neighbourhood: 'Chingodzi', city: 'Tete', province: 'Tete', coordinates: teteCoords(0.032, -0.015) }, photos: [] },
      { title: 'Limpeza hotel 20 quartos', description: 'Limpeza profunda hotel completo.', category: 'cleaning', status: 'completed', customer: customers[3]!._id, provider: providers[9]!._id, budget: 15000, agreedPrice: 14000, scheduledDate: daysAgo(28), completedDate: daysAgo(13), address: { neighbourhood: 'Polana', city: 'Maputo', province: 'Maputo Cidade', coordinates: maputoCoords(0.012, 0.012) }, photos: [] },
      { title: 'Electricidade moradia T4 Maputo', description: 'Wiring completo e quadro eléctrico.', category: 'electrical', status: 'completed', customer: customers[6]!._id, provider: providers[8]!._id, budget: 45000, agreedPrice: 42000, scheduledDate: daysAgo(37), completedDate: daysAgo(17), address: { neighbourhood: 'Alto Maé', city: 'Maputo', province: 'Maputo Cidade', coordinates: maputoCoords(0.018, -0.008) }, photos: [] },
      { title: 'Pintura exterior condomínio', description: '8 apartamentos, exterior completo.', category: 'painting', status: 'completed', customer: customers[4]!._id, provider: providers[3]!._id, budget: 55000, agreedPrice: 52000, scheduledDate: daysAgo(22), completedDate: daysAgo(10), address: { neighbourhood: 'Sommerchield', city: 'Maputo', province: 'Maputo Cidade', coordinates: maputoCoords(-0.012, 0.022) }, photos: [] },
      { title: 'Mudança residencial completa', description: 'T3 com electrodomésticos.', category: 'moving', status: 'completed', customer: customers[5]!._id, provider: providers[7]!._id, budget: 20000, agreedPrice: 18500, scheduledDate: daysAgo(16), completedDate: daysAgo(7), address: { neighbourhood: 'Polana', city: 'Maputo', province: 'Maputo Cidade', coordinates: maputoCoords(0.005, 0.005) }, photos: [] },
      { title: 'Cozinha equipada em MDF', description: 'Móveis superiores e inferiores.', category: 'carpentry', status: 'completed', customer: customers[3]!._id, provider: providers[6]!._id, budget: 75000, agreedPrice: 70000, scheduledDate: daysAgo(47), completedDate: daysAgo(22), address: { neighbourhood: 'Polana', city: 'Maputo', province: 'Maputo Cidade', coordinates: maputoCoords(0.014, 0.014) }, photos: [] },
      { title: 'Reparação britadeira Moatize', description: 'Britadeira primária, peças em stock.', category: 'mining_equipment', status: 'completed', customer: customers[2]!._id, provider: providers[4]!._id, budget: 120000, agreedPrice: 115000, scheduledDate: daysAgo(33), completedDate: daysAgo(15), address: { neighbourhood: 'Mateúsa', city: 'Tete', province: 'Tete', coordinates: teteCoords(0.025, 0.032) }, photos: [] },
    ]);

    // ── Reviews ───────────────────────────────
    const reviewComments = [
      'Excelente trabalho! Muito profissional e pontual. Recomendo vivamente.',
      'Serviço de qualidade. Ficou melhor do que esperava. Voltarei a contratar.',
      'Bom trabalho no geral, pequeno atraso mas compensou com a qualidade.',
      'Profissional de confiança. Trabalho limpo e bem acabado. 5 estrelas.',
      'Muito satisfeita com o resultado. Preço justo e trabalho impecável.',
      'Rápido e eficiente. Resolveu o problema em menos tempo do que esperava.',
      'Superou as expectativas. Material de qualidade e mão de obra excelente.',
    ];
    const provIndices = [0, 9, 8, 3, 7, 6, 4];
    await Review.insertMany(completedJobs.map((job, i) => ({
      job: job._id, reviewer: job.customer, reviewee: providers[provIndices[i]!]!._id,
      rating: randInt(4, 5), comment: rand(reviewComments),
    })));

    // ── Payments ──────────────────────────────
    const methods = ['mpesa', 'emola', 'mpesa', 'mpesa', 'emola', 'mpesa', 'emola'];
    await Payment.insertMany(completedJobs.map((job, i) => {
      const agreed = (job as any).agreedPrice;
      const fee = Math.round(agreed * 0.15);
      return {
        job: job._id, customer: job.customer, provider: job.provider,
        amount: agreed, platformFee: fee, providerAmount: agreed - fee,
        method: methods[i], status: 'completed',
        mpesaTransactionId: methods[i] === 'mpesa' ? genMpesaRef() : undefined,
        emolaTransactionId: methods[i] === 'emola' ? 'EMOLA' + Date.now() + i : undefined,
        confirmedAt: (job as any).completedDate, manuallyConfirmed: i % 3 === 0,
      };
    }));

    const counts = {
      users: await User.countDocuments(),
      jobs: await Job.countDocuments(),
      reviews: await Review.countDocuments(),
      payments: await Payment.countDocuments(),
    };

    logger.info(`Seed complete: ${JSON.stringify(counts)}`);
    res.json({
      success: true,
      message: '✅ Database seeded successfully!',
      counts,
      testAccounts: {
        admin:     { phone: '+258840000001', role: 'admin' },
        customers: ['+258841111001 (Ana)', '+258841111004 (João)'],
        providers: ['+258842222001 (António — Plumbing)', '+258842222003 (David — Electrical)', '+258842222005 (Fernando — Mining)'],
      },
    });
  } catch (err: any) {
    logger.error('Seed failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
