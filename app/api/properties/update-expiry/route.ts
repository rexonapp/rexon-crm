import { NextResponse } from "next/server";
import { query } from "@/lib/db"; // your query helper

export async function POST(req: Request) {
  try {
    const { id, type } = await req.json();

    if (!id || !type) {
      return NextResponse.json(
        { success: false, message: "Missing parameters" },
        { status: 400 }
      );
    }

    let expiryDate: Date | null = null;
    const today = new Date();

    if (type === "1_month") {
      today.setMonth(today.getMonth() + 1);
      expiryDate = today;
    }

    if (type === "3_months") {
      today.setMonth(today.getMonth() + 3);
      expiryDate = today;
    }

    if (type === "6_months") {
      today.setMonth(today.getMonth() + 6);
      expiryDate = today;
    }

    if (type === "never") {
      expiryDate = null;
    }

    await query(
      `UPDATE warehouses 
       SET expiry_date = $1 
       WHERE id = $2`,
      [expiryDate, id]
    );

    return NextResponse.json({
      success: true,
      message: "Expiry updated successfully",
      expiry_date: expiryDate,
    });

  } catch (error) {
    console.error("Expiry update error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update expiry" },
      { status: 500 }
    );
  }
}