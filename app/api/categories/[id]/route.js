import { connectToDB } from '@/lib/connectDb';
import Category from '@/models/Category';
import Product from '@/models/Products';
import { NextResponse } from 'next/server';

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
  const { name } = await req.json();

  if (!name) {
    return NextResponse.json({ error: 'Name and image are required' }, { status: 400 });
  }

  const updated = await Category.findByIdAndUpdate(
    params.id,
    { name },
    { new: true }
  );

  if (!updated) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_, { params }) {
  await connectToDB();
  const category = await Category.findById(params.id);
  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  await Product.deleteMany({ category: params.id });
  await Category.findByIdAndDelete(params.id);

  return NextResponse.json({ message: 'Deleted' });
}