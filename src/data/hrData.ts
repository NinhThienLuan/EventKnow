export interface Department {
  id: string;
  code: string; // e.g., 'KHCN', 'HTQT', 'KHTC', 'CNTT', 'TCCB'
  name: string;
  folderId: string;
  folderPath: string;
  description: string;
  createdDate: string;
  headOfDeptEmail: string;
  memberCount: number;
  fileCount: number;
}

export interface DepartmentMember {
  id: string;
  fullName: string;
  email: string;
  primaryDepartmentCode: string;
  allowedDepartmentCodes: string[]; // List of department codes this member can view
  deptRole: 'TRUONG_BAN' | 'PHO_BAN' | 'CHUYEN_VIEN';
  isAppAdmin: boolean;
  status: 'ACTIVE' | 'SUSPENDED';
  joinedDate: string;
  notes?: string;
}

export const MOCK_DEPARTMENTS: Department[] = [
  {
    id: 'dept-bod',
    code: 'SIHUB_BOD',
    name: 'Ban Giám đốc',
    folderId: 'folder-bod',
    folderPath: '/Shared Drive/EventKnow/Ban_Giam_Doc',
    description: 'Chi đạo điều hành chung và lập kế hoạch chiến lược phát triển SIHUB',
    createdDate: '15/01/2026',
    headOfDeptEmail: 'bod_head@eventknow.gov.vn',
    memberCount: 3,
    fileCount: 5
  },
  {
    id: 'dept-admin',
    code: 'SIHUB_ADMIN',
    name: 'Phòng Hành chính - Quản trị',
    folderId: 'folder-admin',
    folderPath: '/Shared Drive/EventKnow/Hanh_Chinh_Quan_Tri',
    description: 'Phụ trách công tác hành chính, quản trị thiết bị văn phòng, văn thư và lưu trữ tài liệu',
    createdDate: '15/01/2026',
    headOfDeptEmail: 'admin_head@eventknow.gov.vn',
    memberCount: 6,
    fileCount: 12
  },
  {
    id: 'dept-fin',
    code: 'SIHUB_FIN',
    name: 'Phòng Kế hoạch - Tài chính',
    folderId: 'folder-fin',
    folderPath: '/Shared Drive/EventKnow/Ke_Hoach_Tai_Chinh',
    description: 'Quản lý tài chính, kinh phí tổ chức sự kiện, hợp lý hóa ngân sách và tài trợ',
    createdDate: '20/01/2026',
    headOfDeptEmail: 'khtc_head@eventknow.gov.vn',
    memberCount: 5,
    fileCount: 11
  },
  {
    id: 'dept-incubation',
    code: 'SIHUB_INCUBATION',
    name: 'Phòng Ươm tạo & Khởi nghiệp',
    folderId: 'folder-incubation',
    folderPath: '/Shared Drive/EventKnow/Uom_Tao_Khoi_Nghiep',
    description: 'Tổ chức các chương trình ươm tạo doanh nghiệp khởi nghiệp đổi mới sáng tạo',
    createdDate: '18/01/2026',
    headOfDeptEmail: 'startup_head@eventknow.gov.vn',
    memberCount: 10,
    fileCount: 18
  },
  {
    id: 'dept-partnership',
    code: 'SIHUB_PARTNERSHIP',
    name: 'Phòng Hợp tác Quốc tế & Mạng lưới',
    folderId: 'folder-partnership',
    folderPath: '/Shared Drive/EventKnow/Hop_Tac_Quoc_Te',
    description: 'Kết nối mạng lưới đối tác trong và ngoài nước, ký kết thỏa thuận hợp tác MOU',
    createdDate: '18/01/2026',
    headOfDeptEmail: 'htqt_head@eventknow.gov.vn',
    memberCount: 6,
    fileCount: 9
  },
  {
    id: 'dept-training',
    code: 'SIHUB_TRAINING',
    name: 'Phòng Đào tạo & Nâng cao Năng lực',
    folderId: 'folder-training',
    folderPath: '/Shared Drive/EventKnow/Dao_Tao_Nang_Luc',
    description: 'Đào tạo huấn luyện kỹ năng khởi nghiệp và chuyển giao công nghệ cho doanh nghiệp',
    createdDate: '10/01/2026',
    headOfDeptEmail: 'training_head@eventknow.gov.vn',
    memberCount: 4,
    fileCount: 6
  },
  {
    id: 'dept-media',
    code: 'SIHUB_MEDIA',
    name: 'Phòng Truyền thông & Sự kiện',
    folderId: 'folder-media',
    folderPath: '/Shared Drive/EventKnow/Truyen_Thong_Su_Kien',
    description: 'Truyền thông đại chúng, quan hệ công chúng PR, thiết kế quảng bá sự kiện SIHUB',
    createdDate: '10/01/2026',
    headOfDeptEmail: 'cntt_head@eventknow.gov.vn',
    memberCount: 7,
    fileCount: 8
  },
  {
    id: 'dept-tech-transfer',
    code: 'SIHUB_TECH_TRANSFER',
    name: 'Phòng ĐMST & Chuyển giao Công nghệ',
    folderId: 'folder-tech-transfer',
    folderPath: '/Shared Drive/EventKnow/Chuyen_Giao_Cong_Nghe',
    description: 'Chủ trì đề tài khoa học công nghệ, thẩm định giải pháp AI/Bán dẫn và chuyển giao ứng dụng công nghệ',
    createdDate: '15/01/2026',
    headOfDeptEmail: 'khcn_head@eventknow.gov.vn',
    memberCount: 8,
    fileCount: 14
  }
];

