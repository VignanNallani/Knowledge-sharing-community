const userDto = {
  auth: (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }),

  profile: (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    bio: user.bio,
    skills: user.skills,
    profileImageUrl: user.profileImageUrl,
    role: user.role,
    createdAt: user.createdAt,
  }),

  public: (user) => ({
    id: user.id,
    name: user.name,
    bio: user.bio,
    skills: user.skills,
    profileImageUrl: user.profileImageUrl,
    role: user.role,
    createdAt: user.createdAt,
  }),

  minimal: (user) => ({
    id: user.id,
    name: user.name,
    profileImageUrl: user.profileImageUrl,
  }),

  admin: (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    bio: user.bio,
    skills: user.skills,
    profileImageUrl: user.profileImageUrl,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  }),

  search: (user) => ({
    id: user.id,
    name: user.name,
    bio: user.bio,
    skills: user.skills,
    profileImageUrl: user.profileImageUrl,
    role: user.role,
  }),
};

export default userDto;
