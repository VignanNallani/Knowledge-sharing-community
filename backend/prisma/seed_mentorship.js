import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding mentorship system...');

  // Create skill taxonomy
  const skills = [
    // Technical Skills
    { name: 'JavaScript', category: 'Programming', level: 'INTERMEDIATE', demandScore: 8.5 },
    { name: 'React', category: 'Frontend', level: 'INTERMEDIATE', demandScore: 9.0 },
    { name: 'Node.js', category: 'Backend', level: 'INTERMEDIATE', demandScore: 8.0 },
    { name: 'Python', category: 'Programming', level: 'INTERMEDIATE', demandScore: 8.8 },
    { name: 'TypeScript', category: 'Programming', level: 'INTERMEDIATE', demandScore: 8.7 },
    { name: 'AWS', category: 'Cloud', level: 'ADVANCED', demandScore: 8.9 },
    { name: 'Docker', category: 'DevOps', level: 'INTERMEDIATE', demandScore: 8.3 },
    { name: 'PostgreSQL', category: 'Database', level: 'INTERMEDIATE', demandScore: 8.1 },
    { name: 'MongoDB', category: 'Database', level: 'INTERMEDIATE', demandScore: 7.8 },
    { name: 'GraphQL', category: 'API', level: 'ADVANCED', demandScore: 7.5 },
    
    // Career Skills
    { name: 'System Design', category: 'Architecture', level: 'ADVANCED', demandScore: 9.2 },
    { name: 'Code Review', category: 'Process', level: 'INTERMEDIATE', demandScore: 8.4 },
    { name: 'Technical Leadership', category: 'Management', level: 'ADVANCED', demandScore: 9.1 },
    { name: 'Career Planning', category: 'Career', level: 'INTERMEDIATE', demandScore: 8.6 },
    { name: 'Interview Preparation', category: 'Career', level: 'INTERMEDIATE', demandScore: 9.3 },
    { name: 'Salary Negotiation', category: 'Career', level: 'BEGINNER', demandScore: 8.2 },
    { name: 'Team Management', category: 'Management', level: 'ADVANCED', demandScore: 8.8 },
    { name: 'Product Thinking', category: 'Product', level: 'INTERMEDIATE', demandScore: 8.5 },
    
    // Soft Skills
    { name: 'Communication', category: 'Soft Skills', level: 'INTERMEDIATE', demandScore: 9.0 },
    { name: 'Public Speaking', category: 'Soft Skills', level: 'INTERMEDIATE', demandScore: 7.9 },
    { name: 'Time Management', category: 'Soft Skills', level: 'BEGINNER', demandScore: 8.1 },
    { name: 'Problem Solving', category: 'Soft Skills', level: 'INTERMEDIATE', demandScore: 8.7 },
  ];

  const createdSkills = await Promise.all(
    skills.map(skill => 
      prisma.skillTag.upsert({
        where: { name: skill.name },
        update: skill,
        create: skill
      })
    )
  );

  console.log(`✅ Created ${createdSkills.length} skills`);

  // Create sample mentors
  const mentorUsers = [
    {
      name: 'Sarah Chen',
      email: 'sarah.chen@techcorp.com',
      password: await bcrypt.hash('mentor123', 10),
      role: 'MENTOR',
      bio: 'Senior Software Engineer with 8+ years in full-stack development'
    },
    {
      name: 'Michael Rodriguez',
      email: 'michael.r@startup.io',
      password: await bcrypt.hash('mentor123', 10),
      role: 'MENTOR',
      bio: 'Engineering Manager passionate about building scalable systems and teams'
    },
    {
      name: 'Emily Johnson',
      email: 'emily.j@design.co',
      password: await bcrypt.hash('mentor123', 10),
      role: 'MENTOR',
      bio: 'Frontend Architect specializing in React and design systems'
    }
  ];

  const createdMentorUsers = await Promise.all(
    mentorUsers.map(user => 
      prisma.user.upsert({
        where: { email: user.email },
        update: user,
        create: user
      })
    )
  );

  // Create mentor profiles
  const mentorProfiles = [
    {
      userId: createdMentorUsers[0].id,
      professionalTitle: 'Senior Software Engineer',
      yearsOfExperience: 8,
      company: 'TechCorp',
      industry: 'Technology',
      bio: 'I help engineers level up their skills in full-stack development, system design, and career growth. Specialized in React, Node.js, and cloud architecture.',
      hourlyRate: 150,
      mentorshipTypes: ['technical', 'career'],
      maxMentees: 4,
      responseRate: 95.0,
      averageResponseTime: 120,
      verificationStatus: 'VERIFIED',
      featuredMentor: true,
      languagesSpoken: ['English', 'Mandarin'],
      timezone: 'America/New_York'
    },
    {
      userId: createdMentorUsers[1].id,
      professionalTitle: 'Engineering Manager',
      yearsOfExperience: 12,
      company: 'Startup.io',
      industry: 'Technology',
      bio: 'Former senior engineer turned manager. I help engineers transition to leadership roles and build high-performing teams.',
      hourlyRate: 200,
      mentorshipTypes: ['leadership', 'career'],
      maxMentees: 3,
      responseRate: 88.0,
      averageResponseTime: 180,
      verificationStatus: 'VERIFIED',
      featuredMentor: true,
      languagesSpoken: ['English', 'Spanish'],
      timezone: 'America/Los_Angeles'
    },
    {
      userId: createdMentorUsers[2].id,
      professionalTitle: 'Frontend Architect',
      yearsOfExperience: 6,
      company: 'Design Co',
      industry: 'Design/Technology',
      bio: 'Passionate about creating exceptional user experiences and scalable frontend architectures. React expert and design systems advocate.',
      hourlyRate: 120,
      mentorshipTypes: ['technical', 'career'],
      maxMentees: 5,
      responseRate: 92.0,
      averageResponseTime: 90,
      verificationStatus: 'VERIFIED',
      featuredMentor: false,
      languagesSpoken: ['English'],
      timezone: 'Europe/London'
    }
  ];

  const createdMentorProfiles = await Promise.all(
    mentorProfiles.map(profile => 
      prisma.mentorProfile.upsert({
        where: { userId: profile.userId },
        update: profile,
        create: profile
      })
    )
  );

  // Add mentor skills
  const mentorSkillsData = [
    // Sarah Chen's skills
    { mentorId: createdMentorProfiles[0].id, skillName: 'JavaScript', proficiencyLevel: 'EXPERT', yearsOfExperience: 8, verified: true },
    { mentorId: createdMentorProfiles[0].id, skillName: 'React', proficiencyLevel: 'EXPERT', yearsOfExperience: 6, verified: true },
    { mentorId: createdMentorProfiles[0].id, skillName: 'Node.js', proficiencyLevel: 'ADVANCED', yearsOfExperience: 7, verified: true },
    { mentorId: createdMentorProfiles[0].id, skillName: 'System Design', proficiencyLevel: 'ADVANCED', yearsOfExperience: 5, verified: true },
    { mentorId: createdMentorProfiles[0].id, skillName: 'Career Planning', proficiencyLevel: 'INTERMEDIATE', yearsOfExperience: 3, verified: false },
    
    // Michael Rodriguez's skills
    { mentorId: createdMentorProfiles[1].id, skillName: 'Technical Leadership', proficiencyLevel: 'EXPERT', yearsOfExperience: 6, verified: true },
    { mentorId: createdMentorProfiles[1].id, skillName: 'Team Management', proficiencyLevel: 'EXPERT', yearsOfExperience: 6, verified: true },
    { mentorId: createdMentorProfiles[1].id, skillName: 'System Design', proficiencyLevel: 'EXPERT', yearsOfExperience: 10, verified: true },
    { mentorId: createdMentorProfiles[1].id, skillName: 'AWS', proficiencyLevel: 'ADVANCED', yearsOfExperience: 8, verified: true },
    { mentorId: createdMentorProfiles[1].id, skillName: 'Career Planning', proficiencyLevel: 'ADVANCED', yearsOfExperience: 6, verified: true },
    
    // Emily Johnson's skills
    { mentorId: createdMentorProfiles[2].id, skillName: 'React', proficiencyLevel: 'EXPERT', yearsOfExperience: 6, verified: true },
    { mentorId: createdMentorProfiles[2].id, skillName: 'TypeScript', proficiencyLevel: 'ADVANCED', yearsOfExperience: 4, verified: true },
    { mentorId: createdMentorProfiles[2].id, skillName: 'Communication', proficiencyLevel: 'ADVANCED', yearsOfExperience: 6, verified: true },
    { mentorId: createdMentorProfiles[2].id, skillName: 'Problem Solving', proficiencyLevel: 'ADVANCED', yearsOfExperience: 6, verified: true },
  ];

  for (const mentorSkill of mentorSkillsData) {
    const skill = createdSkills.find(s => s.name === mentorSkill.skillName);
    if (skill) {
      await prisma.mentorSkill.upsert({
        where: {
          mentorId_skillId: {
            mentorId: mentorSkill.mentorId,
            skillId: skill.id
          }
        },
        update: {
          proficiencyLevel: mentorSkill.proficiencyLevel,
          yearsOfExperience: mentorSkill.yearsOfExperience,
          verified: mentorSkill.verified
        },
        create: {
          mentorId: mentorSkill.mentorId,
          skillId: skill.id,
          proficiencyLevel: mentorSkill.proficiencyLevel,
          yearsOfExperience: mentorSkill.yearsOfExperience,
          verified: mentorSkill.verified,
          verificationMethod: mentorSkill.verified ? 'portfolio_review' : null
        }
      });
    }
  }

  // Create sample mentees
  const menteeUsers = [
    {
      name: 'Alex Kumar',
      email: 'alex.kumar@junior.dev',
      password: await bcrypt.hash('mentee123', 10),
      role: 'USER',
      bio: 'Junior developer looking to grow my skills and career'
    },
    {
      name: 'Jordan Smith',
      email: 'jordan.smith@career.com',
      password: await bcrypt.hash('mentee123', 10),
      role: 'USER',
      bio: 'Mid-level engineer preparing for senior role transition'
    }
  ];

  const createdMenteeUsers = await Promise.all(
    menteeUsers.map(user => 
      prisma.user.upsert({
        where: { email: user.email },
        update: user,
        create: user
      })
    )
  );

  // Create mentee profiles
  const menteeProfiles = [
    {
      userId: createdMenteeUsers[0].id,
      careerLevel: 'Junior',
      goals: ['Improve technical skills', 'Learn best practices', 'Career guidance'],
      preferredTopics: ['JavaScript', 'React', 'Career Planning'],
      budgetRange: '$50-100',
      learningStyle: 'Hands-on',
      background: 'CS graduate, 1 year experience',
      expectations: 'Looking for regular guidance on technical projects and career advice'
    },
    {
      userId: createdMenteeUsers[1].id,
      careerLevel: 'Mid-level',
      goals: ['Transition to senior role', 'Leadership skills', 'System design'],
      preferredTopics: ['System Design', 'Technical Leadership', 'Team Management'],
      budgetRange: '$100-200',
      learningStyle: 'Discussion-based',
      background: '5 years experience, ready for next step',
      expectations: 'Preparing for senior engineer interviews and leadership opportunities'
    }
  ];

  await Promise.all(
    menteeProfiles.map(profile => 
      prisma.menteeProfile.upsert({
        where: { userId: profile.userId },
        update: profile,
        create: profile
      })
    )
  );

  // Create mentorship packages
  const packages = [
    {
      mentorId: createdMentorProfiles[0].id,
      name: 'Frontend Mastery Package',
      description: 'Comprehensive frontend development mentorship covering React, TypeScript, and modern web practices',
      type: 'PACKAGE',
      duration: '3 months',
      sessionCount: 12,
      price: 1500,
      currency: 'USD',
      features: {
        weeklySessions: true,
        codeReview: true,
        portfolioReview: true,
        interviewPrep: true,
        prioritySupport: true
      },
      requirements: 'Basic JavaScript knowledge required'
    },
    {
      mentorId: createdMentorProfiles[1].id,
      name: 'Leadership Transition',
      description: '1:1 coaching for engineers moving into leadership roles',
      type: 'PACKAGE',
      duration: '2 months',
      sessionCount: 8,
      price: 1600,
      currency: 'USD',
      features: {
        weeklySessions: true,
        caseStudies: true,
        rolePlaying: true,
        networkAccess: true
      },
      requirements: '3+ years engineering experience'
    },
    {
      mentorId: createdMentorProfiles[2].id,
      name: 'Quick Code Review',
      description: 'One-time code review and feedback session',
      type: 'ONE_TIME',
      duration: '1 hour',
      sessionCount: 1,
      price: 120,
      currency: 'USD',
      features: {
        codeReview: true,
        writtenFeedback: true,
        followUpQuestions: true
      },
      requirements: 'Code repository ready for review'
    }
  ];

  await Promise.all(
    packages.map(pkg => 
      prisma.mentorshipPackage.create({
        data: pkg
      })
    )
  );

  // Create sample mentorship availability
  const availability = [
    {
      mentorId: createdMentorProfiles[0].id,
      dayOfWeek: 1, // Monday
      startTime: new Date('2024-01-01T18:00:00Z'),
      endTime: new Date('2024-01-01T20:00:00Z'),
      timezone: 'America/New_York',
      recurring: true,
      status: 'available'
    },
    {
      mentorId: createdMentorProfiles[0].id,
      dayOfWeek: 3, // Wednesday
      startTime: new Date('2024-01-01T17:00:00Z'),
      endTime: new Date('2024-01-01T19:00:00Z'),
      timezone: 'America/New_York',
      recurring: true,
      status: 'available'
    },
    {
      mentorId: createdMentorProfiles[1].id,
      dayOfWeek: 2, // Tuesday
      startTime: new Date('2024-01-01T16:00:00Z'),
      endTime: new Date('2024-01-01T18:00:00Z'),
      timezone: 'America/Los_Angeles',
      recurring: true,
      status: 'available'
    },
    {
      mentorId: createdMentorProfiles[2].id,
      dayOfWeek: 4, // Thursday
      startTime: new Date('2024-01-01T14:00:00Z'),
      endTime: new Date('2024-01-01T17:00:00Z'),
      timezone: 'Europe/London',
      recurring: true,
      status: 'available'
    }
  ];

  await Promise.all(
    availability.map(avail => 
      prisma.mentorAvailability.create({
        data: avail
      })
    )
  );

  // Initialize trust scores for mentors
  await Promise.all(
    createdMentorUsers.map(user =>
      prisma.mentorshipTrustScore.upsert({
        where: { userId: user.id },
        update: {
          overallScore: 85.0,
          reliabilityScore: 90.0,
          expertiseScore: 88.0,
          communicationScore: 87.0,
          professionalismScore: 89.0,
          reviewCount: 12,
          responseRate: 90.0,
          completionRate: 95.0,
          onTimeRate: 98.0
        },
        create: {
          userId: user.id,
          overallScore: 85.0,
          reliabilityScore: 90.0,
          expertiseScore: 88.0,
          communicationScore: 87.0,
          professionalismScore: 89.0,
          reviewCount: 12,
          responseRate: 90.0,
          completionRate: 95.0,
          onTimeRate: 98.0
        }
      })
    )
  );

  console.log('✅ Mentorship system seeded successfully!');
  console.log(`👥 Created ${createdMentorProfiles.length} mentors`);
  console.log(`🎯 Created ${createdSkills.length} skills`);
  console.log(`📦 Created ${packages.length} packages`);
  console.log(`📅 Created ${availability.length} availability slots`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding mentorship system:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
