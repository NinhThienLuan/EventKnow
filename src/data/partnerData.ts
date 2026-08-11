export interface AttendeeProfile {
  id: string;
  fullName: string;
  normalizedName: string;
  email: string;
  phone: string;
  academicTitleRaw: string;
  academicTitleNormalized: ('GS' | 'PGS' | 'TS' | 'ThS' | 'KS' | 'CN')[];
  attendeeRole: 'SPEAKER' | 'EXPERT' | 'GUEST' | 'SPONSOR';
  position: string;
  organizationId?: string;
  organizationName: string;
  followUpStatus: 'CHUA_LIEN_HE' | 'DA_LIEN_HE' | 'DANG_HOP_TAC' | 'TU_CHOI';
  dynamicAttributes: Record<string, string>;
  sourceSheets: {
    sheetName: string;
    fileName: string;
    driveFileId: string;
    eventName: string;
    eventDate: string;
    roleInEvent: string;
    attendanceStatus: 'CONFIRMED' | 'ATTENDED' | 'ABSENT';
  }[];
  notes: {
    id: string;
    noteText: string;
    createdByEmail: string;
    createdAt: string;
  }[];
}

export interface OrganizationProfile {
  id: string;
  orgName: string;
  normalizedName: string;
  emailDomain: string;
  category: 'RESEARCH_INSTITUTE' | 'UNIVERSITY' | 'TECH_ENTERPRISE' | 'GOVERNMENT' | 'INTERNATIONAL';
  address: string;
  website: string;
  dynamicAttributes: Record<string, string>;
  memberCount: number;
  eventsCount: number;
  sourceSheets: {
    sheetName: string;
    fileName: string;
    eventName: string;
    eventDate: string;
    contributionRole: string; // e.g., 'Đơn vị Chủ trì', 'Nhà tài trợ Kim Cương', 'Đơn vị Đồng tổ chức'
  }[];
  notes: {
    id: string;
    noteText: string;
    createdByEmail: string;
    createdAt: string;
  }[];
}

