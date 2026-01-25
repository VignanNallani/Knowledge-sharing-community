

// import { PrismaClient } from "@prisma/client";
// import bcrypt from "bcryptjs";

// const prisma = new PrismaClient();

// async function main() {
//   console.log("🌱 Seeding database with production-like data...");

//   const password = await bcrypt.hash("Password@123", 10);

//   // ===============================
//   // USERS
//   // ===============================
//   const usersData = [
//     {
//       name: "Vignan Naidu",
//       email: "admin@ksc.dev",
//       role: "ADMIN",
//       bio: "Founder building scalable knowledge platforms",
//       skills: "System Design, Backend, Prisma, AI",
//     },
//     {
//       name: "Rahul Sharma",
//       email: "mentor1@ksc.dev",
//       role: "MENTOR",
//       bio: "Senior Backend Engineer (8+ yrs)",
//       skills: "Java, Spring Boot, DSA",
//     },
//     {
//       name: "Ankit Verma",
//       email: "mentor2@ksc.dev",
//       role: "MENTOR",
//       bio: "Frontend Architect",
//       skills: "React, System Design, UI",
//     },
//     {
//       name: "Neha Gupta",
//       email: "mentor3@ksc.dev",
//       role: "MENTOR",
//       bio: "AI/ML Mentor",
//       skills: "Python, ML, NLP",
//     },
//     {
//       name: "Ananya",
//       email: "user1@ksc.dev",
//       role: "USER",
//       bio: "CS Student preparing for product companies",
//       skills: "Java, SQL, DSA",
//     },
//     {
//       name: "Rohit",
//       email: "user2@ksc.dev",
//       role: "USER",
//       bio: "Aspiring full-stack developer",
//       skills: "Node.js, React",
//     },
//     {
//       name: "Sneha Reddy",
//       email: "user3@ksc.dev",
//       role: "USER",
//       bio: "Frontend developer learning React",
//       skills: "React, HTML, CSS",
//     },
//     {
//       name: "Karthik",
//       email: "user4@ksc.dev",
//       role: "USER",
//       bio: "Backend enthusiast",
//       skills: "Java, Node.js, SQL",
//     },
//     {
//       name: "Priya Singh",
//       email: "user5@ksc.dev",
//       role: "USER",
//       bio: "Aspiring AI Engineer",
//       skills: "Python, ML, Pandas",
//     },
//     {
//       name: "Amit Kumar",
//       email: "user6@ksc.dev",
//       role: "USER",
//       bio: "Learning system design",
//       skills: "DSA, System Design",
//     },
//     {
//       name: "Tanvi Mehra",
//       email: "user7@ksc.dev",
//       role: "USER",
//       bio: "Full-stack dev enthusiast",
//       skills: "React, Node.js, MongoDB",
//     },
//     {
//       name: "Arjun R",
//       email: "user8@ksc.dev",
//       role: "USER",
//       bio: "Open source contributor",
//       skills: "Python, JavaScript, Git",
//     },
//   ];

//   const users = [];
//   for (const u of usersData) {
//     const user = await prisma.user.upsert({
//       where: { email: u.email },
//       update: {},
//       create: {
//         ...u,
//         password,
//       },
//     });
//     users.push(user);
//   }
//   console.log("✅ Users created");

//   // ===============================
//   // TAGS
//   // ===============================
//   const tagNames = [
//     "Backend",
//     "Frontend",
//     "System Design",
//     "DSA",
//     "Java",
//     "React",
//     "Prisma",
//     "SQL",
//     "Career",
//     "AI",
//     "ML",
//     "Node.js",
//   ];

//   await prisma.tag.createMany({
//     data: tagNames.map((name) => ({ name })),
//     skipDuplicates: true,
//   });
//   const tags = await prisma.tag.findMany();
//   console.log("✅ Tags created");

//   // ===============================
//   // POSTS
//   // ===============================
//   const postsData = [
//     {
//       title: "Scaling Microservices for High Traffic",
//       content: "In this post, I share insights on scaling microservices effectively with examples from production systems.",
//     },
//     {
//       title: "Frontend Performance Optimization Tips",
//       content: "Learn practical ways to improve frontend performance including lazy loading, caching, and bundle splitting.",
//     },
//     {
//       title: "DSA Patterns Every Engineer Should Know",
//       content: "A comprehensive guide to recurring DSA patterns with examples to ace interviews and production code.",
//     },
//     {
//       title: "How I Designed a Distributed System",
//       content: "Step-by-step approach to designing scalable, fault-tolerant distributed systems with trade-offs explained.",
//     },
//     {
//       title: "Introduction to AI & ML Projects",
//       content: "Beginner-friendly AI/ML projects to practice concepts and build portfolio-ready work.",
//     },
//     {
//       title: "React State Management Demystified",
//       content: "Explaining state management options in React and when to use context, Redux, or Zustand.",
//     },
//     {
//       title: "SQL Optimization Tricks",
//       content: "Learn indexing, query optimization, and schema design strategies for high-performance databases.",
//     },
//     {
//       title: "Backend Security Best Practices",
//       content: "Practical security measures every backend engineer should implement, including authentication, authorization, and encryption.",
//     },
//     {
//       title: "Career Growth in Tech",
//       content: "Tips for growing as an engineer, getting promotions, and preparing for higher roles.",
//     },
//     {
//       title: "System Design for Beginners",
//       content: "Start learning system design concepts with approachable examples of real-world applications.",
//     },
//     // Repeat some posts to reach ~25
//   ];

//   const posts = [];
//   for (let i = 0; i < 25; i++) {
//     const postInfo = postsData[i % postsData.length];
//     const randomUser = users[Math.floor(Math.random() * users.length)];
//     const post = await prisma.post.create({
//       data: {
//         title: postInfo.title,
//         content: postInfo.content,
//         authorId: randomUser.id,
//         createdAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)), // 0-7 days ago
//         tags: {
//           create: tags
//             .slice(0, Math.floor(Math.random() * 3) + 1)
//             .map((tag) => ({ tagId: tag.id })),
//         },
//       },
//     });
//     posts.push(post);
//   }
//   console.log("✅ Posts created");

//   // ===============================
//   // COMMENTS
//   // ===============================
//   for (const post of posts) {
//     const commentUser = users[Math.floor(Math.random() * users.length)];
//     const comment = await prisma.comment.create({
//       data: {
//         content: "This is super insightful, thanks for sharing!",
//         postId: post.id,
//         authorId: commentUser.id,
//       },
//     });

//     const replyUser = users[Math.floor(Math.random() * users.length)];
//     await prisma.comment.create({
//       data: {
//         content: "Glad it helped! Keep learning.",
//         postId: post.id,
//         authorId: replyUser.id,
//         parentCommentId: comment.id,
//       },
//     });
//   }
//   console.log("✅ Comments & replies created");

//   // ===============================
//   // LIKES
//   // ===============================
//   for (const post of posts) {
//     const randomUsers = users.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 5));
//     for (const u of randomUsers) {
//       await prisma.like.create({
//         data: {
//           postId: post.id,
//           userId: u.id,
//         },
//       });
//     }
//   }
//   console.log("✅ Post likes created");

//   // ===============================
//   // FOLLOWERS
//   // ===============================
//   for (const u of users) {
//     const followTargets = users.filter((x) => x.id !== u.id).sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3));
//     for (const t of followTargets) {
//       await prisma.follower.create({
//         data: {
//           followerId: u.id,
//           followingId: t.id,
//         },
//       });
//     }
//   }
//   console.log("✅ Followers created");

//   // ===============================
//   // MENTORSHIPS
//   // ===============================
//   const mentors = users.filter((u) => u.role === "MENTOR");
//   const mentees = users.filter((u) => u.role === "USER");

//   for (const mentor of mentors) {
//     const assignedMentees = mentees.sort(() => 0.5 - Math.random()).slice(0, 2);
//     for (const mentee of assignedMentees) {
//       await prisma.mentorship.create({
//         data: {
//           mentorId: mentor.id,
//           menteeId: mentee.id,
//           topic: "Career & Skill Guidance",
//           status: Math.random() > 0.5 ? "ACCEPTED" : "PENDING",
//         },
//       });

//       const slot = await prisma.slot.create({
//         data: {
//           mentorId: mentor.id,
//           startAt: new Date(Date.now() + Math.floor(Math.random() * 7) * 60 * 60 * 1000),
//           endAt: new Date(Date.now() + Math.floor(Math.random() * 8) * 60 * 60 * 1000),
//         },
//       });

//       await prisma.booking.create({
//         data: {
//           slotId: slot.id,
//           menteeId: mentee.id,
//         },
//       });
//     }
//   }

//   console.log("✅ Mentorships, slots & bookings created");
//   console.log("🎉 Database seeded with realistic SaaS data!");
// }

// main()
//   .catch((e) => {
//     console.error("❌ Seed failed:", e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });







/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/* ======================================================
   HELPERS
====================================================== */
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => [...arr].sort(() => 0.5 - Math.random());

/* ======================================================
   REALISTIC DATA
====================================================== */
const FIRST_NAMES = [
  "Aarav", "Rohan", "Karthik", "Arjun", "Rahul", "Siddharth",
  "Ananya", "Sneha", "Kavya", "Ishita", "Neha", "Pooja",
  "Daniel", "Michael", "Andrew", "Lucas", "Noah", "Ethan",
  "Emily", "Sophia", "Olivia", "Maya", "Aisha", "Zara"
];

const LAST_NAMES = [
  "Sharma", "Reddy", "Iyer", "Mehta", "Patel", "Verma",
  "Nair", "Kapoor", "Malhotra", "Chakraborty",
  "Brown", "Johnson", "Miller", "Wilson", "Anderson"
];

const BIOS = {
  ADMIN: [
    "Founder building scalable knowledge platforms.",
    "Product-focused engineer leading developer communities."
  ],
  MENTOR: [
    "Senior software engineer with 8+ years of production experience.",
    "Mentoring engineers in system design and backend architecture.",
    "Industry mentor passionate about real-world engineering."
  ],
  USER: [
    "Early-career engineer learning by building real products.",
    "CS graduate preparing for product-based companies.",
    "Backend enthusiast exploring scalability and databases.",
    "Frontend developer improving UX and performance."
  ]
};

const SKILLS_POOL = [
  "Java", "Spring Boot", "React", "Node.js", "SQL",
  "PostgreSQL", "MongoDB", "Prisma", "Docker",
  "AWS", "System Design", "DSA", "Python", "ML", "AI"
];

const TAGS = [
  "Backend", "Frontend", "System Design", "DSA",
  "Java", "React", "SQL", "Career", "AI", "Node.js"
];

const POST_TITLES = [
  "Scaling a Backend for 1M+ Users",
  "System Design Lessons from Production",
  "Mistakes I Made as a Junior Engineer",
  "Optimizing PostgreSQL for High Traffic",
  "React Performance Tips That Actually Work",
  "How We Designed Our Notification System",
  "Monolith vs Microservices: Real Tradeoffs",
  "Career Growth as a Software Engineer"
];

const POST_CONTENT = `
Sharing real-world lessons learned from building and maintaining production systems.
This post focuses on practical decisions, trade-offs, and mistakes that matter in real engineering.
`;

const COMMENT_POOL = [
  "This is extremely insightful.",
  "We faced similar challenges in production.",
  "Can you explain how this scales further?",
  "Great breakdown of trade-offs.",
  "This helped me understand system design better.",
  "Very practical advice, thanks!"
];

