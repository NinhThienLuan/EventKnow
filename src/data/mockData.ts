import { AIReport, CitationSource, EventRecord, RecentReportItem, SuggestionCard } from '../types';

export const MOCK_CITATIONS: Record<string, CitationSource> = {
  'EVT-2024-08': {
    id: 'EVT-2024-08',
    title: 'Báo cáo Tổng kết Diễn đàn Chuyên gia AI Việt Nam 2024',
    publisher: 'Bộ Khoa học & Công nghệ / VAST',
    publishDate: '15/07/2024',
    confidenceScore: 98,
    snippet: 'Hội thảo quy tụ hơn 450 chuyên gia hàng đầu từ Viện Hàn lâm KH&CN, VinAI, FPT Smart Cloud. Trọng tâm trao đổi gồm Hạ tầng Tính toán Quốc gia và LLM Tiếng Việt.',
    status: 'VERIFIED'
  },
  'VN-AI-CONF-01': {
    id: 'VN-AI-CONF-01',
    title: 'Hội nghị Quốc tế về AI & Học máy APAC 2024 (HaNoi AI Summit)',
    publisher: 'Hội Tin học Việt Nam (VAIP)',
    publishDate: '02/08/2024',
    confidenceScore: 95,
    snippet: 'Trích xuất dữ liệu chương trình: 18 phiên thảo luận chuyên sâu, 32 báo cáo khoa học xuất sắc về xử lý ngôn ngữ tự nhiên Tiếng Việt và Y tế thông minh.',
    status: 'VERIFIED'
  },
  'ORG-RES-99': {
    id: 'ORG-RES-99',
    title: 'Danh mục Viện Nghiên cứu & Trung tâm Trọng điểm Q3/2024',
    publisher: 'Cục Thông tin KH&CN Quốc gia',
    publishDate: '28/06/2024',
    confidenceScore: 92,
    snippet: 'Cập nhật cấu trúc tổ chức và danh sách nhân sự chủ chốt tham gia các đề tài cấp Nhà nước về Trí tuệ nhân tạo.',
    status: 'UPDATED'
  },
  'LOG-DEL-404': {
    id: 'LOG-DEL-404',
    title: 'Bản ghi Hội thảo Công nghệ Blockchain & AI Đông Nam Á (Đã hủy)',
    publisher: 'Hiệp hội Doanh nghiệp Công nghệ',
    publishDate: '10/05/2024',
    confidenceScore: 0,
    snippet: '[Bản ghi đã bị hủy tại nguồn] Sự kiện đã thông báo tạm ngưng tổ chức do thay đổi chính sách cấp phép địa phương.',
    status: 'DELETED_IN_SOURCE'
  },
  'APAC-EVENT-102': {
    id: 'APAC-EVENT-102',
    title: 'Báo cáo Tổng hợp Sự kiện Công nghệ Singapore - Việt Nam 2024',
    publisher: 'Enterprise Singapore & NIC',
    publishDate: '20/07/2024',
    confidenceScore: 96,
    snippet: 'Ký kết hợp tác chiến lược đầu tư 120 triệu USD cho trung tâm dữ liệu AI xanh tại Hòa Lạc.',
    status: 'VERIFIED'
  }
};

export const MOCK_EVENT_RECORDS: EventRecord[] = [
  {
    id: 'rec-1',
    code: 'EVT-2024-08',
    eventName: 'Diễn đàn Chuyên gia AI Việt Nam & LLM Tiếng Việt 2024',
    organizer: 'Bộ Khoa học & Công nghệ / Viện Hàn lâm',
    keySpeakers: ['GS.TS. Nguyễn Thanh Thủy', 'Dr. Lê Tấn Lộc', 'Đặng Hoàng Vũ'],
    eventDate: '15-17/07/2024',
    location: 'Trung tâm Hội nghị Quốc gia, Hà Nội',
    status: 'ACTIVE',
    citationId: 'EVT-2024-08',
    category: 'Chuyên gia AI'
  },
  {
    id: 'rec-2',
    code: 'VN-AI-CONF-01',
    eventName: 'Hội nghị Quốc tế APAC về Trí tuệ Nhân tạo và Ứng dụng Y tế',
    organizer: 'Hội Tin học Việt Nam (VAIP) & Bệnh viện ĐHYD',
    keySpeakers: ['Prof. Yoshua Bengio (Online)', 'PGS.TS. Trần Minh Triết'],
    eventDate: '02-04/08/2024',
    location: 'Khách sạn JW Marriott, Hà Nội',
    status: 'ACTIVE',
    citationId: 'VN-AI-CONF-01',
    category: 'Sự kiện APAC'
  },
  {
    id: 'rec-3',
    code: 'ORG-RES-99',
    eventName: 'Tọa đàm Rà soát Trùng lặp Dữ liệu & Xử lý Tri thức Ngôn ngữ',
    organizer: 'Cục Thông tin KH&CN Quốc gia',
    keySpeakers: ['TS. Nguyễn Thị Minh Huyền', 'KS. Hoàng Văn Nam'],
    eventDate: '28/06/2024',
    location: 'Viện Công nghệ Thông tin - VAST',
    status: 'ACTIVE',
    citationId: 'ORG-RES-99',
    category: 'Xử lý dữ liệu Q3'
  },
  {
    id: 'rec-4',
    code: 'LOG-DEL-404',
    eventName: 'Hội thảo Công nghệ Blockchain & AI Đông Nam Á (Đã bãi bỏ)',
    organizer: 'Liên minh Tech SEA (Đã rút giấy phép)',
    keySpeakers: ['[Dữ liệu đã xóa tại nguồn]'],
    eventDate: '10/05/2024',
    location: 'Trung tâm Triển lãm SECC, TP.HCM',
    status: 'DELETED_IN_SOURCE',
    citationId: 'LOG-DEL-404',
    category: 'Ghi chú nguồn'
  },
  {
    id: 'rec-5',
    code: 'APAC-EVENT-102',
    eventName: 'Diễn đàn Đầu tư Hạ tầng Tính toán Xanh Singapore - Việt Nam',
    organizer: 'Enterprise Singapore & Trung tâm Đổi mới sáng tạo (NIC)',
    keySpeakers: ['Ông Vũ Quốc Huy', 'Mr. Tan Kok Yam'],
    eventDate: '20/07/2024',
    location: 'Đô thị Sáng tạo Hòa Lạc, Hà Nội',
    status: 'ACTIVE',
    citationId: 'APAC-EVENT-102',
    category: 'Hội thảo Hạ tầng'
  }
];

export const MOCK_REPORTS: Record<string, AIReport> = {
  'report-1': {
    id: 'report-1',
    title: 'Phân tích xu hướng chuyên gia AI 2024 tại các hội thảo công nghệ',
    queryPrompt: 'Phân tích xu hướng chuyên gia AI 2024 tại các hội thảo công nghệ',
    timestamp: '10/08/2026 - 05:30:12',
    author: 'EventKnow AI Engine v3.2',
    sourcesUsed: 4,
    summaryParagraphs: [
      'Qua việc tổng hợp dữ liệu từ các chuỗi sự kiện công nghệ trọng điểm trong năm 2024 [EVT-2024-08], bức tranh về xu hướng tham gia của các chuyên gia Trí tuệ Nhân tạo tại Việt Nam cho thấy sự dịch chuyển rõ rệt từ nghiên cứu lý thuyết sang triển khai mô hình ngôn ngữ lớn (LLM) bản địa hóa và hạ tầng tính toán xanh.',
      'Sự kết nối giữa Viện Hàn lâm KH&CN cùng các doanh nghiệp công nghệ lớn đã tạo ra bước đứt phá trong ứng dụng AI vào y tế và quản trị tri thức [VN-AI-CONF-01]. Tuy nhiên, công tác kiểm tra nguồn trích xuất cũng ghi nhận một số hội thảo thử nghiệm bị hủy bỏ hoặc bãi bỏ thông tin khỏi hệ thống chính thức [LOG-DEL-404].'
    ],
    citations: MOCK_CITATIONS,
    tableData: MOCK_EVENT_RECORDS,
    relatedNodes: [
      { id: 'node-1', name: 'Bộ Khoa học & Công nghệ', type: 'ORGANIZER', connectionsCount: 14 },
      { id: 'node-2', name: 'GS.TS. Nguyễn Thanh Thủy', type: 'SPEAKER', connectionsCount: 8 },
      { id: 'node-3', name: 'LLM Tiếng Việt Quốc Gia', type: 'REPORT', connectionsCount: 22 },
      { id: 'node-4', name: 'Viện Hàn Lâm KH&CN (VAST)', type: 'ORGANIZER', connectionsCount: 19 },
      { id: 'node-5', name: 'Hội thảo Blockchain & AI (Đã xóa)', type: 'SOURCE', connectionsCount: 2 }
    ],
    relatedLinks: [
      { source: 'node-1', target: 'node-2', relation: 'Chủ trì tư vấn' },
      { source: 'node-2', target: 'node-3', relation: 'Tác giả định hướng' },
      { source: 'node-1', target: 'node-4', relation: 'Đơn vị phối hợp' },
      { source: 'node-3', target: 'node-4', relation: 'Thử nghiệm phòng lab' }
    ],
    keyInsights: [
      'Gần 78% các chuyên gia đề xuất tập trung nguồn lực phát triển LLM Tiếng Việt bảo mật cao.',
      'Đã liên kết thành công 5 nguồn dữ liệu lớn với 1 bản ghi bị hủy bỏ từ nguồn gốc [LOG-DEL-404].',
      'Định hướng Q4/2024: Tăng cường rà soát chuẩn hóa trùng lặp dữ liệu đơn vị tổ chức.'
    ]
  },
  'report-2': {
    id: 'report-2',
    title: 'Kiểm tra và rà soát trùng lặp dữ liệu tổ chức Q3',
    queryPrompt: 'Kiểm tra và rà soát trùng lặp dữ liệu tổ chức Q3',
    timestamp: '09/08/2026 - 18:15:00',
    author: 'EventKnow AI Engine v3.2',
    sourcesUsed: 3,
    summaryParagraphs: [
      'Hệ thống rà soát tri thức tự động đã phát hiện 12 điểm trùng lặp tên gọi đơn vị tổ chức giữa Cục Thông tin KH&CN và các hội thảo chuyên đề Châu Á [ORG-RES-99].',
      'Việc chuẩn hóa tên gọi các Viện nghiên cứu giúp tăng độ chính xác tìm kiếm mã định danh và trích xuất lý lịch chuyên gia lên 99.4%.'
    ],
    citations: MOCK_CITATIONS,
    tableData: MOCK_EVENT_RECORDS.filter(r => r.category === 'Xử lý dữ liệu Q3' || r.category === 'Chuyên gia AI'),
    relatedNodes: [
      { id: 'node-1', name: 'Cục Thông tin KH&CN Quốc gia', type: 'ORGANIZER', connectionsCount: 11 },
      { id: 'node-3', name: 'Chuẩn hóa định danh Q3', type: 'REPORT', connectionsCount: 15 }
    ],
    relatedLinks: [
      { source: 'node-1', target: 'node-3', relation: 'Phê duyệt cấu trúc' }
    ],
    keyInsights: [
      'Phát hiện 12 trường hợp trùng tên gọi viết tắt giữa các viện nghiên cứu.',
      'Khuyến nghị tự động gán mã UUID cho toàn bộ thực thể tổ chức.'
    ]
  },
  'report-3': {
    id: 'report-3',
    title: 'Tóm tắt các sự kiện trọng điểm khu vực Châu Á Thái Bình Dương',
    queryPrompt: 'Tóm tắt các sự kiện trọng điểm khu vực Châu Á Thái Bình Dương',
    timestamp: '08/08/2026 - 11:40:22',
    author: 'EventKnow AI Engine v3.2',
    sourcesUsed: 5,
    summaryParagraphs: [
      'Khu vực Châu Á Thái Bình Dương chứng kiến chuỗi 18 hội thảo chiến lược về bán dẫn và AI xanh [APAC-EVENT-102].',
      'Việt Nam tiếp tục là điểm đến thu hút các diễn đàn hợp tác quốc tế nhờ sự sẵn sàng về hạ tầng nhân lực và các ưu đãi chính sách mới [VN-AI-CONF-01].'
    ],
    citations: MOCK_CITATIONS,
    tableData: MOCK_EVENT_RECORDS.filter(r => r.category === 'Sự kiện APAC' || r.category === 'Hội thảo Hạ tầng'),
    relatedNodes: [
      { id: 'node-10', name: 'Enterprise Singapore', type: 'ORGANIZER', connectionsCount: 9 },
      { id: 'node-11', name: 'NIC Hòa Lạc', type: 'ORGANIZER', connectionsCount: 16 }
    ],
    relatedLinks: [
      { source: 'node-10', target: 'node-11', relation: 'Đối tác chiến lược' }
    ],
    keyInsights: [
      'Cam kết đầu tư hạ tầng dữ liệu xanh đạt 120 triệu USD.',
      'Gia tăng 35% số lượng diễn giả quốc tế đăng ký trực tiếp.'
    ]
  }
};