export const MOCK_ATTENDEE_PROFILES: AttendeeProfile[] = [
  {
    id: 'att-001',
    fullName: 'GS.TS. Nguyễn Thanh Thủy',
    normalizedName: 'nguyen thanh thuy',
    email: 'thuy.nt@vast.vn',
    phone: '0913.234.xxx',
    academicTitleRaw: 'GS.TS',
    academicTitleNormalized: ['GS', 'TS'],
    attendeeRole: 'SPEAKER',
    position: 'Chủ tịch Hội đồng Khoa học / Nguyên Viện trưởng',
    organizationId: 'org-001',
    organizationName: 'Viện Công nghệ Thông tin - VAST',
    followUpStatus: 'DANG_HOP_TAC',
    dynamicAttributes: {
      'Chuyên môn chính': 'Trí tuệ nhân tạo, Xử lý ngôn ngữ tự nhiên, Big Data',
      'Đề tài cấp Nhà nước': 'Chủ nhiệm Đề tài LLM Tiếng Việt 2023-2025',
      'Thành tựu nổi bật': 'Giải thưởng Hồ Chí Minh về KH&CN',
      'Số bài báo ISI/Scopus': '145+'
    },
    sourceSheets: [
      {
        sheetName: 'DanhSach_Diengia',
        fileName: 'HoiThao_AI_2024.xlsx',
        driveFileId: 'drv-sheet-001',
        eventName: 'Diễn đàn Chuyên gia AI Việt Nam & LLM Tiếng Việt 2024',
        eventDate: '15/07/2024',
        roleInEvent: 'Báo cáo viên Keynote Session 1',
        attendanceStatus: 'ATTENDED'
      },
      {
        sheetName: 'Hoidong_Khuyencao',
        fileName: 'DienDan_BanDan_Q3.xlsx',
        driveFileId: 'drv-sheet-002',
        eventName: 'Tọa đàm Rà soát Trùng lặp Dữ liệu & Xử lý Tri thức Ngôn ngữ',
        eventDate: '28/06/2024',
        roleInEvent: 'Chủ trì phiên tư vấn',
        attendanceStatus: 'ATTENDED'
      }
    ],
    notes: [
      {
        id: 'n-1',
        noteText: 'Thầy Thủy đồng ý chủ trì phiên thảo luận Bán dẫn Q4/2024. Cần gửi thư mời chính thức trước ngày 15/09.',
        createdByEmail: 'admin.know@eventknow.gov.vn',
        createdAt: '10/08/2026 14:30'
      },
      {
        id: 'n-2',
        noteText: 'Đã hoàn tất xác nhận slide trình bày chủ đề LLM Tiếng Việt.',
        createdByEmail: 'luanninh2005@gmail.com',
        createdAt: '01/08/2026 09:15'
      }
    ]
  },
  {
    id: 'att-002',
    fullName: 'PGS.TS. Trần Minh Triết',
    normalizedName: 'tran minh triet',
    email: 'tmtriet@fit.hcmus.edu.vn',
    phone: '0908.112.xxx',
    academicTitleRaw: 'PGS.TS',
    academicTitleNormalized: ['PGS', 'TS'],
    attendeeRole: 'SPEAKER',
    position: 'Phó Hiệu trưởng / Trưởng Khoa CNTT',
    organizationId: 'org-002',
    organizationName: 'Trường Đại học Khoa học Tự nhiên TP.HCM (HCMUS)',
    followUpStatus: 'DA_LIEN_HE',
    dynamicAttributes: {
      'Chuyên môn chính': 'Thị giác máy tính, Bảo mật AI, AI trong Y tế',
      'Đơn vị liên kết': 'Lab AI & Thị giác máy tính HCMUS',
      'Vùng địa lý': 'TP. Hồ Chí Minh'
    },
    sourceSheets: [
      {
        sheetName: 'Ban_Co_Van',
        fileName: 'HoiNghi_YTe_AI_APAC.xlsx',
        driveFileId: 'drv-sheet-003',
        eventName: 'Hội nghị Quốc tế APAC về Trí tuệ Nhân tạo và Ứng dụng Y tế',
        eventDate: '02/08/2024',
        roleInEvent: 'Diễn giả phiên Chẩn đoán hình ảnh',
        attendanceStatus: 'ATTENDED'
      }
    ],
    notes: [
      {
        id: 'n-3',
        noteText: 'Đã gửi email đề xuất phối hợp tổ chức Hackathon AI Y tế tại Cơ sở 2 Thủ Đức.',
        createdByEmail: 'admin.know@eventknow.gov.vn',
        createdAt: '05/08/2026 16:20'
      }
    ]
  },
  {
    id: 'att-003',
    fullName: 'TS. Lê Tấn Lộc',
    normalizedName: 'le tan loc',
    email: 'loc.le@vinai.io',
    phone: '0989.445.xxx',
    academicTitleRaw: 'TS',
    academicTitleNormalized: ['TS'],
    attendeeRole: 'EXPERT',
    position: 'Trưởng nhóm Nghiên cứu LLM',
    organizationId: 'org-003',
    organizationName: 'VinAI Research',
    followUpStatus: 'DANG_HOP_TAC',
    dynamicAttributes: {
      'Chuyên môn chính': 'Generative AI, Model Fine-tuning, GPU Cluster Optimization',
      'Kinh nghiệm công tác': 'Nguyên Senior Researcher tại Google DeepMind London',
      'Thành tựu': 'Đóng góp chính cho mô hình PhởGPT open-source'
    },
    sourceSheets: [
      {
        sheetName: 'DanhSach_Diengia',
        fileName: 'HoiThao_AI_2024.xlsx',
        driveFileId: 'drv-sheet-001',
        eventName: 'Diễn đàn Chuyên gia AI Việt Nam & LLM Tiếng Việt 2024',
        eventDate: '15/07/2024',
        roleInEvent: 'Chuyên gia tranh luận Panel 2',
        attendanceStatus: 'ATTENDED'
      }
    ],
    notes: [
      {
        id: 'n-4',
        noteText: 'VinAI sẵn sàng chia sẻ hạ tầng thử nghiệm PhởGPT cho các nhóm nghiên cứu viện hàn lâm.',
        createdByEmail: 'luanninh2005@gmail.com',
        createdAt: '02/08/2026 11:00'
      }
    ]
  },
  {
    id: 'att-004',
    fullName: 'ThS. Nguyễn Thị Minh Huyền',
    normalizedName: 'nguyen thi minh huyen',
    email: 'huyen.ntm@vista.gov.vn',
    phone: '0912.889.xxx',
    academicTitleRaw: 'ThS',
    academicTitleNormalized: ['ThS'],
    attendeeRole: 'GUEST',
    position: 'Trưởng phòng Thông tin & Thư viện Số',
    organizationId: 'org-004',
    organizationName: 'Cục Thông tin Khoa học & Công nghệ Quốc gia',
    followUpStatus: 'CHUA_LIEN_HE',
    dynamicAttributes: {
      'Lĩnh vực phụ trách': 'Cơ sở dữ liệu trích dẫn Quốc gia, Mã định danh DOI',
      'Cơ quan chủ quản': 'Bộ Khoa học và Công nghệ'
    },
    sourceSheets: [
      {
        sheetName: 'DanhSach_DaiBieu',
        fileName: 'ToaDam_Chuandhoa_Q3.xlsx',
        driveFileId: 'drv-sheet-004',
        eventName: 'Tọa đàm Rà soát Trùng lặp Dữ liệu & Xử lý Tri thức Ngôn ngữ',
        eventDate: '28/06/2024',
        roleInEvent: 'Khách mời đại biểu',
        attendanceStatus: 'ATTENDED'
      }
    ],
    notes: []
  },
  {
    id: 'att-005',
    fullName: 'Ông Vũ Quốc Huy',
    normalizedName: 'vu quoc huy',
    email: 'huy.vq@nic.gov.vn',
    phone: '0903.667.xxx',
    academicTitleRaw: 'KS',
    academicTitleNormalized: ['KS'],
    attendeeRole: 'SPONSOR',
    position: 'Giám đốc',
    organizationId: 'org-005',
    organizationName: 'Trung tâm Đổi mới Sáng tạo Quốc gia (NIC)',
    followUpStatus: 'DANG_HOP_TAC',
    dynamicAttributes: {
      'Lĩnh vực hoạt động': 'Hệ sinh thái Đổi mới sáng tạo, Ươm tạo Khởi nghiệp AI',
      'Trụ sở làm việc': 'Cơ sở NIC Hòa Lạc & Cơ sở NIC Tôn Thất Thuyết'
    },
    sourceSheets: [
      {
        sheetName: 'Ban_To_Chuc',
        fileName: 'DienDan_DauTu_APAC.xlsx',
        driveFileId: 'drv-sheet-005',
        eventName: 'Diễn đàn Đầu tư Hạ tầng Tính toán Xanh Singapore - Việt Nam',
        eventDate: '20/07/2024',
        roleInEvent: 'Đại diện Đơn vị Đồng tổ chức',
        attendanceStatus: 'ATTENDED'
      }
    ],
    notes: [
      {
        id: 'n-5',
        noteText: 'NIC tài trợ địa điểm hội trường 500 chỗ tại Hòa Lạc cho Diễn đàn Toàn quốc tháng 11/2026.',
        createdByEmail: 'admin.know@eventknow.gov.vn',
        createdAt: '08/08/2026 15:45'
      }
    ]
  },
  {
    id: 'att-006',
    fullName: 'Mr. Tan Kok Yam',
    normalizedName: 'tan kok yam',
    email: 'tan_kok_yam@enterprisesg.gov.sg',
    phone: '+65.6898.xxxx',
    academicTitleRaw: 'MSc',
    academicTitleNormalized: ['ThS'],
    attendeeRole: 'SPONSOR',
    position: 'Chief Executive Officer',
    organizationId: 'org-006',
    organizationName: 'Enterprise Singapore (ESG)',
    followUpStatus: 'DA_LIEN_HE',
    dynamicAttributes: {
      'Quốc gia': 'Singapore',
      'Lĩnh vực đầu tư': 'Green Data Center, Venture Capital, Cross-border Tech Alliance'
    },
    sourceSheets: [
      {
        sheetName: 'Doi_Tac_Quoc_Te',
        fileName: 'DienDan_DauTu_APAC.xlsx',
        driveFileId: 'drv-sheet-005',
        eventName: 'Diễn đàn Đầu tư Hạ tầng Tính toán Xanh Singapore - Việt Nam',
        eventDate: '20/07/2024',
        roleInEvent: 'Trưởng đoàn Doanh nghiệp Singapore',
        attendanceStatus: 'ATTENDED'
      }
    ],
    notes: []
  }
];

