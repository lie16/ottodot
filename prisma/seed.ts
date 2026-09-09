import { PrismaClient, BookingStatus, PaymentStatus } from "@prisma/client";

const prisma = new PrismaClient();

export async function runSeed() {
  console.log("🌱 Starting Ottodot large synthetic database seed...");

  // 1. Enforce PostgreSQL Database Constraints
  try {
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_confirmed_booking 
      ON bookings (student_id, class_id) 
      WHERE status = 'CONFIRMED'
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE trial_classes DROP CONSTRAINT IF EXISTS check_max_capacity
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE trial_classes ADD CONSTRAINT check_max_capacity CHECK (confirmed_count <= 4)
    `);
    console.log("🛡️ Database invariants enforced at engine level.");
  } catch (err) {
    console.warn("⚠️ Warning applying DB constraints:", err);
  }

  // 2. Clean existing records in correct foreign key order
  await prisma.auditLog.deleteMany();
  await prisma.paymentAttempt.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.trialClass.deleteMany();
  await prisma.student.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.teacher.deleteMany();

  // 2. Seed 6 Teachers
  const teachersData = [
    { id: "teacher_01", name: "Teacher Sarah", email: "sarah@ottodot.com", specialty: "Science (Astronomy & Space)" },
    { id: "teacher_02", name: "Teacher John", email: "john@ottodot.com", specialty: "Mathematics (Fractions & Arithmetic)" },
    { id: "teacher_03", name: "Teacher Alex", email: "alex@ottodot.com", specialty: "Technology (Robotics & Game Dev)" },
    { id: "teacher_04", name: "Teacher Elena", email: "elena@ottodot.com", specialty: "Science (Chemistry & Earth)" },
    { id: "teacher_05", name: "Teacher Marcus", email: "marcus@ottodot.com", specialty: "Mathematics (Geometry & Logic)" },
    { id: "teacher_06", name: "Teacher Chloe", email: "chloe@ottodot.com", specialty: "Technology (Coding & AI Basics)" },
  ];

  for (const t of teachersData) {
    await prisma.teacher.create({ data: t });
  }
  console.log(`✅ Seeded ${teachersData.length} teachers.`);

  // 3. Seed 12 Parents & 24 Children (2 children per family)
  const familiesData = [
    { id: "parent_01", name: "Alice Baker", email: "alice@example.com", children: [{ id: "child_01_a", name: "Liam", age: 7 }, { id: "child_01_b", name: "Olivia", age: 9 }] },
    { id: "parent_02", name: "Bob Clark", email: "bob@example.com", children: [{ id: "child_02_a", name: "Noah", age: 8 }, { id: "child_02_b", name: "Emma", age: 6 }] },
    { id: "parent_03", name: "Carol Davis", email: "carol@example.com", children: [{ id: "child_03_a", name: "Oliver", age: 10 }, { id: "child_03_b", name: "Charlotte", age: 7 }] },
    { id: "parent_04", name: "David Evans", email: "david@example.com", children: [{ id: "child_04_a", name: "Elijah", age: 8 }, { id: "child_04_b", name: "Amelia", age: 11 }] },
    { id: "parent_05", name: "Emma Foster", email: "emma@example.com", children: [{ id: "child_05_a", name: "James", age: 6 }, { id: "child_05_b", name: "Sophia", age: 9 }] },
    { id: "parent_06", name: "Frank Green", email: "frank@example.com", children: [{ id: "child_06_a", name: "William", age: 10 }, { id: "child_06_b", name: "Isabella", age: 8 }] },
    { id: "parent_07", name: "Grace Harris", email: "grace@example.com", children: [{ id: "child_07_a", name: "Benjamin", age: 7 }, { id: "child_07_b", name: "Mia", age: 9 }] },
    { id: "parent_08", name: "Henry Jackson", email: "henry@example.com", children: [{ id: "child_08_a", name: "Lucas", age: 8 }, { id: "child_08_b", name: "Evelyn", age: 6 }] },
    { id: "parent_09", name: "Ivy King", email: "ivy@example.com", children: [{ id: "child_09_a", name: "Henry Jr.", age: 10 }, { id: "child_09_b", name: "Harper", age: 7 }] },
    { id: "parent_10", name: "Jack Lewis", email: "jack@example.com", children: [{ id: "child_10_a", name: "Alexander", age: 8 }, { id: "child_10_b", name: "Camila", age: 11 }] },
    { id: "parent_11", name: "Karen Morris", email: "karen@example.com", children: [{ id: "child_11_a", name: "Mason", age: 6 }, { id: "child_11_b", name: "Gianna", age: 9 }] },
    { id: "parent_12", name: "Leo Nelson", email: "leo@example.com", children: [{ id: "child_12_a", name: "Ethan", age: 10 }, { id: "child_12_b", name: "Abigail", age: 8 }] },
  ];

  for (const f of familiesData) {
    await prisma.parent.create({
      data: {
        id: f.id,
        name: f.name,
        email: f.email,
        children: {
          create: f.children.map((c) => ({
            id: c.id,
            name: c.name,
            age: c.age,
          })),
        },
      },
    });
  }
  console.log(`✅ Seeded ${familiesData.length} parents and 24 children.`);

  // 4. Seed 20 Trial Classes
  const now = new Date();
  const addHours = (h: number) => new Date(now.getTime() + h * 3600 * 1000);

  const classesData = [
    // 4 Empty Classes (0/4)
    { id: "class_empty_01", title: "Cosmic Voyagers: Planets & Stars", subject: "Science", teacherId: "teacher_01", startTime: addHours(24), confirmedCount: 0 },
    { id: "class_empty_02", title: "Math Magic: Fast Mental Arithmetic", subject: "Math", teacherId: "teacher_02", startTime: addHours(26), confirmedCount: 0 },
    { id: "class_empty_03", title: "RoboPlay: First Lego Algorithms", subject: "Technology", teacherId: "teacher_03", startTime: addHours(30), confirmedCount: 0 },
    { id: "class_empty_04", title: "Crystal Garden: Chemistry for Beginners", subject: "Science", teacherId: "teacher_04", startTime: addHours(32), confirmedCount: 0 },

    // 4 Light Classes (1/4)
    { id: "class_light_01", title: "Volcanoes, Earthquakes & Lava Labs", subject: "Science", teacherId: "teacher_04", startTime: addHours(36), confirmedCount: 1 },
    { id: "class_light_02", title: "Tangled Shapes: Fun with Geometry", subject: "Math", teacherId: "teacher_05", startTime: addHours(40), confirmedCount: 1 },
    { id: "class_light_03", title: "Scratch Animation Studio", subject: "Technology", teacherId: "teacher_06", startTime: addHours(44), confirmedCount: 1 },
    { id: "class_light_04", title: "Deep Ocean Creatures & Bioluminescence", subject: "Science", teacherId: "teacher_01", startTime: addHours(48), confirmedCount: 1 },

    // 4 Half Classes (2/4)
    { id: "class_half_01", title: "Kitchen Chemistry: Slime & Bubbles", subject: "Science", teacherId: "teacher_04", startTime: addHours(50), confirmedCount: 2 },
    { id: "class_half_02", title: "Fraction Pizza Party: Slice & Learn", subject: "Math", teacherId: "teacher_02", startTime: addHours(54), confirmedCount: 2 },
    { id: "class_half_03", title: "Video Game Mechanics 101", subject: "Technology", teacherId: "teacher_03", startTime: addHours(58), confirmedCount: 2 },
    { id: "class_half_04", title: "Mysteries of the Dinosaur Era", subject: "Science", teacherId: "teacher_01", startTime: addHours(62), confirmedCount: 2 },

    // 4 Critical Race-Ready Classes (3/4 - EXACTLY 1 SEAT LEFT)
    { id: "class_race_01", title: "Solar Flare Chase (Race Target A)", subject: "Science", teacherId: "teacher_01", startTime: addHours(70), confirmedCount: 3 },
    { id: "class_race_02", title: "Speed Calculation Arena (Race Target B)", subject: "Math", teacherId: "teacher_02", startTime: addHours(72), confirmedCount: 3 },
    { id: "class_race_03", title: "AI Storyteller Bootcamp (Race Target C)", subject: "Technology", teacherId: "teacher_06", startTime: addHours(74), confirmedCount: 3 },
    { id: "class_race_04", title: "Logic Riddles & Cryptography (Race Target D)", subject: "Math", teacherId: "teacher_05", startTime: addHours(78), confirmedCount: 3 },

    // 4 Full Classes (4/4 - ZERO SEATS LEFT)
    { id: "class_full_01", title: "Mission to Mars: Rover Design", subject: "Science", teacherId: "teacher_01", startTime: addHours(82), confirmedCount: 4 },
    { id: "class_full_02", title: "Algebra Adventurers: Quest for X", subject: "Math", teacherId: "teacher_02", startTime: addHours(86), confirmedCount: 4 },
    { id: "class_full_03", title: "Build an Arcade Game in TypeScript", subject: "Technology", teacherId: "teacher_03", startTime: addHours(90), confirmedCount: 4 },
    { id: "class_full_04", title: "Extreme Weather & Storm Chasers", subject: "Science", teacherId: "teacher_04", startTime: addHours(94), confirmedCount: 4 },
  ];

  for (const c of classesData) {
    await prisma.trialClass.create({
      data: {
        id: c.id,
        title: c.title,
        subject: c.subject,
        teacherId: c.teacherId,
        startTime: c.startTime,
        maxCapacity: 4,
        confirmedCount: c.confirmedCount,
      },
    });
  }
  console.log(`✅ Seeded ${classesData.length} trial classes.`);

  // 5. Seed Confirmed Bookings matching the class counts
  const bookingsToSeed = [
    // 1 confirmed each for light classes
    { classId: "class_light_01", studentId: "child_01_a" },
    { classId: "class_light_02", studentId: "child_02_a" },
    { classId: "class_light_03", studentId: "child_03_a" },
    { classId: "class_light_04", studentId: "child_04_a" },

    // 2 confirmed each for half classes
    { classId: "class_half_01", studentId: "child_01_b" },
    { classId: "class_half_01", studentId: "child_02_b" },
    { classId: "class_half_02", studentId: "child_03_b" },
    { classId: "class_half_02", studentId: "child_04_b" },
    { classId: "class_half_03", studentId: "child_05_a" },
    { classId: "class_half_03", studentId: "child_06_a" },
    { classId: "class_half_04", studentId: "child_07_a" },
    { classId: "class_half_04", studentId: "child_08_a" },

    // 3 confirmed each for race-ready classes (1 seat left!)
    { classId: "class_race_01", studentId: "child_05_b" },
    { classId: "class_race_01", studentId: "child_06_b" },
    { classId: "class_race_01", studentId: "child_07_b" },

    { classId: "class_race_02", studentId: "child_08_b" },
    { classId: "class_race_02", studentId: "child_09_a" },
    { classId: "class_race_02", studentId: "child_10_a" },

    { classId: "class_race_03", studentId: "child_09_b" },
    { classId: "class_race_03", studentId: "child_10_b" },
    { classId: "class_race_03", studentId: "child_11_a" },

    { classId: "class_race_04", studentId: "child_11_b" },
    { classId: "class_race_04", studentId: "child_12_a" },
    { classId: "class_race_04", studentId: "child_01_a" },

    // 4 confirmed each for full classes
    { classId: "class_full_01", studentId: "child_01_b" },
    { classId: "class_full_01", studentId: "child_02_a" },
    { classId: "class_full_01", studentId: "child_03_a" },
    { classId: "class_full_01", studentId: "child_04_a" },

    { classId: "class_full_02", studentId: "child_05_a" },
    { classId: "class_full_02", studentId: "child_06_a" },
    { classId: "class_full_02", studentId: "child_07_a" },
    { classId: "class_full_02", studentId: "child_08_a" },

    { classId: "class_full_03", studentId: "child_09_a" },
    { classId: "class_full_03", studentId: "child_10_a" },
    { classId: "class_full_03", studentId: "child_11_a" },
    { classId: "class_full_03", studentId: "child_12_a" },

    { classId: "class_full_04", studentId: "child_02_b" },
    { classId: "class_full_04", studentId: "child_04_b" },
    { classId: "class_full_04", studentId: "child_06_b" },
    { classId: "class_full_04", studentId: "child_08_b" },
  ];

  let bookingIdx = 1;
  for (const b of bookingsToSeed) {
    const bookingId = `seed_booking_${String(bookingIdx).padStart(3, "0")}`;
    const booking = await prisma.booking.create({
      data: {
        id: bookingId,
        classId: b.classId,
        studentId: b.studentId,
        status: BookingStatus.CONFIRMED,
      },
    });

    await prisma.paymentAttempt.create({
      data: {
        bookingId: booking.id,
        amount: 35.0,
        currency: "SGD",
        status: PaymentStatus.SUCCESS,
        paymentMethod: "pm_card_success",
        transactionRef: `txn_seed_${String(bookingIdx).padStart(3, "0")}`,
      },
    });

    bookingIdx++;
  }

  // 6. Seed a sample PAYMENT_FAILED booking so parent transaction history shows failure behavior
  const failedBooking = await prisma.booking.create({
    data: {
      id: "seed_booking_fail_01",
      classId: "class_empty_01",
      studentId: "child_02_a",
      status: BookingStatus.PAYMENT_FAILED,
    },
  });

  await prisma.paymentAttempt.create({
    data: {
      bookingId: failedBooking.id,
      amount: 35.0,
      currency: "SGD",
      status: PaymentStatus.FAILED,
      paymentMethod: "pm_card_decline",
      transactionRef: "txn_seed_fail_01",
      failureReason: "Card declined: insufficient funds",
    },
  });

  // 7. Seed initial Audit Log entry
  await prisma.auditLog.create({
    data: {
      tag: "[TEST:SYSTEM_INIT]",
      level: "INFO",
      event: "DATABASE_SEEDED",
      details: JSON.stringify({
        teachers: teachersData.length,
        parents: familiesData.length,
        children: 24,
        classes: classesData.length,
        confirmedBookings: bookingsToSeed.length,
      }),
    },
  });

  console.log(`✅ Seeded ${bookingsToSeed.length} confirmed bookings with successful payments.`);
  console.log("🚀 Large synthetic seed completed successfully!");
}

if (require.main === module || (process.argv[1] && process.argv[1].endsWith("seed.ts"))) {
  runSeed()
    .catch((e) => {
      console.error("❌ Seeding failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
