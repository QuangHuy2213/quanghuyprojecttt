// =========================================================
// TYPES
// =========================================================

export type SystemKnowledgeItem = {
  id:
    string;

  title:
    string;

  keywords:
    string[];

  description:
    string;

  steps:
    string[];

  route?:
    string;

  actionLabel?:
    string;
};


// =========================================================
// SYSTEM KNOWLEDGE
//
// Chỉ thêm route khi chắc chắn route frontend tồn tại.
// =========================================================

export const SYSTEM_KNOWLEDGE:
  SystemKnowledgeItem[] = [

  // =======================================================
  // ACCOUNT - CHANGE PASSWORD
  // =======================================================

  {
    id:
      'CHANGE_PASSWORD',

    title:
      'Đổi mật khẩu',

    keywords: [
      'đổi mật khẩu',
      'thay mật khẩu',
      'đổi password',
      'thay password',
      'đổi pass',
      'thay pass',
      'cập nhật mật khẩu',
      'change password',
      'muốn đổi mật khẩu',
      'tôi muốn đổi mật khẩu',
      'làm sao đổi mật khẩu',
      'cách đổi mật khẩu',
    ],

    description:
      'Bạn có thể thay đổi mật khẩu trong khu vực quản lý tài khoản.',

    steps: [
      'Đăng nhập vào tài khoản.',
      'Mở menu tài khoản cá nhân.',
      'Vào phần quản lý tài khoản hoặc bảo mật.',
      'Chọn chức năng Đổi mật khẩu.',
      'Nhập mật khẩu hiện tại nếu hệ thống yêu cầu.',
      'Nhập mật khẩu mới.',
      'Nhập lại mật khẩu mới để xác nhận.',
      'Nhấn Lưu hoặc Xác nhận.',
    ],
  },


  // =======================================================
  // ACCOUNT - FORGOT PASSWORD
  // =======================================================

  {
    id:
      'FORGOT_PASSWORD',

    title:
      'Quên mật khẩu',

    keywords: [
      'quên mật khẩu',
      'quên password',
      'quên pass',
      'không nhớ mật khẩu',
      'lấy lại mật khẩu',
      'khôi phục mật khẩu',
      'reset password',
      'đặt lại mật khẩu',
      'cách lấy lại mật khẩu',
    ],

    description:
      'Nếu quên mật khẩu, bạn có thể sử dụng chức năng khôi phục mật khẩu tại màn hình đăng nhập.',

    steps: [
      'Mở trang đăng nhập.',
      'Chọn Quên mật khẩu.',
      'Nhập email hoặc thông tin tài khoản được yêu cầu.',
      'Kiểm tra email hoặc mã xác minh.',
      'Mở liên kết khôi phục nếu có.',
      'Nhập mật khẩu mới.',
      'Xác nhận mật khẩu mới.',
    ],
  },


  // =======================================================
  // PROFILE
  // =======================================================

  {
    id:
      'UPDATE_PROFILE',

    title:
      'Cập nhật thông tin cá nhân',

    keywords: [
      'cập nhật thông tin cá nhân',
      'sửa thông tin cá nhân',
      'cập nhật hồ sơ',
      'sửa hồ sơ',
      'cập nhật profile',
      'sửa profile',
      'đổi ảnh đại diện',
      'đổi tên tài khoản',
      'sửa tài khoản',
    ],

    description:
      'Bạn có thể chỉnh sửa thông tin cá nhân trong khu vực quản lý tài khoản.',

    steps: [
      'Đăng nhập vào hệ thống.',
      'Mở menu tài khoản.',
      'Đi đến phần thông tin cá nhân.',
      'Chọn Chỉnh sửa.',
      'Cập nhật các thông tin cần thay đổi.',
      'Nhấn Lưu thay đổi.',
    ],
  },


  // =======================================================
  // SEARCH PROPERTY
  // =======================================================

  {
    id:
      'SEARCH_PROPERTY',

    title:
      'Tìm kiếm bất động sản',

    keywords: [
      'cách tìm nhà',
      'làm sao tìm nhà',
      'cách tìm phòng',
      'làm sao tìm phòng',
      'cách tìm căn hộ',
      'cách tìm đất',
      'cách tìm bất động sản',
      'hướng dẫn tìm bất động sản',
      'cách sử dụng bộ lọc',
      'dùng bộ lọc',
      'hướng dẫn tìm kiếm',
    ],

    description:
      'Bạn có thể tìm bất động sản theo khu vực, loại giao dịch, giá, diện tích và các tiêu chí khác.',

    steps: [
      'Mở trang chủ.',
      'Nhập từ khóa hoặc chọn khu vực.',
      'Chọn loại giao dịch mua hoặc thuê.',
      'Thiết lập mức giá nếu cần.',
      'Thiết lập diện tích hoặc các tiêu chí khác.',
      'Thực hiện tìm kiếm.',
      'Nhấn vào một bất động sản để xem chi tiết.',
    ],

    route:
      '/',

    actionLabel:
      'Đi đến trang tìm kiếm',
  },


  // =======================================================
  // VIEW PROPERTY
  // =======================================================

  {
    id:
      'VIEW_PROPERTY',

    title:
      'Xem chi tiết bất động sản',

    keywords: [
      'xem chi tiết bất động sản',
      'cách xem chi tiết nhà',
      'cách xem bài đăng',
      'xem chi tiết bài đăng',
      'xem thông tin bài đăng',
      'mở bài đăng',
    ],

    description:
      'Bạn có thể nhấn trực tiếp vào bất động sản để xem đầy đủ thông tin của bài đăng.',

    steps: [
      'Tìm bất động sản bạn quan tâm.',
      'Nhấn vào ảnh, tiêu đề hoặc card bất động sản.',
      'Trang chi tiết sẽ hiển thị hình ảnh, giá, diện tích và vị trí.',
      'Bạn cũng có thể xem thông tin người đăng và các chức năng liên quan.',
    ],
  },


  // =======================================================
  // CREATE POST
  // =======================================================

  {
    id:
      'CREATE_POST',

    title:
      'Đăng tin bất động sản',

    keywords: [
      'cách đăng tin',
      'làm sao đăng tin',
      'hướng dẫn đăng tin',
      'tạo bài đăng',
      'cách tạo bài đăng',
      'đăng bài bất động sản',
      'đăng nhà để bán',
      'đăng nhà cho thuê',
      'tôi muốn đăng tin',
      'tôi muốn bán nhà',
      'tôi muốn cho thuê nhà',
    ],

    description:
      'Bạn có thể tạo bài đăng mới để bán hoặc cho thuê bất động sản.',

    steps: [
      'Đăng nhập vào tài khoản.',
      'Chọn chức năng Đăng tin.',
      'Chọn hình thức bán hoặc cho thuê.',
      'Nhập tiêu đề và nội dung mô tả.',
      'Nhập giá.',
      'Nhập diện tích và thông tin bất động sản.',
      'Chọn tỉnh/thành phố và quận/huyện.',
      'Thêm hình ảnh.',
      'Kiểm tra lại thông tin.',
      'Nhấn Đăng tin.',
    ],

    route:
      '/create-post',

    actionLabel:
      'Đi đến trang đăng tin',
  },


  // =======================================================
  // EDIT POST
  // =======================================================

  {
    id:
      'EDIT_POST',

    title:
      'Chỉnh sửa bài đăng',

    keywords: [
      'sửa bài đăng',
      'chỉnh sửa bài đăng',
      'sửa bài',
      'sửa tin bất động sản',
      'đổi giá bài đăng',
      'cập nhật bài đăng',
      'tôi muốn sửa bài',
    ],

    description:
      'Bạn có thể chỉnh sửa những bài đăng thuộc tài khoản của mình.',

    steps: [
      'Đăng nhập vào hệ thống.',
      'Mở khu vực quản lý bài đăng.',
      'Chọn bài đăng cần chỉnh sửa.',
      'Nhấn Chỉnh sửa.',
      'Cập nhật thông tin cần thay đổi.',
      'Nhấn Lưu.',
    ],
  },


  // =======================================================
  // DELETE POST
  // =======================================================

  {
    id:
      'DELETE_POST',

    title:
      'Xóa bài đăng',

    keywords: [
      'xóa bài đăng',
      'xóa bài',
      'gỡ bài đăng',
      'xóa tin',
      'gỡ tin',
      'xóa tin bất động sản',
      'tôi muốn xóa bài',
    ],

    description:
      'Bạn có thể xóa hoặc gỡ bài đăng của mình trong khu vực quản lý bài đăng.',

    steps: [
      'Đăng nhập vào hệ thống.',
      'Mở danh sách bài đăng của bạn.',
      'Chọn bài đăng cần xóa.',
      'Nhấn Xóa hoặc Gỡ bài.',
      'Xác nhận thao tác.',
    ],
  },


  // =======================================================
  // CHAT
  // =======================================================

  {
    id:
      'CHAT_WITH_SELLER',

    title:
      'Nhắn tin với người đăng',

    keywords: [
      'nhắn tin người bán',
      'cách nhắn tin người bán',
      'liên hệ người bán',
      'chat với người bán',
      'nhắn tin chủ nhà',
      'liên hệ chủ nhà',
      'cách liên hệ người đăng',
    ],

    description:
      'Bạn có thể nhắn tin để trao đổi trực tiếp với người đăng bất động sản.',

    steps: [
      'Mở bất động sản bạn quan tâm.',
      'Chọn chức năng nhắn tin hoặc liên hệ.',
      'Nhập nội dung cần trao đổi.',
      'Nhấn Gửi.',
      'Bạn có thể tiếp tục cuộc trò chuyện trong hộp thư.',
    ],
  },


  // =======================================================
  // INBOX
  // =======================================================

  {
    id:
      'INBOX',

    title:
      'Xem hộp thư',

    keywords: [
      'xem hộp thư',
      'mở hộp thư',
      'xem inbox',
      'xem tin nhắn',
      'tin nhắn của tôi',
      'đọc tin nhắn',
      'tôi muốn xem tin nhắn',
    ],

    description:
      'Hộp thư lưu các cuộc trò chuyện giữa bạn và những người dùng khác.',

    steps: [
      'Đăng nhập vào hệ thống.',
      'Mở khu vực tin nhắn hoặc hộp thư.',
      'Chọn cuộc trò chuyện muốn xem.',
      'Đọc hoặc gửi thêm tin nhắn.',
    ],
  },


  // =======================================================
  // NOTIFICATIONS
  // =======================================================

  {
    id:
      'NOTIFICATIONS',

    title:
      'Xem thông báo',

    keywords: [
      'xem thông báo',
      'mở thông báo',
      'thông báo của tôi',
      'xem notification',
      'notification của tôi',
      'tôi muốn xem thông báo',
    ],

    description:
      'Hệ thống hiển thị thông báo về các hoạt động quan trọng liên quan đến tài khoản và giao dịch.',

    steps: [
      'Đăng nhập vào hệ thống.',
      'Nhấn biểu tượng thông báo.',
      'Xem danh sách thông báo.',
      'Nhấn vào một thông báo để xem nội dung liên quan.',
    ],
  },


  // =======================================================
  // TRANSACTIONS
  // =======================================================

  {
    id:
      'TRANSACTIONS',

    title:
      'Xem giao dịch',

    keywords: [
      'xem giao dịch',
      'giao dịch của tôi',
      'lịch sử giao dịch',
      'kiểm tra giao dịch',
      'trạng thái giao dịch',
      'tôi muốn xem giao dịch',
    ],

    description:
      'Bạn có thể theo dõi các giao dịch bất động sản trong khu vực Giao dịch của tôi.',

    steps: [
      'Đăng nhập vào hệ thống.',
      'Mở mục Giao dịch của tôi.',
      'Chọn giao dịch cần kiểm tra.',
      'Xem trạng thái và các thông tin liên quan.',
    ],

    route:
      '/my-transactions',

    actionLabel:
      'Xem giao dịch của tôi',
  },


  // =======================================================
  // INVOICE
  // =======================================================

  {
    id:
      'INVOICE',

    title:
      'Xem hóa đơn',

    keywords: [
      'xem hóa đơn',
      'hóa đơn của tôi',
      'hóa đơn giao dịch',
      'kiểm tra hóa đơn',
      'invoice của tôi',
    ],

    description:
      'Bạn có thể kiểm tra hóa đơn liên quan đến giao dịch trong mục Giao dịch của tôi.',

    steps: [
      'Đăng nhập vào hệ thống.',
      'Mở Giao dịch của tôi.',
      'Chọn giao dịch cần xem.',
      'Kiểm tra hóa đơn.',
      'Xem số tiền, hạn thanh toán và trạng thái hóa đơn.',
    ],

    route:
      '/my-transactions',

    actionLabel:
      'Xem hóa đơn',
  },


  // =======================================================
  // PAYMENT
  // =======================================================

  {
    id:
      'PAYMENT',

    title:
      'Thanh toán hóa đơn',

    keywords: [
      'cách thanh toán',
      'thanh toán hóa đơn',
      'thanh toán vnpay',
      'cách thanh toán vnpay',
      'trả hóa đơn',
      'thanh toán giao dịch',
      'tôi muốn thanh toán',
    ],

    description:
      'Hệ thống hỗ trợ thanh toán các hóa đơn hợp lệ thông qua VNPay.',

    steps: [
      'Đăng nhập vào hệ thống.',
      'Mở Giao dịch của tôi.',
      'Chọn hóa đơn đang chờ thanh toán.',
      'Nhấn Thanh toán.',
      'Hệ thống chuyển bạn sang VNPay.',
      'Hoàn tất thanh toán theo hướng dẫn của VNPay.',
      'Quay lại hệ thống và kiểm tra trạng thái hóa đơn.',
    ],

    route:
      '/my-transactions',

    actionLabel:
      'Đi đến giao dịch',
  },


  // =======================================================
  // UPGRADE AGENT
  // =======================================================

  {
    id:
      'UPGRADE_AGENT',

    title:
      'Nâng cấp tài khoản môi giới',

    keywords: [
      'nâng cấp môi giới',
      'nâng cấp tài khoản môi giới',
      'trở thành môi giới',
      'đăng ký môi giới',
      'nâng cấp agent',
      'tôi muốn thành môi giới',
    ],

    description:
      'Bạn có thể sử dụng chức năng nâng cấp tài khoản môi giới của hệ thống.',

    steps: [
      'Đăng nhập vào tài khoản.',
      'Mở chức năng nâng cấp môi giới.',
      'Kiểm tra thông tin gói nâng cấp.',
      'Chọn Thanh toán.',
      'Hoàn tất thanh toán qua VNPay.',
      'Kiểm tra lại quyền tài khoản sau khi thanh toán thành công.',
    ],
  },


  // =======================================================
  // THEME
  // =======================================================

  {
    id:
      'THEME',

    title:
      'Đổi giao diện sáng hoặc tối',

    keywords: [
      'đổi giao diện sáng tối',
      'đổi chế độ sáng tối',
      'bật dark mode',
      'bật light mode',
      'chế độ tối',
      'chế độ sáng',
      'giao diện tối',
      'giao diện sáng',
      'đổi theme',
    ],

    description:
      'Website hỗ trợ thay đổi giữa giao diện sáng và tối.',

    steps: [
      'Tìm nút thay đổi giao diện trên thanh điều hướng.',
      'Nhấn nút để chuyển giữa chế độ sáng và tối.',
      'Hệ thống sẽ lưu lựa chọn giao diện trên trình duyệt.',
    ],
  },


  // =======================================================
  // AI
  // =======================================================

  {
    id:
      'AI_ASSISTANT',

    title:
      'Sử dụng Trợ lý AI',

    keywords: [
      'ai làm được gì',
      'trợ lý ai làm được gì',
      'chatbot làm được gì',
      'cách sử dụng ai',
      'cách dùng trợ lý ai',
      'hướng dẫn dùng ai',
    ],

    description:
      'Trợ lý AI hỗ trợ tìm bất động sản, tham khảo ngân sách và hướng dẫn sử dụng các chức năng của hệ thống.',

    steps: [
      'Mở Trợ lý AI ở góc màn hình.',
      'Nhập câu hỏi bằng tiếng Việt tự nhiên.',
      'Nếu tìm bất động sản, hãy cung cấp khu vực, ngân sách và diện tích nếu có.',
      'Nếu cần hướng dẫn, hãy nói rõ chức năng muốn thực hiện.',
      'Nhấn vào card bất động sản hoặc nút chức năng khi AI hiển thị.',
    ],
  },
];