export const MOCK_ORGANIZATION_PROFILES: OrganizationProfile[] = [
  {
    id: 'org-001',
    orgName: 'Viện Công nghệ Thông tin - VAST',
    normalizedName: 'vien cong nghe thong tin vast',
    emailDomain: 'vast.vn',
    category: 'RESEARCH_INSTITUTE',
    address: 'Nhà A6, 18 Hoàng Quốc Việt, Cầu Giấy, Hà Nội',
    website: 'https://ioit.ac.vn',
    dynamicAttributes: {
      'Cơ quan chủ quản': 'Viện Hàn lâm Khoa học và Công nghệ Việt Nam',
      'Số lượng Phòng chuyên môn': '12 phòng thí nghiệm trọng điểm',
      'Lĩnh vực nghiên cứu mũi nhọn': 'AI, An toàn thông tin, Hệ thống nhúng, Công nghệ Phần mềm'
    },
    memberCount: 24,
    eventsCount: 8,
    sourceSheets: [
      {
        sheetName: 'ToChuc_ChuTri',
        fileName: 'HoiThao_AI_2024.xlsx',
        eventName: 'Diễn đàn Chuyên gia AI Việt Nam & LLM Tiếng Việt 2024',
        eventDate: '15/07/2024',
        contributionRole: 'Đơn vị Chủ trì Chuyên môn'
      },
      {
        sheetName: 'ToChuc_ChuTri',
        fileName: 'ToaDam_Chuandhoa_Q3.xlsx',
        eventName: 'Tọa đàm Rà soát Trùng lặp Dữ liệu & Xử lý Tri thức Ngôn ngữ',
        eventDate: '28/06/2024',
        contributionRole: 'Đơn vị Đăng cai Địa điểm'
      }
    ],
    notes: [
      {
        id: 'on-1',
        noteText: 'MOU hợp tác chia sẻ dữ liệu nghiên cứu khoa học mở ký kết vào tháng 05/2024.',
        createdByEmail: 'admin.know@eventknow.gov.vn',
        createdAt: '01/06/2026 10:00'
      }
    ]
  },
  {
    id: 'org-002',
    orgName: 'Trường Đại học Khoa học Tự nhiên TP.HCM (HCMUS)',
    normalizedName: 'truong dai hoc khoa hoc tu nhien tphcm hcmus',
    emailDomain: 'hcmus.edu.vn',
    category: 'UNIVERSITY',
    address: '227 Nguyễn Văn Cừ, Phường 4, Quận 5, TP.HCM',
    website: 'https://hcmus.edu.vn',
    dynamicAttributes: {
      'Trực thuộc': 'Đại học Quốc gia TP.Hồ Chí Minh',
      'Xếp hạng nghiên cứu': 'Top 3 trường Đại học Khoa học Cơ bản tại Việt Nam'
    },
    memberCount: 18,
    eventsCount: 5,
    sourceSheets: [
      {
        sheetName: 'Doi_Tac_Dong_To_Chuc',
        fileName: 'HoiNghi_YTe_AI_APAC.xlsx',
        eventName: 'Hội nghị Quốc tế APAC về Trí tuệ Nhân tạo và Ứng dụng Y tế',
        eventDate: '02/08/2024',
        contributionRole: 'Đơn vị Đồng tổ chức Hướng Chuyên môn'
      }
    ],
    notes: []
  },
  {
    id: 'org-003',
    orgName: 'VinAI Research (Công ty Cổ phần Nghiên cứu AI)',
    normalizedName: 'vinai research cong ty co phan nghiên cuu ai',
    emailDomain: 'vinai.io',
    category: 'TECH_ENTERPRISE',
    address: 'Tòa Symphony, Vinhomes Riverside, Long Biên, Hà Nội',
    website: 'https://vinai.io',
    dynamicAttributes: {
      'Lĩnh vực kinh doanh': 'Nghiên cứu & Phát triển Trí tuệ nhân tạo công nghệ cao',
      'Thuộc Tập đoàn': 'Vingroup'
    },
    memberCount: 15,
    eventsCount: 6,
    sourceSheets: [
      {
        sheetName: 'Nha_Tai_Tro',
        fileName: 'HoiThao_AI_2024.xlsx',
        eventName: 'Diễn đàn Chuyên gia AI Việt Nam & LLM Tiếng Việt 2024',
        eventDate: '15/07/2024',
        contributionRole: 'Nhà tài trợ Bạch Kim'
      }
    ],
    notes: [
      {
        id: 'on-2',
        noteText: 'VinAI cam kết tài trợ kinh phí 500 triệu VNĐ cho các hội thảo khoa học sinh viên 2026.',
        createdByEmail: 'luanninh2005@gmail.com',
        createdAt: '04/08/2026 14:10'
      }
    ]
  },
  {
    id: 'org-004',
    orgName: 'Cục Thông tin Khoa học & Công nghệ Quốc gia',
    normalizedName: 'cuc thong tin khoa hoc va cong nghe quoc gia',
    emailDomain: 'vista.gov.vn',
    category: 'GOVERNMENT',
    address: '24 Lý Thường Kiệt, Hoàn Kiếm, Hà Nội',
    website: 'https://vista.gov.vn',
    dynamicAttributes: {
      'Cơ quan quản lý': 'Bộ Khoa học và Công nghệ',
      'Cổng thông tin': 'Cơ sở dữ liệu Quốc gia về Khoa học và Công nghệ'
    },
    memberCount: 9,
    eventsCount: 4,
    sourceSheets: [
      {
        sheetName: 'Co_Quan_Chu_Quan',
        fileName: 'ToaDam_Chuandhoa_Q3.xlsx',
        eventName: 'Tọa đàm Rà soát Trùng lặp Dữ liệu & Xử lý Tri thức Ngôn ngữ',
        eventDate: '28/06/2024',
        contributionRole: 'Cơ quan Chỉ đạo'
      }
    ],
    notes: []
  },
  {
    id: 'org-005',
    orgName: 'Trung tâm Đổi mới Sáng tạo Quốc gia (NIC)',
    normalizedName: 'trung tam doi moi sang tao quoc gia nic',
    emailDomain: 'nic.gov.vn',
    category: 'GOVERNMENT',
    address: 'Khu công nghệ cao Hòa Lạc, Thạch Thất, Hà Nội',
    website: 'https://nic.gov.vn',
    dynamicAttributes: {
      'Trực thuộc': 'Bộ Kế hoạch và Đầu tư',
      'Nhiệm vụ chiến lược': 'Phát triển 8 ngành công nghệ trọng tâm (Chip/Bán dẫn, AI, Green Tech...)'
    },
    memberCount: 32,
    eventsCount: 12,
    sourceSheets: [
      {
        sheetName: 'Ban_To_Chuc',
        fileName: 'DienDan_DauTu_APAC.xlsx',
        eventName: 'Diễn đàn Đầu tư Hạ tầng Tính toán Xanh Singapore - Việt Nam',
        eventDate: '20/07/2024',
        contributionRole: 'Đơn vị Chủ trì Địa điểm & Kết nối Đầu tư'
      }
    ],
    notes: []
  },
  {
    id: 'org-006',
    orgName: 'Enterprise Singapore (ESG)',
    normalizedName: 'enterprise singapore esg',
    emailDomain: 'enterprisesg.gov.sg',
    category: 'INTERNATIONAL',
    address: '230 Victoria Street, Bugis Junction, Singapore',
    website: 'https://enterprisesg.gov.sg',
    dynamicAttributes: {
      'Phân loại': 'Cơ quan Chính phủ Singapore phát triển Doanh nghiệp',
      'Văn phòng đại diện': 'Khách sạn Melia, Hà Nội & Deutsches Haus, TP.HCM'
    },
    memberCount: 11,
    eventsCount: 3,
    sourceSheets: [
      {
        sheetName: 'Ban_To_Chuc_Quoc_Te',
        fileName: 'DienDan_DauTu_APAC.xlsx',
        eventName: 'Diễn đàn Đầu tư Hạ tầng Tính toán Xanh Singapore - Việt Nam',
        eventDate: '20/07/2024',
        contributionRole: 'Đơn vị Đồng tổ chức Quốc tế'
      }
    ],
    notes: []
  }
];
