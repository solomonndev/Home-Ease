import { db } from './src/lib/db';
import { hashPassword } from './src/lib/auth';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminHash = await hashPassword('admin123');
  const admin = await db.user.upsert({
    where: { email: 'admin@domestic-services.com' },
    update: {},
    create: {
      email: 'admin@domestic-services.com',
      name: 'Admin User',
      phone: '+234 800 000 0001',
      passwordHash: adminHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    }
  });
  console.log('✅ Admin created:', admin.email);

  // Create sample clients
  const clientHash = await hashPassword('client123');
  const client1 = await db.user.upsert({
    where: { email: 'adaeze@example.com' },
    update: {},
    create: {
      email: 'adaeze@example.com',
      name: 'Adaeze Okonkwo',
      phone: '+234 801 234 5678',
      passwordHash: clientHash,
      role: 'CLIENT',
      status: 'ACTIVE',
    }
  });

  const client2 = await db.user.upsert({
    where: { email: 'bola@example.com' },
    update: {},
    create: {
      email: 'bola@example.com',
      name: 'Bola Adeyemi',
      phone: '+234 802 345 6789',
      passwordHash: clientHash,
      role: 'CLIENT',
      status: 'ACTIVE',
    }
  });

  const client3 = await db.user.upsert({
    where: { email: 'chidi@example.com' },
    update: {},
    create: {
      email: 'chidi@example.com',
      name: 'Chidi Nwosu',
      phone: '+234 803 456 7890',
      passwordHash: clientHash,
      role: 'CLIENT',
      status: 'ACTIVE',
    }
  });
  console.log('✅ Clients created');

  // Create sample providers
  const providerHash = await hashPassword('provider123');

  const providers = [
    {
      email: 'ngozi@example.com',
      name: 'Ngozi Eze',
      phone: '+234 811 111 1111',
      skills: 'Cleaning,Laundry,Deep Cleaning',
      bio: 'Experienced professional cleaner with 5+ years of experience in residential and commercial cleaning.',
      hourlyRate: 2500,
      location: 'Lagos Island',
      availability: 'ALL_WEEK',
      verificationStatus: 'VERIFIED',
      rating: 4.8,
      totalReviews: 23,
      completedJobs: 45,
    },
    {
      email: 'emeka@example.com',
      name: 'Emeka Okafor',
      phone: '+234 822 222 2222',
      skills: 'Plumbing,Pipe Repair,AC Maintenance',
      bio: 'Certified plumber and general maintenance worker. Quick response time and quality work guaranteed.',
      hourlyRate: 3500,
      location: 'Victoria Island',
      availability: 'WEEKDAYS',
      verificationStatus: 'VERIFIED',
      rating: 4.6,
      totalReviews: 18,
      completedJobs: 32,
    },
    {
      email: 'folake@example.com',
      name: 'Folake Adekunle',
      phone: '+234 833 333 3333',
      skills: 'Cooking,Meal Prep,Elderly Care',
      bio: 'Professional chef and caregiver. Specializes in Nigerian and continental dishes. Also experienced in elderly care.',
      hourlyRate: 3000,
      location: 'Ikeja',
      availability: 'ALL_WEEK',
      verificationStatus: 'VERIFIED',
      rating: 4.9,
      totalReviews: 31,
      completedJobs: 52,
    },
    {
      email: 'ibrahim@example.com',
      name: 'Ibrahim Musa',
      phone: '+234 844 444 4444',
      skills: 'Electrical,Generator Repair,Home Wiring',
      bio: 'Licensed electrician with expertise in home wiring, appliance repair, and general maintenance.',
      hourlyRate: 4000,
      location: 'Surulere',
      availability: 'WEEKDAYS',
      verificationStatus: 'VERIFIED',
      rating: 4.5,
      totalReviews: 14,
      completedJobs: 28,
    },
    {
      email: 'amara@example.com',
      name: 'Amara Obi',
      phone: '+234 855 555 5555',
      skills: 'Cleaning,Gardening,Landscaping',
      bio: 'Detail-oriented cleaner and gardener. I transform your living spaces and outdoor areas.',
      hourlyRate: 2000,
      location: 'Lekki',
      availability: 'WEEKENDS',
      verificationStatus: 'VERIFIED',
      rating: 4.7,
      totalReviews: 20,
      completedJobs: 38,
    },
    {
      email: 'tunde@example.com',
      name: 'Tunde Bakare',
      phone: '+234 866 666 6666',
      skills: 'Painting,Interior Decor,Wall Finishing',
      bio: 'Skilled painter and handyman with an eye for detail. Interior and exterior painting specialist.',
      hourlyRate: 3000,
      location: 'Yaba',
      availability: 'ALL_WEEK',
      verificationStatus: 'PENDING',
      rating: 0,
      totalReviews: 0,
      completedJobs: 0,
    },
    {
      email: 'grace@example.com',
      name: 'Grace Umeh',
      phone: '+234 877 777 7777',
      skills: 'Caregiving,Nanny Services,Laundry',
      bio: 'Compassionate caregiver and laundry expert. Experienced with children and elderly care.',
      hourlyRate: 2500,
      location: 'Ajah',
      availability: 'WEEKDAYS',
      verificationStatus: 'PENDING',
      rating: 0,
      totalReviews: 0,
      completedJobs: 0,
    },
  ];

  for (const p of providers) {
    const user = await db.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        name: p.name,
        phone: p.phone,
        passwordHash: providerHash,
        role: 'PROVIDER',
        status: 'ACTIVE',
      }
    });

    await db.provider.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        skills: p.skills,
        bio: p.bio,
        hourlyRate: p.hourlyRate,
        location: p.location,
        availability: p.availability,
        verificationStatus: p.verificationStatus as any,
        rating: p.rating,
        totalReviews: p.totalReviews,
        completedJobs: p.completedJobs,
      }
    });
  }
  console.log('✅ Providers created');

  // Create sample service requests
  const requests = [
    {
      clientId: client1.id,
      serviceType: 'CLEANING',
      description: 'Deep cleaning of 3-bedroom apartment',
      location: 'Lagos Island',
      requestedDate: new Date('2025-03-10'),
      requestedTime: '09:00',
      status: 'COMPLETED',
      paymentStatus: 'RELEASED',
      amount: 7500,
    },
    {
      clientId: client1.id,
      serviceType: 'COOKING',
      description: 'Need a chef for a dinner party for 10 guests',
      location: 'Lagos Island',
      requestedDate: new Date('2025-03-15'),
      requestedTime: '14:00',
      status: 'COMPLETED',
      paymentStatus: 'RELEASED',
      amount: 12000,
    },
    {
      clientId: client2.id,
      serviceType: 'PLUMBING',
      description: 'Kitchen sink leaking, needs urgent repair',
      location: 'Victoria Island',
      requestedDate: new Date('2025-03-12'),
      requestedTime: '10:00',
      status: 'IN_PROGRESS',
      paymentStatus: 'HELD_IN_ESCROW',
      amount: 5000,
    },
    {
      clientId: client2.id,
      serviceType: 'LAUNDRY',
      description: 'Weekly laundry service for family of 4',
      location: 'Ikeja',
      requestedDate: new Date('2025-03-18'),
      requestedTime: '08:00',
      status: 'ACCEPTED',
      paymentStatus: 'HELD_IN_ESCROW',
      amount: 4000,
    },
    {
      clientId: client3.id,
      serviceType: 'CAREGIVING',
      description: 'Need elderly caregiver for 2 weeks',
      location: 'Surulere',
      requestedDate: new Date('2025-03-20'),
      requestedTime: '07:00',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      amount: 25000,
    },
    {
      clientId: client3.id,
      serviceType: 'ELECTRICAL',
      description: 'New light fixture installation in living room',
      location: 'Lekki',
      requestedDate: new Date('2025-03-22'),
      requestedTime: '11:00',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      amount: 6000,
    },
    {
      clientId: client1.id,
      serviceType: 'CLEANING',
      description: 'Move-out cleaning for 2-bedroom flat',
      location: 'Lagos Island',
      requestedDate: new Date('2025-03-25'),
      requestedTime: '08:00',
      status: 'MATCHED',
      paymentStatus: 'PENDING',
      amount: 8000,
    },
  ];

  // Get verified providers for assignments
  const ngozi = await db.user.findUnique({ where: { email: 'ngozi@example.com' } });
  const folake = await db.user.findUnique({ where: { email: 'folake@example.com' } });
  const emeka = await db.user.findUnique({ where: { email: 'emeka@example.com' } });
  const amara = await db.user.findUnique({ where: { email: 'amara@example.com' } });

  const ngoziProvider = ngozi ? await db.provider.findUnique({ where: { userId: ngozi.id } }) : null;
  const folakeProvider = folake ? await db.provider.findUnique({ where: { userId: folake.id } }) : null;
  const emekaProvider = emeka ? await db.provider.findUnique({ where: { userId: emeka.id } }) : null;
  const amaraProvider = amara ? await db.provider.findUnique({ where: { userId: amara.id } }) : null;

  // Assign providers to requests
  const assignedRequests = [
    { ...requests[0], providerId: ngoziProvider?.id },
    { ...requests[1], providerId: folakeProvider?.id },
    { ...requests[2], providerId: emekaProvider?.id },
    { ...requests[3], providerId: amaraProvider?.id },
    requests[4],
    requests[5],
    { ...requests[6], providerId: ngoziProvider?.id }, // MATCHED job offer
  ];

  for (const r of assignedRequests) {
    await db.serviceRequest.create({ data: r as any });
  }
  console.log('✅ Service requests created');

  // Create sample transactions
  const allRequests = await db.serviceRequest.findMany({ take: 4 });
  for (const req of allRequests) {
    if (req.paymentStatus !== 'PENDING' && req.providerId) {
      await db.transaction.create({
        data: {
          requestId: req.id,
          clientId: req.clientId,
          providerId: req.providerId,
          amount: req.amount,
          paymentMethod: 'CARD',
          status: req.paymentStatus === 'RELEASED' ? 'COMPLETED' : 'ESCROW',
        }
      });
    }
  }

  // Create sample feedback
  if (ngoziProvider && allRequests[0]) {
    await db.feedback.create({
      data: {
        requestId: allRequests[0].id,
        clientId: allRequests[0].clientId,
        providerId: ngoziProvider.id,
        rating: 5,
        comment: 'Excellent cleaning service! Very thorough and professional.',
      }
    });
  }
  if (folakeProvider && allRequests[1]) {
    await db.feedback.create({
      data: {
        requestId: allRequests[1].id,
        clientId: allRequests[1].clientId,
        providerId: folakeProvider.id,
        rating: 5,
        comment: 'Amazing chef! The food was incredible. Will definitely hire again.',
      }
    });
  }
  console.log('✅ Transactions and feedback created');

  console.log('🎉 Seeding complete!');
  console.log('\n📋 Test Accounts:');
  console.log('  Admin:    admin@domestic-services.com / admin123');
  console.log('  Client:   adaeze@example.com / client123');
  console.log('  Provider: ngozi@example.com / provider123');
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
