import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default tenant
  const tenant = await prisma.tenant.upsert({
    where: { domain: 'csusb.edu' },
    update: {},
    create: {
      name: 'CSUSB Cybersecurity Program',
      domain: 'csusb.edu',
      settings: {
        theme: 'default',
        features: {
          leaderboards: true,
          badges: true,
          analytics: true
        }
      }
    }
  });

  console.log('✅ Created tenant:', tenant.name);

  // Create admin user
  const adminPassword = await hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@csusb.edu' },
    update: {},
    create: {
      email: 'admin@csusb.edu',
      firstName: 'Admin',
      lastName: 'User',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      tenantId: tenant.id,
      preferences: {
        theme: 'dark',
        notifications: {
          email: true,
          push: false,
          leaderboard: true
        }
      }
    }
  });

  console.log('✅ Created admin user:', admin.email);

  // Create sample projects
  const projects = [
    {
      name: 'SQL Injection Basics',
      description: 'Learn the fundamentals of SQL injection attacks and defenses',
      category: 'WEB_APPLICATION',
      difficulty: 'BEGINNER',
      vulhubId: 'sqli-basic',
      instructions: 'Find and exploit the SQL injection vulnerability in the login form.',
      requirements: ['Screenshot of successful injection', 'Proof of data extraction'],
      tags: ['sql', 'injection', 'web', 'beginner']
    },
    {
      name: 'Cross-Site Scripting (XSS)',
      description: 'Practice XSS attacks and learn prevention techniques',
      category: 'WEB_APPLICATION',
      difficulty: 'INTERMEDIATE',
      vulhubId: 'xss-advanced',
      instructions: 'Execute a stored XSS attack and demonstrate cookie theft.',
      requirements: ['XSS payload execution', 'Cookie theft demonstration'],
      tags: ['xss', 'javascript', 'web', 'intermediate']
    },
    {
      name: 'Buffer Overflow Exploitation',
      description: 'Advanced buffer overflow techniques and shellcode development',
      category: 'REVERSE_ENGINEERING',
      difficulty: 'EXPERT',
      vulhubId: 'buffer-overflow',
      instructions: 'Exploit the buffer overflow vulnerability to gain shell access.',
      requirements: ['Shell access proof', 'Exploit code explanation'],
      tags: ['buffer-overflow', 'exploitation', 'assembly', 'expert']
    }
  ];

  for (const projectData of projects) {
    const project = await prisma.project.upsert({
      where: { 
        vulhubId_tenantId: {
          vulhubId: projectData.vulhubId,
          tenantId: tenant.id
        }
      },
      update: {},
      create: {
        ...projectData,
        tenantId: tenant.id,
        metadata: {
          estimatedTime: '2-4 hours',
          prerequisites: ['Basic cybersecurity knowledge']
        }
      }
    });

    console.log('✅ Created project:', project.name);
  }

  // Create sample badges
  const badges = [
    {
      name: 'First Blood',
      description: 'Complete your first submission',
      icon: 'https://example.com/badges/first-blood.svg',
      type: 'ACHIEVEMENT',
      rarity: 'COMMON',
      criteria: { submissions: 1 },
      points: 10
    },
    {
      name: 'Perfect Score',
      description: 'Achieve a perfect score on any project',
      icon: 'https://example.com/badges/perfect-score.svg',
      type: 'ACHIEVEMENT',
      rarity: 'RARE',
      criteria: { score: 100 },
      points: 50
    },
    {
      name: 'Streak Master',
      description: 'Submit projects for 7 consecutive days',
      icon: 'https://example.com/badges/streak-master.svg',
      type: 'MILESTONE',
      rarity: 'EPIC',
      criteria: { streak: 7 },
      points: 100
    }
  ];

  for (const badgeData of badges) {
    const badge = await prisma.badge.upsert({
      where: {
        name_tenantId: {
          name: badgeData.name,
          tenantId: tenant.id
        }
      },
      update: {},
      create: {
        ...badgeData,
        tenantId: tenant.id
      }
    });

    console.log('✅ Created badge:', badge.name);
  }

  // Create sample leaderboard
  const leaderboard = await prisma.leaderboard.create({
    data: {
      type: 'OVERALL',
      tenantId: tenant.id,
      entries: [],
      totalParticipants: 0
    }
  });

  console.log('✅ Created leaderboard:', leaderboard.id);

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
