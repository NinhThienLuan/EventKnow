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
    id: 'dept-khcn',
    code: 'KHCN',
    name: 'Ban Khoa học & Công nghệ',
    folderId: '1A2b3C_KHCN_Folder',
    folderPath: '/Shared Drive/EventKnow/Ban_Khoa_Hoc_Cong_Nghe',
    description: 'Chủ trì thẩm định chuyên môn, danh sách hội thảo khoa học, hội đồng chuyên gia & đề tài AI/Bán dẫn',
    createdDate: '15/01/2026',
    headOfDeptEmail: 'khcn_head@eventknow.gov.vn',
    memberCount: 8,
    fileCount: 14
  },
  {
    id: 'dept-htqt',
    code: 'HTQT',
    name: 'Ban Hợp tác Quốc tế',
    folderId: '2B3c4D_HTQT_Folder',
    folderPath: '/Shared Drive/EventKnow/Ban_Hop_Tac_Quoc_Te',
    description: 'Quản lý danh sách đối tác nước ngoài (Singapore, Nhật Bản, APAC), thỏa thuận MOU & diễn đàn quốc tế',
    createdDate: '18/01/2026',
    headOfDeptEmail: 'htqt_head@eventknow.gov.vn',
    memberCount: 6,
    fileCount: 9
  },
  {
    id: 'dept-khtc',
    code: 'KHTC',
    name: 'Ban Kế hoạch - Tài chính',
    folderId: '3C4d5E_KHTC_Folder',
    folderPath: '/Shared Drive/EventKnow/Ban_Ke_Hoach_Tai_Chinh',
    description: 'Quản lý kinh phí sự kiện, danh sách nhà tài trợ, gói tài trợ và hợp đồng đối tác đồng tổ chức',
    createdDate: '20/01/2026',
    headOfDeptEmail: 'khtc_head@eventknow.gov.vn',
    memberCount: 5,
    fileCount: 11
  },
  {
    id: 'dept-cntt',
    code: 'CNTT',
    name: 'Phòng CNTT & Truyền thông',
    folderId: '4D5e6F_CNTT_Folder',
    folderPath: '/Shared Drive/EventKnow/Phong_CNTT_Truyen_Thong',
    description: 'Hạ tầng kỹ thuật, hệ thống lưu trữ tri thức sự kiện, quản trị nguồn dữ liệu & công cụ trích xuất AI',
    createdDate: '10/01/2026',
    headOfDeptEmail: 'cntt_head@eventknow.gov.vn',
    memberCount: 7,
    fileCount: 8
  },
  {
    id: 'dept-tccb',
    code: 'TCCB',
    name: 'Ban Tổ chức Cán bộ',
    folderId: '5E6f7G_TCCB_Folder',
    folderPath: '/Shared Drive/EventKnow/Ban_To_Chuc_Can_Bo',
    description: 'Quản lý hồ sơ nhân sự, phân quyền quản trị admin, điều phối nhân lực phục vụ hội nghị quốc gia',
    createdDate: '01/02/2026',
    headOfDeptEmail: 'tccb_head@eventknow.gov.vn',
    memberCount: 4,
    fileCount: 5
  }
];

export const MOCK_DEPARTMENT_MEMBERS: DepartmentMember[] = [
  {
    id: 'mem-001',
    fullName: 'Luân Ninh (Chủ sở hữu hệ thống)',
    email: 'luanninh2005@gmail.com',
    primaryDepartmentCode: 'CNTT',
    allowedDepartmentCodes: ['KHCN', 'HTQT', 'KHTC', 'CNTT', 'TCCB'], // All depts
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
    primaryDepartmentCode: 'KHCN',
    allowedDepartmentCodes: ['KHCN'],
    deptRole: 'TRUONG_BAN',
    isAppAdmin: false,
    status: 'ACTIVE',
    joinedDate: '15/01/2026',
    notes: 'Trưởng Ban KH&CN - Chỉ xem file, report & dashboard chuyên môn KH&CN'
  },
  {
    id: 'mem-003',
    fullName: 'ThS. Trần Thị Bích',
    email: 'khcn_member@eventknow.gov.vn',
    primaryDepartmentCode: 'KHCN',
    allowedDepartmentCodes: ['KHCN'],
    deptRole: 'CHUYEN_VIEN',
    isAppAdmin: false,
    status: 'ACTIVE',
    joinedDate: '20/01/2026',
    notes: 'Chuyên viên Ban KH&CN'
  },
  {
    id: 'mem-004',
    fullName: 'TS. Phạm Minh Cường',
    email: 'htqt_head@eventknow.gov.vn',
    primaryDepartmentCode: 'HTQT',
    allowedDepartmentCodes: ['HTQT'],
    deptRole: 'TRUONG_BAN',
    isAppAdmin: false,
    status: 'ACTIVE',
    joinedDate: '18/01/2026',
    notes: 'Trưởng Ban HTQT - Phụ trách đối tác nước ngoài'
  },
  {
    id: 'mem-005',
    fullName: 'Cử nhân Lê Hoàng Dũng',
    email: 'khtc_member@eventknow.gov.vn',
    primaryDepartmentCode: 'KHTC',
    allowedDepartmentCodes: ['KHTC'],
    deptRole: 'CHUYEN_VIEN',
    isAppAdmin: false,
    status: 'ACTIVE',
    joinedDate: '22/01/2026',
    notes: 'Chuyên viên Ban Kế hoạch Tài chính - Giới hạn xem báo cáo tài chính/tài trợ'
  },
  {
    id: 'mem-006',
    fullName: 'Kỹ sư Vũ Thị Hương',
    email: 'cntt_member@eventknow.gov.vn',
    primaryDepartmentCode: 'CNTT',
    allowedDepartmentCodes: ['CNTT', 'TCCB'],
    deptRole: 'PHO_BAN',
    isAppAdmin: false,
    status: 'ACTIVE',
    joinedDate: '10/01/2026',
    notes: 'Phó Phòng CNTT - Được phân quyền liên phòng ban (CNTT & TCCB)'
  },
  {
    id: 'mem-007',
    fullName: 'Admin Dự Phòng',
    email: 'admin.eventknow@eventknow.com',
    primaryDepartmentCode: 'TCCB',
    allowedDepartmentCodes: ['KHCN', 'HTQT', 'KHTC', 'CNTT', 'TCCB'],
    deptRole: 'TRUONG_BAN',
    isAppAdmin: true,
    status: 'ACTIVE',
    joinedDate: '05/08/2026',
    notes: 'Quản trị viên dự phòng hệ thống'
  }
];
