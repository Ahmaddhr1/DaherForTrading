import { connectToDB } from "@/lib/connectDb";
import Customer from "@/models/Customers";
import { NextResponse } from "next/server";

export async function POST(req) {
  await connectToDB();
  try {
    const { fullName, phoneNumber, debt, priceTier } = await req.json();

    if (!fullName || !phoneNumber) {
      return NextResponse.json(
        { error: "Full Name and phone Number are required" },
        { status: 400 }
      );
    }

    // Which of the product's 4 price tiers this customer buys at - defaults
    // to 1 (Retail) when omitted or invalid.
    const parsedPriceTier = [1, 2, 3, 4].includes(parseInt(priceTier, 10))
      ? parseInt(priceTier, 10)
      : 1;

    const existingPhoneNumber = await Customer.findOne({ phoneNumber });
    if (existingPhoneNumber) {
      return NextResponse.json(
        { error: "Phone Number already exists" },
        { status: 400 }
      );
    }
    const newCustomer = await new Customer({
      fullName,
      phoneNumber,
      debt,
      priceTier: parsedPriceTier,
    });
    await newCustomer.save();
    return NextResponse.json(
      { message: "Customer created successfully" },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: "Error occured while creating customer",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