export const RECENT_REPORTS_LIST: RecentReportItem[] = [
  {
    id: 'report-1',
    title: 'Tổng hợp nguồn lực AI tại Việt Nam 2024',
    editedTime: 'Chỉnh sửa 2 giờ trước',
    iconType: 'document',
    previewText: 'Báo cáo chi tiết các đề tài cấp Nhà nước, nhân sự chủ chốt và phòng lab trọng điểm',
    sourceCount: 4
  },
  {
    id: 'report-2',
    title: 'Cây tổ chức - Viện Hàn lâm KH&CN Việt Nam',
    editedTime: 'Hôm qua, 14:30',
    iconType: 'tree',
    previewText: 'Cập nhật sơ đồ các Viện chuyên ngành và hội đồng khoa học trực thuộc Q3',
    sourceCount: 3
  },
  {
    id: 'report-3',
    title: 'Log trích xuất hàng loạt dữ liệu hội thảo APAC',
    editedTime: '3 ngày trước',
    iconType: 'chart',
    previewText: 'Nhật ký quét tự động 150 trang tin điện tử chính thống ngành khoa học công nghệ',
    sourceCount: 8
  }
];

export const SUGGESTION_CARDS: SuggestionCard[] = [
  {
    id: 'card-1',
    title: 'Phân tích xu hướng chuyên gia AI 2024 tại các hội thảo công nghệ',
    category: 'Chuyên gia AI',
    sourcesCount: 4,
    featured: true
  },
  {
    id: 'card-2',
    title: 'Kiểm tra và rà soát trùng lặp dữ liệu tổ chức Q3',
    category: 'Quản trị Dữ liệu',
    sourcesCount: 3
  },
  {
    id: 'card-3',
    title: 'Tóm tắt các sự kiện trọng điểm khu vực Châu Á Thái Bình Dương',
    category: 'Sự kiện APAC',
    sourcesCount: 5
  },
  {
    id: 'card-4',
    title: 'Đánh giá độ tin cậy của các nguồn trích xuất mới tháng này',
    category: 'Đánh giá Nguồn',
    sourcesCount: 6
  }
];
