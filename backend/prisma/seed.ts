import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

// 1. Load file .env
dotenv.config();

// 2. Khởi tạo Prisma với Supabase
const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const records: any[] = [];
  const cityMap = new Map();
  const districtMap = new Map();
  const userMap = new Map();
  const categoryMap = new Map();
  
  let cityCounter = 1;
  let districtCounter = 1;

  // Lấy đường dẫn file CSV
  const csvFilePath = fs.existsSync(path.join(__dirname, 'nhatot_data.csv')) 
    ? path.join(__dirname, 'nhatot_data.csv') 
    : path.join(process.cwd(), 'nhatot_data.csv');

  console.log(`Đang đọc file CSV tại: ${csvFilePath}`);

  if (!fs.existsSync(csvFilePath)) {
    throw new Error(`❌ KHÔNG TÌM THẤY FILE CSV! Hãy chắc chắn file nhatot_data.csv đang nằm đúng thư mục.`);
  }

  await new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      // Dùng mapHeaders để xóa các ký tự ẩn (BOM) do Excel/Notepad tự sinh ra
      .pipe(csv({
        mapHeaders: ({ header }) => header.trim().replace(/^[\u200B\uFEFF]/, '')
      }))
      .on('data', (data) => records.push(data))
      .on('error', (err) => reject(err))
      .on('end', async () => {
        console.log(`✅ Đã đọc xong ${records.length} dòng. Bắt đầu bơm vào Database...`);

        if (records.length === 0) {
          console.log("⚠️ File CSV không có dữ liệu!");
          resolve(true);
          return;
        }

        for (const row of records) {
          try {
            // Lấy ID bằng nhiều cách để đề phòng lỗi ẩn tên cột
            const rawSourceId = row.ad_id || row['ad_id'] || Object.values(row)[0];
            const sourceIdStr = rawSourceId?.toString().trim();
            
            if (!sourceIdStr) {
              console.log(`⚠️ Bỏ qua dòng vì không tìm thấy ad_id: ${row.subject}`);
              continue; 
            }

            // --- 1. Tỉnh/Thành phố ---
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

            // --- 2. Quận/Huyện ---
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

            // --- 3. Danh mục ---
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

            // --- 4. Người dùng ---
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

            const parsedPrice = row.price ? Number(row.price) : 0;
            const parsedArea = row.size ? Number(row.size) : 0;
            const parsedBedrooms = row.rooms && row.rooms !== 'NaN' ? parseInt(row.rooms) : null;
            const parsedBathrooms = row.toilets && row.toilets !== 'NaN' ? parseInt(row.toilets) : null;
            const parsedLength = row.length && row.length !== 'NaN' ? parseFloat(row.length) : null;
            const parsedWidth = row.width && row.width !== 'NaN' ? parseFloat(row.width) : null;
            const thumbnailImg = row.image || 'https://via.placeholder.com/600x400?text=No+Image';

            // --- 5. LƯU VÀO BẢNG POSTS ---
            await prisma.posts.upsert({
              where: { sourceId: sourceIdStr },
              update: {
                title: row.subject,
                thumbnail: thumbnailImg,
                price: parsedPrice,
                area: parsedArea,
                city: cityCode,
                district: districtCode,
                ward: row.ward_name,
                addressDetail: row.street_name,
                bedrooms: parsedBedrooms,
                bathrooms: parsedBathrooms,
                length: parsedLength,
                width: parsedWidth,
                sellerName: accountName,
                content: `Mô tả tự động: Bất động sản tại ${row.ward_name || ''}, ${districtName || ''}. Giá bán: ${row.price_string || ''}.`
              },
              create: {
                sourceId: sourceIdStr,
                title: row.subject,
                thumbnail: thumbnailImg,
                price: parsedPrice,
                area: parsedArea,
                city: cityCode,
                district: districtCode,
                ward: row.ward_name,
                addressDetail: row.street_name,
                bedrooms: parsedBedrooms,
                bathrooms: parsedBathrooms,
                length: parsedLength,
                width: parsedWidth,
                transactionType: 'SALE',
                status: 'ACTIVE',
                categoryId: categoryId,
                userId: userId,
                sellerName: accountName,
                content: `Mô tả tự động: Bất động sản tại ${row.ward_name || ''}, ${districtName || ''}. Giá bán: ${row.price_string || ''}.`
              }
            });

            console.log(`✅ Đã thêm: ${row.subject.substring(0, 40)}...`);

          } catch (error: any) {
            console.error(`❌ Lỗi bài ${row.subject}:`, error.message);
          }
        }

        console.log('\n🎉 Xong! Đã đưa toàn bộ dữ liệu vào Database Supabase thành công!');
        resolve(true); 
      });
  });
}

main()
  .catch((e) => {
    console.error("Lỗi cấu trúc:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });