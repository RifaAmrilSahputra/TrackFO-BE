const authorizeRole = (rolesAllowed = []) => {
  return (req, res, next) => {
    const userRoles = (req.user && req.user.roles) || []

    // Normalize roles to uppercase for comparison to be case-insensitive
    const normalizedUserRoles = userRoles.map(r => String(r).toUpperCase())
    const normalizedAllowed = rolesAllowed.map(r => String(r).toUpperCase())

    const allowed = normalizedUserRoles.some(role => normalizedAllowed.includes(role))

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak',
      })
    }

    next()
  }
}

export default authorizeRole
