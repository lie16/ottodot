export interface Persona {
  id: string;
  name: string;
  role: "Admin" | "Teacher" | "Parent";
  description: string;
  email?: string;
  children?: { id: string; name: string; age: number }[];
  subject?: string;
  specialty?: string;
}

export const ADMIN_PERSONAS: Persona[] = [
  {
    id: "admin_01",
    name: "System Admin",
    role: "Admin",
    description: "Full oversight across all 20 classes, rosters, and test controls",
    email: "admin@ottodot.com",
  },
];

export const TEACHER_PERSONAS: Persona[] = [
  { id: "teacher_01", name: "Teacher Sarah", role: "Teacher", specialty: "Science (Astronomy & Space)", description: "Astronomy & Space Specialist", email: "sarah@ottodot.com" },
  { id: "teacher_02", name: "Teacher John", role: "Teacher", specialty: "Mathematics (Fractions & Arithmetic)", description: "Fractions & Arithmetic Lead", email: "john@ottodot.com" },
  { id: "teacher_03", name: "Teacher Alex", role: "Teacher", specialty: "Technology (Robotics & Game Dev)", description: "Robotics & Game Dev Instructor", email: "alex@ottodot.com" },
  { id: "teacher_04", name: "Teacher Elena", role: "Teacher", specialty: "Science (Chemistry & Earth)", description: "Chemistry & Earth Sciences", email: "elena@ottodot.com" },
  { id: "teacher_05", name: "Teacher Marcus", role: "Teacher", specialty: "Mathematics (Geometry & Logic)", description: "Geometry & Logic Specialist", email: "marcus@ottodot.com" },
  { id: "teacher_06", name: "Teacher Chloe", role: "Teacher", specialty: "Technology (Coding & AI Basics)", description: "Coding & AI Basics Educator", email: "chloe@ottodot.com" },
];

export const PARENT_PERSONAS: Persona[] = [
  { id: "parent_01", name: "Alice Baker", role: "Parent", description: "Mother of Liam (7) & Olivia (9)", email: "alice@example.com", children: [{ id: "child_01_a", name: "Liam", age: 7 }, { id: "child_01_b", name: "Olivia", age: 9 }] },
  { id: "parent_02", name: "Bob Clark", role: "Parent", description: "Father of Noah (8) & Emma (6)", email: "bob@example.com", children: [{ id: "child_02_a", name: "Noah", age: 8 }, { id: "child_02_b", name: "Emma", age: 6 }] },
  { id: "parent_03", name: "Carol Davis", role: "Parent", description: "Mother of Oliver (10) & Charlotte (7)", email: "carol@example.com", children: [{ id: "child_03_a", name: "Oliver", age: 10 }, { id: "child_03_b", name: "Charlotte", age: 7 }] },
  { id: "parent_04", name: "David Evans", role: "Parent", description: "Father of Elijah (8) & Amelia (11)", email: "david@example.com", children: [{ id: "child_04_a", name: "Elijah", age: 8 }, { id: "child_04_b", name: "Amelia", age: 11 }] },
  { id: "parent_05", name: "Emma Foster", role: "Parent", description: "Mother of James (6) & Sophia (9)", email: "emma@example.com", children: [{ id: "child_05_a", name: "James", age: 6 }, { id: "child_05_b", name: "Sophia", age: 9 }] },
  { id: "parent_06", name: "Frank Green", role: "Parent", description: "Father of William (10) & Isabella (8)", email: "frank@example.com", children: [{ id: "child_06_a", name: "William", age: 10 }, { id: "child_06_b", name: "Isabella", age: 8 }] },
  { id: "parent_07", name: "Grace Harris", role: "Parent", description: "Mother of Benjamin (7) & Mia (9)", email: "grace@example.com", children: [{ id: "child_07_a", name: "Benjamin", age: 7 }, { id: "child_07_b", name: "Mia", age: 9 }] },
  { id: "parent_08", name: "Henry Jackson", role: "Parent", description: "Father of Lucas (8) & Evelyn (6)", email: "henry@example.com", children: [{ id: "child_08_a", name: "Lucas", age: 8 }, { id: "child_08_b", name: "Evelyn", age: 6 }] },
  { id: "parent_09", name: "Ivy King", role: "Parent", description: "Mother of Henry Jr. (10) & Harper (7)", email: "ivy@example.com", children: [{ id: "child_09_a", name: "Henry Jr.", age: 10 }, { id: "child_09_b", name: "Harper", age: 7 }] },
  { id: "parent_10", name: "Jack Lewis", role: "Parent", description: "Father of Alexander (8) & Camila (11)", email: "jack@example.com", children: [{ id: "child_10_a", name: "Alexander", age: 8 }, { id: "child_10_b", name: "Camila", age: 11 }] },
  { id: "parent_11", name: "Karen Morris", role: "Parent", description: "Mother of Mason (6) & Gianna (9)", email: "karen@example.com", children: [{ id: "child_11_a", name: "Mason", age: 6 }, { id: "child_11_b", name: "Gianna", age: 9 }] },
  { id: "parent_12", name: "Leo Nelson", role: "Parent", description: "Father of Ethan (10) & Abigail (8)", email: "leo@example.com", children: [{ id: "child_12_a", name: "Ethan", age: 10 }, { id: "child_12_b", name: "Abigail", age: 8 }] },
];

export const ALL_PERSONAS: Record<"Admin" | "Teacher" | "Parent", Persona[]> = {
  Admin: ADMIN_PERSONAS,
  Teacher: TEACHER_PERSONAS,
  Parent: PARENT_PERSONAS,
};
