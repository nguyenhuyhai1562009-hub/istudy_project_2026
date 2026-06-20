import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis"; // Import từ file bạn vừa sửa ở trên

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Đợi để lấy id từ params
  const { id } = await context.params;

  // Kiểm tra dữ liệu đầu vào (Frontend thường gửi nhầm 'undefined' là string)
  if (!id || id === 'undefined' || id === 'null') {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    // Lấy toàn bộ danh sách
    const history = await redis.lrange<any>("history", 0, -1);
    
    // Lọc bỏ phần tử có id trùng khớp
    const updated = history.filter((item) => String(item.id) !== id);
    
    // Cập nhật lại vào Redis (Xóa cũ, ghi mới)
    await redis.del("history");
    if (updated.length > 0) {
      // Dùng spread operator để đẩy danh sách đã lọc vào
      await redis.rpush("history", ...updated);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}