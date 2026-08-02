import { User } from '../models/User.js';
import { hashPassword } from '../../modules/auth/password.service.js';

const SEED_USERS = [
  {
    fullName: 'Arjun Sharma',
    username: '22CSE001',
    password: 'student123',
    role: 'student',
    studentId: '22CSE001',
    department: 'CSE',
    year: 4,
    section: 'A',
  },
  {
    fullName: 'Ramesh Sharma',
    username: 'P22CSE001',
    password: 'parent123',
    role: 'parent',
    studentId: '22CSE001',
    department: 'CSE',
    year: 4,
    section: 'A',
  },
];

export async function seedUsers(): Promise<void> {
  let created = 0;

  for (const userData of SEED_USERS) {
    const exists = await User.findOne({ username: userData.username });
    if (exists) continue;

    const passwordHash = await hashPassword(userData.password);
    await User.create({
      fullName: userData.fullName,
      username: userData.username,
      passwordHash,
      role: userData.role,
      studentId: userData.studentId,
      department: userData.department,
      year: userData.year,
      section: userData.section,
    });

    created++;
  }

  console.log(`✓ ${created} user(s) seeded`);
}