export const MOCK_DEPARTMENT_MEMBERS: DepartmentMember[] = [
  {
    id: 'mem-001',
    fullName: 'Luân Ninh (Chủ sở hữu hệ thống)',
    email: 'luanninh2005@gmail.com',
    primaryDepartmentCode: 'SIHUB_MEDIA',
    allowedDepartmentCodes: ['SIHUB_BOD', 'SIHUB_ADMIN', 'SIHUB_FIN', 'SIHUB_INCUBATION', 'SIHUB_PARTNERSHIP', 'SIHUB_TRAINING', 'SIHUB_MEDIA', 'SIHUB_TECH_TRANSFER'],
    deptRole: 'TRUONG_BAN',
    isAppAdmin: true,
    status: 'ACTIVE',
    joinedDate: '01/01/2026',
    notes: 'Quản trị viên toàn hệ thống (Super Admin / System Owner)'
  },
  {
    id: 'mem-002',
    fullName: 'GS.TS. Nguyễn Văn An',
    email: 'khcn_head@eventknow.gov.vn',
    primaryDepartmentCode: 'SIHUB_TECH_TRANSFER',
    allowedDepartmentCodes: ['SIHUB_TECH_TRANSFER'],
    deptRole: 'TRUONG_BAN',
    isAppAdmin: false,
    status: 'ACTIVE',
    joinedDate: '15/01/2026',
    notes: 'Trưởng Phòng ĐMST & Chuyển giao Công nghệ'
  },
  {
    id: 'mem-003',
    fullName: 'ThS. Trần Thị Bích',
    email: 'khcn_member@eventknow.gov.vn',
    primaryDepartmentCode: 'SIHUB_TECH_TRANSFER',
    allowedDepartmentCodes: ['SIHUB_TECH_TRANSFER'],
    deptRole: 'CHUYEN_VIEN',
    isAppAdmin: false,
    status: 'ACTIVE',
    joinedDate: '20/01/2026',
    notes: 'Chuyên viên Phòng ĐMST & CGCN'
  },
  {
    id: 'mem-004',
    fullName: 'TS. Phạm Minh Cường',
    email: 'htqt_head@eventknow.gov.vn',
    primaryDepartmentCode: 'SIHUB_PARTNERSHIP',
    allowedDepartmentCodes: ['SIHUB_PARTNERSHIP'],
    deptRole: 'TRUONG_BAN',
    isAppAdmin: false,
    status: 'ACTIVE',
    joinedDate: '18/01/2026',
    notes: 'Trưởng Phòng Hợp tác Quốc tế & Mạng lưới'
  },
  {
    id: 'mem-005',
    fullName: 'Cử nhân Lê Hoàng Dũng',
    email: 'khtc_member@eventknow.gov.vn',
    primaryDepartmentCode: 'SIHUB_FIN',
    allowedDepartmentCodes: ['SIHUB_FIN'],
    deptRole: 'CHUYEN_VIEN',
    isAppAdmin: false,
    status: 'ACTIVE',
    joinedDate: '22/01/2026',
    notes: 'Chuyên viên Phòng Kế hoạch - Tài chính'
  },
  {
    id: 'mem-006',
    fullName: 'Kỹ sư Vũ Thị Hương',
    email: 'cntt_member@eventknow.gov.vn',
    primaryDepartmentCode: 'SIHUB_MEDIA',
    allowedDepartmentCodes: ['SIHUB_MEDIA', 'SIHUB_ADMIN'],
    deptRole: 'PHO_BAN',
    isAppAdmin: false,
    status: 'ACTIVE',
    joinedDate: '10/01/2026',
    notes: 'Phó Phòng Truyền thông & Sự kiện'
  },
  {
    id: 'mem-007',
    fullName: 'Admin Dự Phòng',
    email: 'admin.eventknow@eventknow.com',
    primaryDepartmentCode: 'SIHUB_ADMIN',
    allowedDepartmentCodes: ['SIHUB_BOD', 'SIHUB_ADMIN', 'SIHUB_FIN', 'SIHUB_INCUBATION', 'SIHUB_PARTNERSHIP', 'SIHUB_TRAINING', 'SIHUB_MEDIA', 'SIHUB_TECH_TRANSFER'],
    deptRole: 'TRUONG_BAN',
    isAppAdmin: true,
    status: 'ACTIVE',
    joinedDate: '05/08/2026',
    notes: 'Quản trị viên dự phòng hệ thống'
  }
];
