"use client";

import React, { useState, useEffect } from 'react';
import { apiUrl } from '../services/api';
import './PostList.css';

// 1. KHAI BÁO CÁC INTERFACE
interface City {
  code: string;
  name: string;
  name_with_type: string;
}

interface District {
  code: string;
  name: string;
  name_with_type: string;
  parent_code: string;
}

interface Post {
  id?: number | string;
  title: string;
  price: number;
  area: number;
  city: string;
  district: string;
  thumbnail: string;
  content: string;
}

interface DistrictLabelProps {
  cityCode: string | number;
  districtCode: string | number;
}

// 2. COMPONENT DISTRICT LABEL
const DistrictLabel: React.FC<DistrictLabelProps> = ({ cityCode, districtCode }) => {
  const [districtName, setDistrictName] = useState<string>(`Mã ${districtCode}`);

  useEffect(() => {
    if (!cityCode || !districtCode) return;
    fetch(apiUrl(`/districts/${cityCode}`))
      .then(res => res.json())
      .then((data) => {
        let districts = Array.isArray(data) ? data : (data?.data || []);
        const found = districts.find((d: District) => String(d.code) === String(districtCode));
        if (found) setDistrictName(found.name_with_type);
      })
      .catch(err => console.error("Lỗi fetch DistrictLabel:", err));
  }, [cityCode, districtCode]);

  return <span>{districtName}</span>;
};

// 3. COMPONENT CHÍNH: POST LIST
const PostList: React.FC = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [availableDistricts, setAvailableDistricts] = useState<District[]>([]);
  
  // Dùng 2 mảng: 1 mảng giữ data gốc, 1 mảng để hiển thị sau khi lọc
  const [allPosts, setAllPosts] = useState<Post[]>([]); 
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  
  const [keyword, setKeyword] = useState<string>(''); // Thêm State tìm kiếm
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedPrice, setSelectedPrice] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('');

  // 4. Lấy danh sách thành phố & TẤT CẢ bài viết khi load trang
  useEffect(() => {
    fetch(apiUrl('/cities'))
      .then(res => res.json())
      .then(data => setCities(Array.isArray(data) ? data : (data?.data || [])));

    fetch(apiUrl('/posts'))
      .then(res => res.json())
      .then(data => {
        const posts = Array.isArray(data) ? data : (data?.data || []);
        setAllPosts(posts);
        setFilteredPosts(posts);
      });
  }, []);

  // 5. Lấy Quận/Huyện khi Tỉnh/Thành thay đổi
  useEffect(() => {
    if (selectedCity) {
      fetch(apiUrl(`/districts/${selectedCity}`))
        .then(res => res.json())
        .then(data => setAvailableDistricts(Array.isArray(data) ? data : (data?.data || [])));
    } else {
      setAvailableDistricts([]);
      setSelectedDistrict('');
    }
  }, [selectedCity]);

  // 6. Hàm Lọc tin (Xử lý trực tiếp trên Frontend để đảm bảo hoạt động 100%)
  const handleFilter = () => {
    let results = [...allPosts];

    if (keyword) {
      results = results.filter(post => 
        post.title.toLowerCase().includes(keyword.toLowerCase()) || 
        post.content.toLowerCase().includes(keyword.toLowerCase())
      );
    }
    
    if (selectedCity) {
      results = results.filter(post => String(post.city) === String(selectedCity));
    }
    
    if (selectedDistrict) {
      results = results.filter(post => String(post.district) === String(selectedDistrict));
    }
    
    if (selectedPrice) {
      const [min, max] = selectedPrice.split('-');
      results = results.filter(post => {
        if (max) return post.price >= Number(min) && post.price <= Number(max);
        return post.price >= Number(min);
      });
    }

    if (selectedArea) {
      const [min, max] = selectedArea.split('-');
      results = results.filter(post => {
        if (max) return post.area >= Number(min) && post.area <= Number(max);
        return post.area >= Number(min);
      });
    }

    setFilteredPosts(results);
  };

  // 7. Hàm Làm mới
  const handleReset = () => {
    setKeyword('');
    setSelectedCity('');
    setSelectedDistrict('');
    setSelectedPrice('');
    setSelectedArea('');
    setFilteredPosts(allPosts); // Trả lại toàn bộ data gốc
  };

  return (
    <div className="post-list-container">
      {/* KHU VỰC TÌM KIẾM */}
      <div className="search-bar">
        
        {/* Đã thêm ô tìm kiếm */}
        <div className="form-group">
          <label>Từ khóa</label>
          <input 
            type="text" 
            placeholder="Nhập tiêu đề..." 
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="form-group">
          <label>Tỉnh thành</label>
          <select value={selectedCity} onChange={(e) => { setSelectedCity(e.target.value); setSelectedDistrict(''); }}>
            <option value="">---Tỉnh thành---</option>
            {cities.map((city) => (
              <option key={city.code} value={city.code}>{city.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Quận huyện</label>
          <select value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)} disabled={!selectedCity}>
            <option value="">---Quận huyện---</option>
            {availableDistricts.map((district) => (
              <option key={district.code} value={district.code}>{district.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Khoảng giá</label>
          <select value={selectedPrice} onChange={(e) => setSelectedPrice(e.target.value)}>
            <option value="">Chọn mức giá</option>
            <option value="0-1000000">Dưới 1 triệu</option>
            <option value="1000000-3000000">1 - 3 triệu</option>
            <option value="3000000-5000000">3 - 5 triệu</option>
            <option value="5000000-">Trên 5 triệu</option>
          </select>
        </div>

        <div className="form-group">
          <label>Diện tích</label>
          <select value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)}>
            <option value="">Chọn diện tích</option>
            <option value="0-20">Dưới 20 m²</option>
            <option value="20-30">20 - 30 m²</option>
            <option value="30-50">30 - 50 m²</option>
            <option value="50-">Trên 50 m²</option>
          </select>
        </div>

        <div className="form-group flex-bottom">
          <button className="btn-filter" onClick={handleFilter}>Lọc tin</button>
        </div>
      </div>

      <div className="action-row">
        <button className="btn-reset" onClick={handleReset}>Làm mới</button>
      </div>

      {/* DANH SÁCH BÀI VIẾT */}
      <div className="post-list">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post, index) => {
            const cityObj = cities.find(c => String(c.code) === String(post.city));
            const cityName = cityObj ? cityObj.name : `Mã tỉnh ${post.city}`;

            return (
              <div className="post-item" key={post.id || index}>
                <img src={post.thumbnail || 'https://via.placeholder.com/200x150?text=No+Image'} alt={post.title} className="post-thumbnail" />
                <div className="post-info">
                  <h3 className="post-title">{post.title}</h3>
                  <div className="post-price">{(post.price / 1000000).toLocaleString('vi-VN')} triệu/tháng</div>
                  <div className="post-meta">
                    <strong>Diện tích:</strong> {post.area}m² &nbsp;|&nbsp; 
                    <strong>Khu vực:</strong> <DistrictLabel cityCode={post.city} districtCode={post.district} />, {cityName}
                  </div>
                  <p className="post-content">{post.content}</p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="no-data">Không tìm thấy bài viết nào phù hợp.</p>
        )}
      </div>
    </div>
  );
};

export default PostList;