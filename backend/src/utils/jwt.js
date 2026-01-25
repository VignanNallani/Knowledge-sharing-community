// import jwt from "jsonwebtoken";

// export const generateAccessToken = ({ userId, role }) => {
//   return jwt.sign(
//     { userId, role },
//     process.env.JWT_SECRET,
//     { expiresIn: "15m" }
//   );
// };

import jwt from "jsonwebtoken";

export const generateAccessToken = ({ userId }) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
};
