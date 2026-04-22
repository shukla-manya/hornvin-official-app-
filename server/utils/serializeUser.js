function serializeUser(doc) {
  const u = doc.toObject ? doc.toObject() : { ...doc };
  delete u.password;
  const id = u._id != null ? String(u._id) : undefined;
  delete u._id;
  delete u.__v;
  return {
    id,
    name: u.name,
    phone: u.phone,
    role: u.role,
    status: u.status,
    createdBy: u.createdBy != null ? String(u.createdBy) : null,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

module.exports = { serializeUser };
