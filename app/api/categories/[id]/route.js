import { connectToDB } from '@/core/platform/connectDb';
import Category from '@/core/products/models/Category';
import Product from '@/core/products/models/Products';
import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/core/platform/auth';
import { requirePermission } from '@/core/platform/permissions';
import { logActivity } from "@/core/audit/activityLog";
import { auditView, diffViews, snapshotChanges, extraChange, describeChanges } from "@/core/audit/audit";

export async function GET(_, { params }) {
  await connectToDB();
  const category = await Category.findById(params.id).populate({
    path:"products",
    select:"name price quantity"
  });
  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }
  return NextResponse.json(category);
}

export async function PUT(req, { params }) {
  await connectToDB();
  const forbidden = await requirePermission(await getUserFromCookie(), 'canEditCategories');
  if (forbidden) return forbidden;

  const { name } = await req.json();

  if (!name) {
    return NextResponse.json({ error: 'Name and image are required' }, { status: 400 });
  }

  const before = await Category.findById(params.id);
  if (!before) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  const updated = await Category.findByIdAndUpdate(
    params.id,
    { name },
    { new: true }
  );

  const changes = diffViews('Category', before.toObject(), updated.toObject());
  if (changes.length > 0) {
    await logActivity({
      admin: await getUserFromCookie(),
      action: 'category.edit',
      entityType: 'Category',
      entityId: updated._id,
      entityLabel: updated.name,
      summary: `Renamed category "${before.name}" to "${updated.name}"`,
      changes,
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_, { params }) {
  await connectToDB();
  const forbidden = await requirePermission(await getUserFromCookie(), 'canDelete');
  if (forbidden) return forbidden;

  const category = await Category.findById(params.id);
  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  const removedProducts = await Product.find({ category: params.id }).select('name').lean();
  await Product.deleteMany({ category: params.id });
  await Category.findByIdAndDelete(params.id);

  await logActivity({
    admin: await getUserFromCookie(),
    action: 'category.delete',
    entityType: 'Category',
    entityId: params.id,
    entityLabel: category.name,
    summary: `Deleted category "${category.name}" and its ${removedProducts.length} product${removedProducts.length === 1 ? '' : 's'}`,
    changes: [
      ...snapshotChanges('Category', category.toObject(), 'delete'),
      ...removedProducts.map((p) => extraChange(`product.${p._id}`, `Product removed: ${p.name}`, p.name, null)),
    ],
  });

  return NextResponse.json({ message: 'Deleted' });
}