/* ======================================================
   MAIN
====================================================== */
async function main() {
  console.log("🌱 Seeding REAL production-grade data...");

  const password = await bcrypt.hash("Password@123", 10);

  /* ======================================================
     CLEAN DATABASE (SAFE ORDER)
  ====================================================== */
  await prisma.activity.deleteMany();
  await prisma.commentLike.deleteMany();
  await prisma.like.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.postTag.deleteMany();
  await prisma.post.deleteMany();
  await prisma.follower.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.mentorship.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.user.deleteMany();

  /* ======================================================
     TAGS
  ====================================================== */
  await prisma.tag.createMany({
    data: TAGS.map((name) => ({ name })),
    skipDuplicates: true,
  });
  const tags = await prisma.tag.findMany();

  /* ======================================================
     USERS (65)
  ====================================================== */
  const users = [];

  for (let i = 0; i < 65; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);

    const role =
      i === 0 ? "ADMIN" :
      i < 12 ? "MENTOR" : "USER";

    const user = await prisma.user.create({
      data: {
        name: `${first} ${last}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
        password,
        role,
        bio: pick(BIOS[role]),
        skills: shuffle(SKILLS_POOL).slice(0, rand(3, 6)).join(", "),
      },
    });

    users.push(user);
  }

  const mentors = users.filter(u => u.role === "MENTOR");
  const normalUsers = users.filter(u => u.role === "USER");

  console.log(`✅ Users created: ${users.length}`);

  /* ======================================================
     POSTS (150+)
  ====================================================== */
  const posts = [];

  for (let i = 0; i < 150; i++) {
    const author = pick([...mentors, ...normalUsers]);

    const post = await prisma.post.create({
      data: {
        title: pick(POST_TITLES),
        content: POST_CONTENT,
        authorId: author.id,
        createdAt: new Date(Date.now() - rand(1, 14) * 86400000),
        tags: {
          create: shuffle(tags)
            .slice(0, rand(1, 3))
            .map(t => ({ tagId: t.id })),
        },
      },
    });

    posts.push(post);

    await prisma.activity.create({
      data: {
        type: "POST_CREATED",
        message: `${author.name} published a new post`,
        userId: author.id,
        entity: "Post",
        entityId: post.id,
      },
    });
  }

  console.log(`✅ Posts created: ${posts.length}`);

  /* ======================================================
     COMMENTS + REPLIES + COMMENT LIKES
  ====================================================== */
  for (const post of posts) {
    const count = rand(6, 12);

    for (let i = 0; i < count; i++) {
      const author = pick(users);

      const parent = await prisma.comment.create({
        data: {
          content: pick(COMMENT_POOL),
          authorId: author.id,
          postId: post.id,
        },
      });

      if (Math.random() > 0.6) {
        await prisma.comment.create({
          data: {
            content: "Totally agree with this point.",
            authorId: pick(users).id,
            postId: post.id,
            parentCommentId: parent.id,
          },
        });
      }

      if (Math.random() > 0.5) {
        await prisma.commentLike.create({
          data: {
            userId: pick(users).id,
            commentId: parent.id,
          },
        });
      }
    }
  }

  console.log("✅ Comments & replies created");

  /* ======================================================
     LIKES
  ====================================================== */
  for (const post of posts) {
    const liked = shuffle(users).slice(0, rand(10, 25));

    for (const u of liked) {
      await prisma.like.create({
        data: { postId: post.id, userId: u.id },
      });

      await prisma.activity.create({
        data: {
          type: "POST_LIKED",
          message: `${u.name} liked a post`,
          userId: u.id,
          entity: "Post",
          entityId: post.id,
        },
      });
    }
  }

  console.log("✅ Likes created");

  /* ======================================================
     FOLLOWERS
  ====================================================== */
  const followSet = new Set();

  for (const u of users) {
    const targets = shuffle(users.filter(x => x.id !== u.id))
      .slice(0, rand(5, 15));

    for (const t of targets) {
      const key = `${u.id}-${t.id}`;
      if (followSet.has(key)) continue;
      followSet.add(key);

      await prisma.follower.create({
        data: {
          followerId: u.id,
          followingId: t.id,
        },
      });
    }
  }

  console.log("✅ Followers created");

  /* ======================================================
     MENTORSHIPS + SLOTS + BOOKINGS
  ====================================================== */
  for (const mentor of mentors) {
    const mentees = shuffle(normalUsers).slice(0, rand(3, 6));

    for (const mentee of mentees) {
      await prisma.mentorship.create({
        data: {
          mentorId: mentor.id,
          menteeId: mentee.id,
          topic: "Career & System Design Guidance",
          status: Math.random() > 0.3 ? "ACCEPTED" : "PENDING",
        },
      });

      const slot = await prisma.slot.create({
        data: {
          mentorId: mentor.id,
          startAt: new Date(Date.now() + rand(1, 7) * 3600000),
          endAt: new Date(Date.now() + rand(8, 12) * 3600000),
        },
      });

      await prisma.booking.create({
        data: {
          slotId: slot.id,
          menteeId: mentee.id,
        },
      });
    }
  }

  console.log("🎉 DATABASE SEEDED — REAL, HEAVY, PRODUCTION-GRADE");
}

/* ======================================================
   RUN
====================================================== */
main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
