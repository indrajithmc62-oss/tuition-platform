const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const tutors = [
  {
    name: 'Priya Sharma',
    email: 'priya.math@test.com',
    subjects: ['Math', 'Algebra'],
    hourlyRate: 15,
    bio: 'Math tutor with 5 years of experience teaching algebra and calculus.',
    availability: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '13:00' },
      { dayOfWeek: 3, startTime: '09:00', endTime: '13:00' },
    ],
  },
  {
    name: 'Arjun Mehta',
    email: 'arjun.physics@test.com',
    subjects: ['Physics'],
    hourlyRate: 18,
    bio: 'Physics graduate specializing in mechanics and electromagnetism.',
    availability: [
      { dayOfWeek: 2, startTime: '14:00', endTime: '18:00' },
      { dayOfWeek: 4, startTime: '14:00', endTime: '18:00' },
    ],
  },
  {
    name: 'Fatima Khan',
    email: 'fatima.english@test.com',
    subjects: ['English', 'Literature'],
    hourlyRate: 12,
    bio: 'English literature tutor focused on essay writing and comprehension.',
    availability: [
      { dayOfWeek: 0, startTime: '10:00', endTime: '14:00' },
      { dayOfWeek: 6, startTime: '10:00', endTime: '14:00' },
    ],
  },
  {
    name: 'Rahul Verma',
    email: 'rahul.chem@test.com',
    subjects: ['Chemistry'],
    hourlyRate: 16,
    bio: 'Chemistry tutor covering organic and inorganic chemistry for high school.',
    availability: [
      { dayOfWeek: 1, startTime: '16:00', endTime: '20:00' },
      { dayOfWeek: 5, startTime: '16:00', endTime: '20:00' },
    ],
  },
  {
    name: 'Ananya Iyer',
    email: 'ananya.history@test.com',
    subjects: ['History'],
    hourlyRate: 10,
    bio: 'History tutor passionate about world history and civics.',
    availability: [
      { dayOfWeek: 2, startTime: '09:00', endTime: '12:00' },
      { dayOfWeek: 4, startTime: '09:00', endTime: '12:00' },
    ],
  },
];

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  for (const t of tutors) {
    const existing = await prisma.user.findUnique({ where: { email: t.email } });
    if (existing) {
      console.log(`Skipping ${t.email} — already exists`);
      continue;
    }

    await prisma.user.create({
      data: {
        name: t.name,
        email: t.email,
        passwordHash,
        role: 'TUTOR',
        tutorProfile: {
          create: {
            bio: t.bio,
            subjects: t.subjects,
            hourlyRate: t.hourlyRate,
            availability: { create: t.availability },
          },
        },
      },
    });

    console.log(`Created tutor: ${t.name} (${t.email})`);
  }

  console.log('\nDone! All seeded tutors use the password: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());