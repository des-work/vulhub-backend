import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vulhub.com' },
    update: {},
    create: {
      email: 'admin@vulhub.com',
      firstName: 'Admin',
      lastName: 'User',
      password: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      preferences: JSON.stringify({
        theme: 'dark',
        notifications: true,
      }),
    },
  });

  console.log('✅ Created admin user');

  // Create instructor user
  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@vulhub.com' },
    update: {},
    create: {
      email: 'instructor@vulhub.com',
      firstName: 'Jane',
      lastName: 'Instructor',
      password: hashedPassword,
      role: 'INSTRUCTOR',
      status: 'ACTIVE',
      preferences: JSON.stringify({
        theme: 'light',
        notifications: true,
      }),
    },
  });

  console.log('✅ Created instructor user');

  // Create sample students
  const students = await Promise.all([
    prisma.user.upsert({
      where: { email: 'student1@vulhub.com' },
      update: {},
      create: {
        email: 'student1@vulhub.com',
        firstName: 'Alice',
        lastName: 'Student',
        password: hashedPassword,
        role: 'STUDENT',
        status: 'ACTIVE',
        preferences: JSON.stringify({
          theme: 'auto',
          notifications: true,
        }),
      },
    }),
    prisma.user.upsert({
      where: { email: 'student2@vulhub.com' },
      update: {},
      create: {
        email: 'student2@vulhub.com',
        firstName: 'Bob',
        lastName: 'Learner',
        password: hashedPassword,
        role: 'STUDENT',
        status: 'ACTIVE',
        preferences: JSON.stringify({
          theme: 'dark',
          notifications: false,
        }),
      },
    }),
  ]);

  console.log('✅ Created sample students');

  // Create sample projects
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        name: 'SQL Injection Basics',
        description: 'Learn the fundamentals of SQL injection attacks and how to prevent them.',
        category: 'Web Security',
        difficulty: 'Beginner',
        points: 100,
        isActive: true,
        isPublic: true,
        tags: JSON.stringify(['SQL', 'Injection', 'Web', 'Database']),
      },
    }),
    prisma.project.create({
      data: {
        name: 'Cross-Site Scripting (XSS)',
        description: 'Understand XSS vulnerabilities and implement proper input validation.',
        category: 'Web Security',
        difficulty: 'Intermediate',
        points: 150,
        isActive: true,
        isPublic: true,
        tags: JSON.stringify(['XSS', 'JavaScript', 'Web', 'Validation']),
      },
    }),
    prisma.project.create({
      data: {
        name: 'Buffer Overflow Exploitation',
        description: 'Advanced memory corruption techniques and exploitation methods.',
        category: 'Binary Exploitation',
        difficulty: 'Advanced',
        points: 300,
        isActive: true,
        isPublic: true,
        tags: JSON.stringify(['Buffer Overflow', 'Memory', 'Exploitation', 'Assembly']),
      },
    }),
    prisma.project.create({
      data: {
        name: 'Network Traffic Analysis',
        description: 'Analyze network packets to identify malicious activity and security threats.',
        category: 'Network Security',
        difficulty: 'Intermediate',
        points: 200,
        isActive: true,
        isPublic: true,
        tags: JSON.stringify(['Network', 'Analysis', 'Wireshark', 'Traffic']),
      },
    }),
    prisma.project.create({
      data: {
        name: 'Cryptography Challenge',
        description: 'Solve various cryptographic puzzles and understand encryption methods.',
        category: 'Cryptography',
        difficulty: 'Advanced',
        points: 250,
        isActive: true,
        isPublic: true,
        tags: JSON.stringify(['Crypto', 'Encryption', 'Decryption', 'Puzzles']),
      },
    }),
  ]);

  console.log('✅ Created sample projects');

  // Create sample badges
  const badges = await Promise.all([
    prisma.badge.create({
      data: {
        name: 'First Steps',
        description: 'Complete your first project submission',
        icon: '🎯',
        category: 'Achievement',
        difficulty: 'Beginner',
        criteria: JSON.stringify({
          minSubmissions: 1,
          requiredProjects: [],
        }),
        isActive: true,
      },
    }),
    prisma.badge.create({
      data: {
        name: 'Web Warrior',
        description: 'Complete 5 web security projects',
        icon: '🕸️',
        category: 'Specialization',
        difficulty: 'Intermediate',
        criteria: JSON.stringify({
          minSubmissions: 5,
          requiredProjects: ['Web Security'],
        }),
        isActive: true,
      },
    }),
    prisma.badge.create({
      data: {
        name: 'Crypto Master',
        description: 'Solve advanced cryptography challenges',
        icon: '🔐',
        category: 'Expertise',
        difficulty: 'Advanced',
        criteria: JSON.stringify({
          minSubmissions: 3,
          requiredProjects: ['Cryptography'],
          minScore: 80,
        }),
        isActive: true,
      },
    }),
    prisma.badge.create({
      data: {
        name: 'Speed Demon',
        description: 'Complete a project in under 24 hours',
        icon: '⚡',
        category: 'Performance',
        difficulty: 'Intermediate',
        criteria: JSON.stringify({
          timeLimit: 24,
          timeUnit: 'hours',
        }),
        isActive: true,
      },
    }),
  ]);

  console.log('✅ Created sample badges');

  // Create sample submissions
  const submissions = await Promise.all([
    prisma.submission.create({
      data: {
        projectId: projects[0].id,
        userId: students[0].id,
        status: 'APPROVED',
        score: 95,
        feedback: 'Excellent work! You demonstrated a solid understanding of SQL injection concepts.',
        evidenceUrls: JSON.stringify(['https://example.com/evidence1.png']),
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        reviewedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        reviewedBy: instructor.id,
      },
    }),
    prisma.submission.create({
      data: {
        projectId: projects[1].id,
        userId: students[0].id,
        status: 'PENDING',
        evidenceUrls: JSON.stringify(['https://example.com/evidence2.png']),
        submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.submission.create({
      data: {
        projectId: projects[0].id,
        userId: students[1].id,
        status: 'APPROVED',
        score: 88,
        feedback: 'Good work! Minor improvements needed in the prevention section.',
        evidenceUrls: JSON.stringify(['https://example.com/evidence3.png']),
        submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        reviewedBy: instructor.id,
      },
    }),
  ]);

  console.log('✅ Created sample submissions');

  // Create sample user badges
  await prisma.userBadge.create({
    data: {
      userId: students[0].id,
      badgeId: badges[0].id,
      earnedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('✅ Created sample user badges');

  // Create sample leaderboard entries
  await Promise.all([
    prisma.leaderboard.create({
      data: {
        userId: students[0].id,
        score: 95,
        rank: 1,
      },
    }),
    prisma.leaderboard.create({
      data: {
        userId: students[1].id,
        score: 88,
        rank: 2,
      },
    }),
  ]);

  console.log('✅ Created sample leaderboard entries');

  // Create sample audit logs
  await Promise.all([
    prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'CREATE',
        resource: 'PROJECT',
        resourceId: projects[0].id,
        details: JSON.stringify({
          projectName: projects[0].name,
          category: projects[0].category,
        }),
        ipAddress: '127.0.0.1',
        userAgent: 'VulHub-Admin/1.0',
        success: true,
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: instructor.id,
        action: 'REVIEW',
        resource: 'SUBMISSION',
        resourceId: submissions[0].id,
        details: JSON.stringify({
          score: submissions[0].score,
          status: submissions[0].status,
        }),
        ipAddress: '127.0.0.1',
        userAgent: 'VulHub-Instructor/1.0',
        success: true,
      },
    }),
  ]);

  console.log('✅ Created sample audit logs');

  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('📋 Created:');
  console.log(`- 4 users: 1 admin, 1 instructor, 2 students`);
  console.log(`- ${projects.length} projects`);
  console.log(`- ${badges.length} badges`);
  console.log(`- ${submissions.length} submissions`);
  console.log(`- 1 user badge`);
  console.log(`- 2 leaderboard entries`);
  console.log(`- 2 audit logs`);
  console.log('');
  console.log('🔑 Login credentials:');
  console.log('- Admin: admin@vulhub.com / admin123');
  console.log('- Instructor: instructor@vulhub.com / admin123');
  console.log('- Student 1: student1@vulhub.com / admin123');
  console.log('- Student 2: student2@vulhub.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
