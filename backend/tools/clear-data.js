require('dotenv').config(); 
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function clearData() {
  console.log("🧹 Đang tiến hành xóa toàn bộ dữ liệu bài viết...");
  
  try {
    // Xóa toàn bộ dữ liệu trong bảng posts (Các bảng liên quan như images sẽ tự động bị xóa theo nhờ onDelete: Cascade)
    const deletedPosts = await prisma.posts.deleteMany({});
    
    console.log(`✅ Đã xóa thành công ${deletedPosts.count} bài viết cũ khỏi Database!`);
  } catch (error) {
    console.error("❌ Lỗi khi xóa dữ liệu:", error);
  } finally {
    await prisma.$disconnect();
  }
}

clearData();