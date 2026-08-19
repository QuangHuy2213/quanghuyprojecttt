require('dotenv').config(); 
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const axios = require('axios');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function crawlAndSeedData() {
  console.log("🚀 Bắt đầu quá trình Crawl dữ liệu (Chống lặp 100%)...");

  try {
    const listApiUrl = 'https://gateway.chotot.com/v1/public/ad-listing?cg=1000&limit=50&protection_entitlement=true&key_param_included=true&region_v2=0&area_v2=0&ward=0'; 
    
    console.log("Đang lấy danh sách bài đăng từ Nhà Tốt...");
    const listResponse = await axios.get(listApiUrl);
    const posts = listResponse.data.ads; 

    console.log(`Tìm thấy ${posts.length} bài đăng. Bắt đầu xử lý...`);

    for (let i = 0; i < posts.length; i++) {
      const rawPostId = posts[i].list_id; 
      const sourceIdStr = rawPostId.toString(); // Chuyển sang dạng chuỗi làm mã khóa

      console.log(`\n[${i + 1}/${posts.length}] Đang xử lý bài ID: ${sourceIdStr}`);
      
      try {
        const detailApiUrl = `https://gateway.chotot.com/v2/public/ad-listing/${rawPostId}`;
        const detailResponse = await axios.get(detailApiUrl);
        const postDetail = detailResponse.data.ad;

        const title = postDetail.subject || '';
        const price = postDetail.price || 0; 
        const area = postDetail.size || 0; 
        const content = postDetail.body || ''; 
        
        // Cố gắng tìm tên người bán từ nhiều trường
        const sellerName = postDetail.full_name || postDetail.account_name || postDetail.contact_name || 'Người bán';

        const streetName = postDetail.street_name || '';
        const areaName = postDetail.area_name || '';
        const regionName = postDetail.region_name || '';
        const addressDetail = [streetName, areaName, regionName].filter(Boolean).join(', ') || areaName || regionName || 'Khu vực khác';

        const lowerTitle = title.toLowerCase();
        const lowerContent = content.toLowerCase();
        let transactionType = "SALE"; 
        
        if (
          Number(price) < 50000000 || 
          lowerTitle.includes('cho thuê') || 
          lowerTitle.includes('phòng trọ') || 
          lowerContent.includes('cho thuê')
        ) {
          transactionType = "RENT";
        }

        const imageUrls = postDetail.images ? postDetail.images.map(img => img.trim()) : [];
        const thumbnail = imageUrls.length > 0 ? imageUrls[0] : null;

        // 🌟 LƯU BẰNG UPSERT THEO SOURCEID 🌟
        await prisma.posts.upsert({
          where: { 
            sourceId: sourceIdStr // Kiểm tra duy nhất bằng mã của Nhà Tốt
          }, 
          update: {
            title: title,
            price: price,
            area: area,
            content: content,
            thumbnail: thumbnail,
            addressDetail: addressDetail,
            transactionType: transactionType,
            sellerName: sellerName,
            status: "ACTIVE",
          },
          create: {
            sourceId: sourceIdStr, // Lưu mã bài
            title: title,
            price: price,
            area: area,
            content: content,
            thumbnail: thumbnail,
            addressDetail: addressDetail,
            transactionType: transactionType,
            sellerName: sellerName,
            status: "ACTIVE",
            images: {
              create: imageUrls.map(url => ({ url: url }))
            }
          }
        });

        console.log(`✅ Đã lưu/cập nhật: ${title.substring(0, 30)}...`);

      } catch (err) {
        console.error(`❌ Lỗi bài ${sourceIdStr}:`, err.message);
      }

      await delay(1500); 
    }

    console.log("\n🎉 HOÀN TẤT CÀO DỮ LIỆU!");

  } catch (error) {
    console.error("Lỗi:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

crawlAndSeedData();