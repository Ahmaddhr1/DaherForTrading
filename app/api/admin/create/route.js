import { connectToDB } from '@/lib/connectDb.js'
import Admin from '@/models/Admin'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { PERMISSION_KEYS } from '@/lib/permissions'

// Owner-only (enforced in middleware.js). Creates a new admin account -
// "owner" or "employee", defaulting to "employee" so a mistyped/omitted
// role never accidentally grants full access.
export async function POST(req) {
  try {
    const { adminname, email, password, role, permissions } = await req.json()

    if (!adminname || !password) {
      return NextResponse.json({ error: 'Admin name and password are required' }, { status: 400 })
    }

    // Required going forward so every new admin gets the email-OTP login
    // step - see app/api/admin/login/route.js.
    const trimmedEmail = (email || '').trim().toLowerCase()
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const resolvedRole = role === 'owner' ? 'owner' : 'employee'
    // Only meaningful for an employee - an owner has every permission
    // implicitly (see lib/permissions.js) regardless of what's stored here.
    const resolvedPermissions = {}
    for (const key of PERMISSION_KEYS) {
      resolvedPermissions[key] = !!permissions?.[key]
    }

    await connectToDB()

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ adminname })
    if (existingAdmin) {
      return NextResponse.json({ error: 'Admin already exists' }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new admin
    const newAdmin = new Admin({
      adminname,
      email: trimmedEmail,
      password: hashedPassword,
      role: resolvedRole,
      active: true,
      permissions: resolvedPermissions,
    })

    await newAdmin.save()

    return NextResponse.json(
      {
        message: 'Admin created successfully',
        admin: {
          id: newAdmin._id,
          adminname: newAdmin.adminname,
          email: newAdmin.email,
          role: newAdmin.role,
          active: newAdmin.active,
          permissions: newAdmin.permissions,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating admin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
