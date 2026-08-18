import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import csv from 'csv-parser';

// 1. Load file .env để lấy đường dẫn DATABASE_URL
dotenv.config();

// 2. Khởi tạo cầu nối (Adapter) với Supabase
const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// 3. Khởi tạo PrismaClient đi kèm Adapter
const prisma = new PrismaClient({ adapter });

async function main() {
  const records: any[] = [];
  
  const cityMap = new Map<string, string>();
  const districtMap = new Map<string, string>();
  const userMap = new Map<string, string>();
  const categoryMap = new Map<string, number>();
  
  let cityCounter = 1;
  let districtCounter = 1;

  console.log('Đang đọc file CSV...');

  fs.createReadStream(__dirname + '/nhatot_data.csv')
    .pipe(csv())
    .on('data', (data) => records.push(data))
    .on('end', async () => {
      console.log(`Đã đọc xong ${records.length} dòng. Bắt đầu bơm vào Database...`);

      for (const row of records) {
        try {
          // Xử lý Tỉnh/Thành phố
          const cityName = row.region_name;
          let cityCode = cityMap.get(cityName);
          if (!cityCode && cityName) {
            cityCode = `C${String(cityCounter).padStart(3, '0')}`;
            cityMap.set(cityName, cityCode);
            cityCounter++;
            await prisma.cities.upsert({
              where: { code: cityCode },
              update: {},
              create: { code: cityCode, name: cityName, type: 'Tỉnh/Thành phố' }
            });
          }

          // Xử lý Quận/Huyện
          const districtName = row.area_name;
          const districtKey = `${cityName}_${districtName}`;
          let districtCode = districtMap.get(districtKey);
          if (!districtCode && districtName && cityCode) {
            districtCode = `D${String(districtCounter).padStart(3, '0')}`;
            districtMap.set(districtKey, districtCode);
            districtCounter++;
            await prisma.districts.upsert({
              where: { code: districtCode },
              update: {},
              create: { code: districtCode, name: districtName, type: 'Quận/Huyện', parent_code: cityCode }
            });
          }

          // Xử lý Danh mục (Category)
          let categoryId = categoryMap.get(row.category_name);
          if (!categoryId && row.category_name) {
            const catSlug = row.category_name.toLowerCase().replace(/\s+/g, '-');
            const newCat = await prisma.category.upsert({
              where: { slug: catSlug },
              update: {},
              create: { name: row.category_name, slug: catSlug }
            });
            categoryId = newCat.id;
            categoryMap.set(row.category_name, newCat.id);
          }

          // Xử lý Người dùng (User/Agent)
          const accountName = row.account_name || 'Người dùng ẩn danh';
          let userId = userMap.get(accountName);
          if (!userId) {
            const emailSlug = `user_${Date.now()}_${Math.random().toString(36).substring(7)}@demo.com`;
            const newUser = await prisma.user.create({
              data: {
                email: emailSlug,
                password: 'hashed_password_123',
                fullName: accountName,
                role: row.is_seller_verified === 'True' ? 'AGENT' : 'USER',
              }
            });
            userId = newUser.id;
            userMap.set(accountName, newUser.id);
          }

          // Bơm bài đăng (Posts) vào DB
          await prisma.posts.create({
            data: {
              title: row.subject,
              thumbnail: row.image || 'https://via.placeholder.com/600x400?text=No+Image',
              price: row.price ? Number(row.price) : 0,
              area: row.size ? Number(row.size) : 0,
              city: cityCode,
              district: districtCode,
              ward: row.ward_name,
              addressDetail: row.street_name,
              
              bedrooms: row.rooms && row.rooms !== 'NaN' ? parseInt(row.rooms) : null,
              bathrooms: row.toilets && row.toilets !== 'NaN' ? parseInt(row.toilets) : null,
              length: row.length && row.length !== 'NaN' ? parseFloat(row.length) : null,
              width: row.width && row.width !== 'NaN' ? parseFloat(row.width) : null,
              
              transactionType: 'SALE',
              status: 'ACTIVE',
              
              categoryId: categoryId,
              userId: userId,
              
              content: `Mô tả tự động: Bất động sản tại ${row.ward_name}, ${districtName}. Giá bán: ${row.price_string}.`
            }
          });

          console.log(`✅ Đã thêm: ${row.subject.substring(0, 50)}...`);

        } catch (error) {
          console.error(`❌ Lỗi khi thêm bài viết: ${row.subject}`, error);
        }
      }

      console.log('🎉 Xong! Đã đưa toàn bộ dữ liệu vào Database Supabase thành công!');
    });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });