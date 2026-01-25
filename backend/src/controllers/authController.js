

  // import bcrypt from "bcryptjs";
  // import jwt from "jsonwebtoken";
  // import prisma from "../config/prisma.js";

  // /**
  //  * REGISTER USER
  //  */
  // export const register = async (req, res) => {
  //   const { name, email, password, role } = req.body;

  //   if (!name || !email || !password) {
  //     return res.status(400).json({ message: "All fields are required" });
  //   }

  //   try {
  //     const existingUser = await prisma.user.findUnique({
  //       where: { email },
  //     });

  //     if (existingUser) {
  //       return res.status(409).json({ message: "User already exists" });
  //     }

  //     const hashedPassword = await bcrypt.hash(password, 10);

  //     const user = await prisma.user.create({
  //       data: {
  //         name,
  //         email,
  //         password: hashedPassword,
  //         role: role || "USER", // USER | MENTOR | ADMIN
  //       },
  //     });

  //     res.status(201).json({
  //       message: "User registered successfully",
  //       user: {
  //         id: user.id,
  //         name: user.name,
  //         email: user.email,
  //         role: user.role,
  //       },
  //     });
  //   } catch (err) {
  //     console.error("REGISTER ERROR:", err);
  //     res.status(500).json({ message: "Registration failed" });
  //   }
  // };

  // /**
  //  * LOGIN USER
  //  */
  // export const login = async (req, res) => {
  //   const { email, password } = req.body;

  //   if (!email || !password) {
  //     return res.status(400).json({ message: "Email and password required" });
  //   }

  //   try {
  //     const user = await prisma.user.findUnique({
  //       where: { email },
  //     });

  //     // ❌ REMOVE isActive CHECK
  //     if (!user) {
  //       return res.status(401).json({ message: "Invalid credentials" });
  //     }

  //     const isMatch = await bcrypt.compare(password, user.password);
  //     if (!isMatch) {
  //       return res.status(401).json({ message: "Invalid credentials" });
  //     }

  //     const token = jwt.sign(
  //       {
  //         id: user.id,
  //         email: user.email,
  //         role: user.role,
  //       },
  //       process.env.JWT_SECRET,
  //       { expiresIn: "7d" }
  //     );

  //     res.json({
  //       message: "Login successful",
  //       token,
  //       user: {
  //         id: user.id,
  //         name: user.name,
  //         email: user.email,
  //         role: user.role,
  //       },
  //     });
  //   } catch (err) {
  //     console.error("LOGIN ERROR:", err);
  //     res.status(500).json({ message: "Login failed" });
  //   }
  // };



  import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
// import prisma from "../config/prisma.js";
// import { prisma } from "../index.js";
import prisma from "../config/prisma.js";


/**
 * REGISTER USER
 */
export const register = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "USER",
      },
    });

    // ✅ TOKEN WAS MISSING — THIS FIXES AUTH COMPLETELY
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ message: "Registration failed" });
  }
};

/**
 * LOGIN USER
 */
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Login failed" });
  }
};
