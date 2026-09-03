'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../../components/Header'; 
import { apiFetch } from '../../../services/api';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  
  const [post, setPost] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [review, setReview] = useState({ rating: 5, content: '' });
  const [followInfo, setFollowInfo] = useState({ followers: 0, isFollowing: false });

  const [reportModal, setReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setCurrentUser(JSON.parse(storedUser));

    if (id) {
      const viewedPosts = JSON.parse(localStorage.getItem('viewed_posts') || '[]');
      const updatedHistory = [Number(id), ...viewedPosts.filter((item: number) => item !== Number(id))].slice(0, 20);
      localStorage.setItem('viewed_posts', JSON.stringify(updatedHistory));

      apiFetch(`posts/${id}`)
        .then(res => res.json())
        .then(data => {
          setPost(data);
          setSelectedImage(data.images?.[0]?.url || data.thumbnail || '');
          setIsLoading(false);
          const sellerId = data.user?.id || data.userId;
          apiFetch(`community/follows/${sellerId}?viewer=${JSON.parse(localStorage.getItem('user') || '{}').id || ''}`).then(r=>r.json()).then(setFollowInfo);
        })
        .catch(err => {
          console.error("Lỗi:", err);
          setIsLoading(false);
        });
      apiFetch(`posts/${id}/comments`).then(res => res.json()).then(data => setComments(Array.isArray(data) ? data : [])).catch(() => {});
      apiFetch(`community/posts/${id}/reviews`).then(res=>res.json()).then(data=>setReviews(Array.isArray(data)?data:[])).catch(()=>{});
    }
  }, [id]);

  const submitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser) return router.push('/login');
    if (!commentText.trim()) return;
    setCommenting(true);
    try {
      const response = await apiFetch(`posts/${id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token')}` }, body: JSON.stringify({ content: commentText, parentId: replyingTo }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không thể gửi bình luận.');
      const refreshed = await apiFetch(`posts/${id}/comments`).then(r=>r.json()); setComments(refreshed); setCommentText(''); setReplyingTo(null); showToast('Đã đăng bình luận.', 'success');
    } catch (error: any) { showToast(error.message, 'error'); } finally { setCommenting(false); }
  };
  const likeComment = async (commentId:number) => { if(!currentUser)return router.push('/login');await apiFetch(`posts/comments/${commentId}/like`,{method:'POST',headers:{Authorization:`Bearer ${localStorage.getItem('access_token')}`}});const refreshed=await apiFetch(`posts/${id}/comments`).then(r=>r.json());setComments(refreshed); };

  const toggleFollow = async () => { if(!currentUser)return router.push('/login');const sellerId=post.user?.id||post.userId;const r=await apiFetch(`community/follows/${sellerId}`,{method:'POST',headers:{Authorization:`Bearer ${localStorage.getItem('access_token')}`}});const d=await r.json();if(r.ok)setFollowInfo(x=>({followers:x.followers+(d.following?1:-1),isFollowing:d.following})); };
  const saveReview = async () => { if(!currentUser)return router.push('/login');const r=await apiFetch(`community/posts/${id}/reviews`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('access_token')}`},body:JSON.stringify(review)});const d=await r.json();if(!r.ok)return showToast(d.message,'error');setReview({rating:5,content:''});const all=await apiFetch(`community/posts/${id}/reviews`).then(x=>x.json());setReviews(all);showToast('Đã lưu đánh giá.','success'); };

  const formatPrice = (price: number) => {
    if (!price || price === 0) return 'Thoả thuận';
    if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toLocaleString('vi-VN')} tỷ`;
    return `${(price / 1_000_000).toLocaleString('vi-VN')} triệu`;
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      showToast('Vui lòng đăng nhập để thực hiện báo cáo!', 'error');
      return router.push('/login');
    }

    if (!reportReason) {
      return showToast('Vui lòng chọn lý do báo cáo!', 'error');
    }

    setIsReporting(true);
    try {
      const res = await apiFetch('reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          postId: post.id,
          reason: reportReason
        })
      });

      if (res.ok) {
        showToast('Báo cáo thành công. Cảm ơn bạn!', 'success');
        setReportModal(false);
        setReportReason('');
      } else {
        showToast('Có lỗi xảy ra, không thể gửi báo cáo.', 'error');
      }
    } catch (error) {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setIsReporting(false);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col">
      <Header />
      <div className="flex-grow flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-[30px] border border-slate-200 bg-white p-9 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600"></div>
          </div>
          <h2 className="mt-5 text-lg font-black text-slate-900">Đang tải bất động sản</h2>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-500">Hình ảnh và thông tin chi tiết đang được đồng bộ...</p>
        </div>
      </div>
    </div>
  );

  if (!post) return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col">
      <Header />
      <div className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-xl">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🔍</span>
          </div>
          <h2 className="mb-2 text-xl font-black text-slate-900">Không tìm thấy tin đăng!</h2>
          <p className="mb-6 text-sm font-medium leading-6 text-slate-600">Tin đăng này có thể đã được chủ nhà gỡ bỏ hoặc không còn tồn tại.</p>
          <button onClick={() => router.push('/')} className="w-full rounded-2xl bg-blue-600 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700">
            Quay về trang chủ
          </button>
        </div>
      </div>
    </div>
  );

  const displaySellerName = post.sellerName || post.user?.fullName || 'Người bán';
  const isOwner = currentUser && String(currentUser.id) === String(post.user?.id || post.userId);

  const averageRating = reviews.length
    ? reviews.reduce((sum: number, item: any) => sum + Number(item.rating || 0), 0) / reviews.length
    : 0;

  const locationText = [
    post.addressDetail,
    post.ward,
    post.districts?.name,
    post.cities?.name,
  ].filter(Boolean).join(', ');

  const REPORT_REASONS = [
    "Tin giả mạo, lừa đảo",
    "Thông tin không chính xác (giá, diện tích...)",
    "Đã bán nhưng chưa gỡ bài",
    "Hình ảnh không đúng thực tế",
    "Nội dung phản cảm, sai quy định",
    "Lý do khác..."
  ];

  return (
    <div className="min-h-screen bg-slate-100/70 relative overflow-hidden pb-12">
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }
      `}} />

      <Header />
      
      {/* POPUP TOAST */}
      <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-out ${toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5 pointer-events-none'}`}>
        <div className={`flex items-center gap-3 rounded-2xl border bg-white px-5 py-4 text-sm font-extrabold shadow-2xl ${toast.type === 'error' ? 'border-rose-200 text-rose-700' : 'border-emerald-200 text-emerald-700'}`}>
          <span className="text-lg">{toast.type === 'error' ? '⚠️' : '✓'}</span>
          {toast.message}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:py-8 animate-fade-in-up">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
            <button onClick={() => router.push('/')} className="transition-colors hover:text-blue-700">Trang chủ</button>
            <span className="text-slate-300">/</span>
            <span>Bất động sản</span>
            <span className="text-slate-300">/</span>
            <span className="max-w-[340px] truncate font-extrabold text-slate-700">{post.title}</span>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            Tin đang hiển thị
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          
          {/* CỘT TRÁI: HÌNH ẢNH VÀ CHI TIẾT (Chiếm 8 cột) */}
          <div className="space-y-5 lg:col-span-8">
            
            {/* GALLERY BẤT ĐỘNG SẢN */}
            <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
              <div className="group relative overflow-hidden bg-slate-900">
                <img
                  src={selectedImage || post.thumbnail || 'https://via.placeholder.com/1000x600?text=No+Image'}
                  alt={post.title}
                  className="h-[440px] w-full object-cover transition duration-700 ease-out group-hover:scale-[1.025]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-slate-950/10"></div>

                <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                  <span className="rounded-xl border border-white/20 bg-slate-950/45 px-3 py-2 text-xs font-extrabold text-white backdrop-blur-md">
                    {post.transactionType === 'RENT' ? 'CHO THUÊ' : 'MUA BÁN'}
                  </span>
                  {post.user?.role === 'AGENT' && (
                    <span className="rounded-xl border border-blue-300/20 bg-blue-500/75 px-3 py-2 text-xs font-extrabold text-white backdrop-blur-md">
                      Môi giới chuyên nghiệp
                    </span>
                  )}
                </div>

                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold text-white/80">Giá bất động sản</div>
                    <div className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">{formatPrice(post.price)}</div>
                  </div>

                  <div className="rounded-2xl border border-white/15 bg-slate-950/45 px-4 py-3 text-right text-white backdrop-blur-md">
                    <div className="text-xs font-bold text-white/70">Diện tích</div>
                    <div className="mt-1 text-xl font-black">{post.area} m²</div>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-900">Thư viện hình ảnh</div>
                    <div className="mt-0.5 text-xs font-medium text-slate-500">
                      {post.images?.length || 1} hình ảnh của bất động sản
                    </div>
                  </div>
                  <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-extrabold text-slate-500">Chọn ảnh để xem</span>
                </div>

                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {(post.images?.length ? post.images : [{ id: 'main', url: post.thumbnail }]).slice(0, 6).map((image:any, index:number) => (
                    <button
                      key={image.id || index}
                      onClick={() => setSelectedImage(image.url)}
                      className={`group/thumb relative overflow-hidden rounded-xl border-2 transition-all ${
                        selectedImage === image.url
                          ? 'border-blue-500 shadow-md shadow-blue-500/10'
                          : 'border-transparent hover:border-blue-200'
                      }`}
                    >
                      <img src={image.url} alt="Ảnh bất động sản" className="h-20 w-full object-cover transition-transform duration-500 group-hover/thumb:scale-105" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* THÔNG TIN CHÍNH */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-700">
                  {post.transactionType === 'RENT' ? 'Bất động sản cho thuê' : 'Bất động sản mua bán'}
                </span>
                <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
                  Mã tin #{post.id}
                </span>
              </div>

              <h1 className="mb-4 text-2xl font-black leading-snug tracking-tight text-slate-950 md:text-3xl">
                {post.title}
              </h1>
              <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-slate-400">
                <span className="flex items-center gap-1.5">🕒 Đăng {new Date(post.createdAt).toLocaleString('vi-VN')}</span>
                <span className="flex items-center gap-1.5">📍 {post.districts?.name || 'Đang cập nhật'}, {post.cities?.name || ''}</span>
              </div>
              
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-5 mb-5">
                <span className="text-3xl font-black tracking-tight text-rose-600">
                  {formatPrice(post.price)}
                </span>
                
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2">
                  <span className="text-gray-400 text-sm">📐</span> 
                  <span className="text-sm font-semibold text-slate-600">Diện tích:</span>
                  <strong className="text-sm font-extrabold text-slate-900">{post.area} m²</strong>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="text-red-500 text-lg mt-0.5">📍</span>
                <div className="flex flex-col">
                  <span className="mb-1 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">Địa chỉ</span>
                  <span className="text-[15px] font-semibold leading-6 text-slate-700">
{locationText || 'Địa chỉ đang được cập nhật'}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                  <div className="text-xs font-bold text-blue-500">Loại giao dịch</div>
                  <div className="mt-1 text-sm font-black text-blue-900">{post.transactionType === 'RENT' ? 'Cho thuê' : 'Mua bán'}</div>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <div className="text-xs font-bold text-emerald-600">Người đăng</div>
                  <div className="mt-1 truncate text-sm font-black text-emerald-900">{displaySellerName}</div>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                  <div className="text-xs font-bold text-amber-600">Đánh giá hiện tại</div>
                  <div className="mt-1 text-sm font-black text-amber-900">
                    {reviews.length ? `${averageRating.toFixed(1)} / 5 · ${reviews.length} đánh giá` : 'Chưa có đánh giá'}
                  </div>
                </div>
              </div>
            </div>

            {/* Khung Đặc Điểm */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <h2 className="mb-5 flex items-center gap-2 text-xl font-black text-slate-900">
                <span className="text-blue-600">⌂</span> Đặc điểm bất động sản
              </h2>
              
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  { label: 'Diện tích', value: `${post.area} m²`, icon: '📐' },
                  { label: 'Phòng ngủ', value: `${post.bedrooms || '--'} PN`, icon: '🛏️' },
                  { label: 'Phòng tắm', value: `${post.bathrooms || '--'} WC`, icon: '🛁' },
                  { label: 'Pháp lý', value: post.legalDocument || 'Đang cập nhật', icon: '📄', highlight: true }
                ].map((item, idx) => (
                  <div key={idx} className="group flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-lg">
                    <div className="text-gray-400 mb-1.5 text-base">{item.icon}</div>
                    <span className="mb-1 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{item.label}</span>
                    <span className={`text-sm font-extrabold ${item.highlight ? 'text-[#1877F2] truncate' : 'text-gray-900'}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* MÔ TẢ CHI TIẾT */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-600">Description</div>
                  <h2 className="mt-1 text-xl font-black text-slate-950">Thông tin chi tiết</h2>
                </div>
                <span className="hidden rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500 sm:block">Nội dung từ người đăng</span>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                <div className="whitespace-pre-wrap text-[15px] font-medium leading-8 text-slate-700">
                  {post.content || 'Người đăng chưa cập nhật mô tả chi tiết cho bất động sản này.'}
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-600">Community</div>
                  <h2 className="mt-1 text-xl font-black text-slate-950">Bình luận <span className="text-sm text-slate-400">({comments.length})</span></h2>
                </div>
                <span className="text-sm font-medium text-slate-400">Trao đổi công khai về tin đăng</span>
              </div>
              {replyingTo && <div className="mt-4 flex items-center justify-between rounded-xl bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700"><span>Đang trả lời bình luận</span><button onClick={()=>setReplyingTo(null)}>Hủy</button></div>}
              <form onSubmit={submitComment} className="mt-5 flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"><input value={commentText} onChange={e => setCommentText(e.target.value)} maxLength={1000} placeholder={replyingTo ? 'Viết câu trả lời...' : currentUser ? 'Chia sẻ ý kiến của bạn...' : 'Đăng nhập để bình luận'} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"/><button disabled={commenting || !commentText.trim()} className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-500/20 disabled:opacity-40">Gửi</button></form>
              <div className="mt-6 space-y-5">{comments.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
                  <div className="text-2xl">💬</div>
                  <p className="mt-2 text-sm font-black text-slate-700">Chưa có bình luận</p>
                  <p className="mt-1 text-sm font-medium text-slate-400">Hãy là người đầu tiên chia sẻ ý kiến.</p>
                </div> : comments.map(comment => <div key={comment.id} className="flex gap-3"><div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-blue-100 font-black text-blue-700">{comment.user?.fullName?.charAt(0)?.toUpperCase() || 'U'}</div><div className="min-w-0 flex-1"><div className="rounded-2xl bg-slate-50 px-4 py-3"><div className="flex justify-between gap-3"><strong className="text-sm text-slate-800">{comment.user?.fullName}</strong><span className="text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleString('vi-VN')}</span></div><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{comment.content}</p><div className="mt-2 flex gap-4 text-xs font-bold"><button onClick={()=>likeComment(comment.id)} className="text-rose-500">♥ {comment._count?.likes || 0}</button><button onClick={()=>{setReplyingTo(comment.id);setCommentText('')}} className="text-blue-600">Trả lời</button></div></div>{comment.replies?.map((reply:any)=><div key={reply.id} className="ml-6 mt-2 rounded-2xl border-l-2 border-blue-200 bg-blue-50/50 px-4 py-3"><div className="flex justify-between"><strong className="text-xs">{reply.user?.fullName}</strong><span className="text-[10px] text-slate-400">{new Date(reply.createdAt).toLocaleString('vi-VN')}</span></div><p className="mt-1 text-sm text-slate-600">{reply.content}</p><button onClick={()=>likeComment(reply.id)} className="mt-2 text-xs font-bold text-rose-500">♥ {reply._count?.likes || 0}</button></div>)}</div></div>)}</div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7 lg:col-span-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-amber-600">Rating & Review</div>
                <h2 className="mt-1 text-xl font-black text-slate-950">Đánh giá bài đăng</h2>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                <div className="text-3xl font-black text-amber-600">{reviews.length ? averageRating.toFixed(1) : '—'}</div>
                <div>
                  <div className="text-sm tracking-wider text-amber-500">{reviews.length ? '★★★★★' : '☆☆☆☆☆'}</div>
                  <div className="mt-0.5 text-xs font-bold text-amber-700">{reviews.length} đánh giá</div>
                </div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-[120px_1fr_auto]"><select value={review.rating} onChange={e=>setReview({...review,rating:Number(e.target.value)})} className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-extrabold text-slate-700 outline-none focus:border-amber-400">{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} sao</option>)}</select><input value={review.content} onChange={e=>setReview({...review,content:e.target.value})} placeholder="Nhận xét của bạn..." className="h-12 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-500/10"/><button onClick={saveReview} className="h-12 rounded-xl bg-amber-500 px-5 text-sm font-black text-white shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-600">Đánh giá</button></div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">{reviews.length === 0 ? (
              <div className="sm:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-9 text-center">
                <div className="text-2xl">⭐</div>
                <p className="mt-2 text-sm font-black text-slate-700">Chưa có đánh giá</p>
                <p className="mt-1 text-sm font-medium text-slate-400">Hãy chia sẻ trải nghiệm của bạn về tin đăng này.</p>
              </div>
            ) : reviews.map(x=><div key={x.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex justify-between"><strong className="text-sm">{x.user?.fullName}</strong><span className="text-amber-500">{'★'.repeat(x.rating)}</span></div><p className="mt-2 text-sm text-slate-600">{x.content}</p></div>)}</div>
          </div>

          {/* CỘT PHẢI: THÔNG TIN NGƯỜI BÁN (Chiếm 4 cột) */}
          <div className="space-y-4 lg:col-span-4 lg:col-start-9 lg:row-start-1 lg:sticky lg:top-24 lg:self-start">
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 p-5 text-white">
                <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-200">Người đăng tin</div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xl font-black text-white shadow-lg shadow-blue-500/25">
                    {displaySellerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-black text-white">{displaySellerName}</h3>
                    <span className="mt-1 inline-block rounded-lg border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-extrabold text-blue-100">
                      {post.user?.role === 'AGENT' ? 'Chuyên viên môi giới' : 'Cá nhân bán'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                    <div className="text-xs font-bold text-slate-400">Người theo dõi</div>
                    <div className="mt-1 text-xl font-black text-slate-900">{followInfo.followers}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                    <div className="text-xs font-bold text-slate-400">Đánh giá tin</div>
                    <div className="mt-1 text-xl font-black text-amber-600">{reviews.length ? averageRating.toFixed(1) : '—'}</div>
                  </div>
                </div>

                <div className="space-y-3">
                {!isOwner && <button onClick={toggleFollow} className={`w-full rounded-2xl border px-4 py-3 text-sm font-black transition ${followInfo.isFollowing?'border-blue-200 bg-blue-50 text-blue-700':'border-slate-200 bg-white text-slate-700 hover:border-blue-300'}`}>{followInfo.isFollowing?'✓ Đang theo dõi':'+ Theo dõi người bán'} · {followInfo.followers}</button>}
                {!isOwner ? (
                  <>
                    <a 
                      href={`tel:${post.phone || post.user?.phoneNumber || '0901234567'}`}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-700"
                    >
                      <span>📞</span>
                      <span>{post.phone || post.user?.phoneNumber || '0901234567'}</span>
                    </a>
                    
                    <button 
                      onClick={() => {
                        if (!currentUser) {
                          showToast('Vui lòng đăng nhập để chat!', 'error');
                          return router.push('/login');
                        }

                        const sellerId = post.user?.id || post.userId;

                        router.push(
                          `/chat/${post.id}?sellerId=${encodeURIComponent(
                            String(sellerId)
                          )}&sellerName=${encodeURIComponent(displaySellerName)}`
                        );
                      }} 
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3.5 text-sm font-extrabold text-blue-700 transition-all hover:bg-blue-100"
                    >
                      <span>💬</span>
                      <span>Chat với {displaySellerName}</span>
                    </button>
                    <button 
                      onClick={() => setReportModal(true)}
                      className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                      </svg>
                      Báo cáo tin đăng
                    </button>
                  </>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 py-4 text-center">
                    <span className="text-sm font-semibold text-slate-600">Đây là tin đăng của bạn</span>
                  </div>
                )}
              </div>
            </div>
            </div>

            <div className="rounded-[24px] border border-amber-100 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg">🛡️</div>
                <div>
                  <h3 className="text-sm font-black text-amber-900">Giao dịch an toàn</h3>
                  <p className="mt-1 text-xs font-medium leading-5 text-amber-800">
                    Nên kiểm tra thực tế bất động sản, giấy tờ pháp lý và chỉ thanh toán sau khi hai bên thống nhất rõ điều kiện.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-black text-slate-900">Thông tin tin đăng</h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                  <span className="font-medium text-slate-500">Mã tin</span>
                  <span className="font-extrabold text-slate-800">#{post.id}</span>
                </div>
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                  <span className="font-medium text-slate-500">Loại giao dịch</span>
                  <span className="font-extrabold text-slate-800">{post.transactionType === 'RENT' ? 'Cho thuê' : 'Mua bán'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="font-medium text-slate-500">Ngày đăng</span>
                  <span className="text-right font-extrabold text-slate-800">{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL BÁO CÁO VI PHẠM */}
      {reportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-[0_30px_90px_-25px_rgba(15,23,42,0.6)] animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-rose-50 to-white p-6">
              <h3 className="flex items-center gap-2 text-xl font-black text-slate-900">
                <span className="text-red-500">🚩</span> Báo cáo tin đăng
              </h3>
              <button 
                onClick={() => setReportModal(false)} 
                className="text-gray-400 hover:text-red-500 text-xl font-bold leading-none"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={submitReport} className="p-5">
              <p className="mb-5 text-sm font-medium leading-6 text-slate-600">
                Vui lòng chọn lý do để hệ thống kiểm tra và xử lý. Thông tin của bạn sẽ được bảo mật.
              </p>
              
              <div className="space-y-2 mb-5">
                {REPORT_REASONS.map((reason, idx) => (
                  <label 
                    key={idx} 
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 transition-all ${
                      reportReason === reason ? 'border-rose-400 bg-rose-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${reportReason === reason ? 'border-rose-500' : 'border-slate-300'}`}>
                      {reportReason === reason && <div className="w-2 h-2 bg-rose-600 rounded-full"></div>}
                    </div>
                    <span className={`text-sm ${reportReason === reason ? 'font-extrabold text-rose-700' : 'text-slate-600'}`}>
                      {reason}
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex gap-2.5">
                <button 
                  type="button" 
                  onClick={() => setReportModal(false)} 
                  className="flex-1 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-extrabold text-slate-700 transition-all hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={isReporting || !reportReason} 
                  className="flex-1 bg-rose-600 text-white font-semibold py-2.5 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 text-sm"
                >
                  {isReporting ? 'Đang gửi...' : 'Gửi báo cáo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
