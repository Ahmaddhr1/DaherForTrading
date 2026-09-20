import { connectToDB } from '@/lib/connectDb.js'
import Admin from '@/models/Admin'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

// Owner-only (enforced in middleware.js). Creates a new admin account -
// "owner" or "employee", defaulting to "employee" so a mistyped/omitted
// role never accidentally grants full access.
export async function POST(req) {
  try {
    const { adminname, password, role } = await req.json()

    if (!adminname || !password) {
      return NextResponse.json({ error: 'Admin name and password are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const resolvedRole = role === 'owner' ? 'owner' : 'employee'

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
      password: hashedPassword,
      role: resolvedRole,
      active: true,
    })

    await newAdmin.save()

    return NextResponse.json(
      {
        message: 'Admin created successfully',
        admin: {
          id: newAdmin._id,
          adminname: newAdmin.adminname,
          role: newAdmin.role,
          active: newAdmin.active,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating admin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
