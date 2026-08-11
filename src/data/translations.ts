export interface TranslationKeys {
  // Header
  searchPlaceholder: string;
  enterpriseDb: string;
  adminRole: string;
  languageName: string;
  displayMode: string;
  notifications: string;

  // Navigation
  mainMenu: string;
  systemAdmin: string;
  navHome: string;
  navDashboard: string;
  navSource: string;
  navReports: string;
  navConnections: string;
  navPartners: string;
  navUpload: string;
  navExtractionJobs: string;
  navMergeSplit: string;
  navAlias: string;
  navMapping: string;
  navAdminMgmt: string;
  navPersonnel: string;
  logout: string;
  sourceTreeHeader: string;
  reportsListHeader: string;
  records: string;
  databases: string;
  tabNavigation: string;
  tabData: string;

  // Prompt Section
  welcomeTitle: string;
  welcomeSubtitle: string;
  needHelp: string;
  suggestionHeader: string;
  sourcesCount: string;
  promptPlaceholder: string;
  addSourceData: string;
  sourcesSelected: string;
  notSelected: string;
  sendQuery: string;
  aiDisclaimer: string;

  // Categories
  catDataDiscovery: string;
  catActivities: string;
  catConnectionAnalytics: string;
  catReports: string;
  catManagement: string;

  // Report View
  aiReportBadge: string;
  sourcesUsed: string;
  author: string;
  createdTime: string;
  exportReport: string;
  searchTablePlaceholder: string;
  summaryHeader: string;
  tableHeader: string;
  colCode: string;
  colEventName: string;
  colOrganizer: string;
  colSpeakers: string;
  colDate: string;
  colStatus: string;
  statusActive: string;
  statusDeleted: string;

  // Recent Reports
  recentReportsTitle: string;
  viewAll: string;

  // Side Panel
  sidePanelTitle: string;
  tabConnections: string;
  tabNotes: string;
  tabLogs: string;
  linkedEntities: string;
  directRelations: string;
  businessNotes: string;
  autoSave: string;
  notesPlaceholder: string;
  notesTipHeader: string;
  notesTipBody: string;
  citationLogsTitle: string;

  // Source Selector Modal
  modalTitle: string;
  selectedCount: string;
  confirmUpdate: string;
}

export const translations: Record<'VN' | 'EN', TranslationKeys> = {
  VN: {
    // Header
    searchPlaceholder: 'Tìm kiếm bản ghi, [EVT-2024], diễn giả, tổ chức...',
    enterpriseDb: 'Hệ thống Quản trị',
    adminRole: 'Quản trị viên',
    languageName: 'Tiếng Việt (VN)',
    displayMode: 'Chế độ hiển thị',
    notifications: 'Thông báo hệ thống',

    // Navigation
    mainMenu: 'Menu Chính',
    systemAdmin: 'Quản lý Hệ thống',
    navHome: 'Trang chủ',
    navDashboard: 'Bảng điều khiển',
    navSource: 'Nguồn dữ liệu',
    navReports: 'Báo cáo',
    navConnections: 'Kết nối',
    navPartners: 'Đối tác & Khách mời',
    navUpload: 'Tải lên dữ liệu',
    navExtractionJobs: 'Tiến trình trích xuất',
    navMergeSplit: 'Gộp / Tách dữ liệu',
    navAlias: 'Học hàm Alias',
    navMapping: 'Phòng ban Mapping',
    navPersonnel: 'Nhân sự & Phòng ban',
    navAdminMgmt: 'Quản lý Admin',
    logout: 'Đăng xuất',
    sourceTreeHeader: 'Cây Nguồn (Source Tree)',
    reportsListHeader: 'Danh Sách Báo Cáo',
    records: 'bản ghi',
    databases: 'Cơ sở dữ liệu',
    tabNavigation: 'Điều hướng',
    tabData: 'Dữ liệu',

    // Prompt Section
    welcomeTitle: 'Chào mừng đến với EventKnow',
    welcomeSubtitle: 'Trợ lý tri thức sự kiện & phân tích dữ liệu chuyên sâu',
    needHelp: 'Bạn cần hỗ trợ gì?',
    suggestionHeader: 'Chọn chủ đề gợi ý hoặc đặt câu hỏi phân tích của riêng bạn',
    sourcesCount: 'nguồn',
    promptPlaceholder: 'Nhập yêu cầu phân tích dữ liệu sự kiện hoặc chọn thẻ gợi ý phía trên...',
    addSourceData: 'Thêm dữ liệu nguồn',
    sourcesSelected: 'Nguồn',
    notSelected: 'Chưa chọn',
    sendQuery: 'Gửi câu hỏi phân tích',
    aiDisclaimer: 'Nội dung tạo bởi AI có thể cần được kiểm chứng thủ công.',

    // Categories
    catDataDiscovery: 'Khám phá dữ liệu',
    catActivities: 'Hoạt động',
    catConnectionAnalytics: 'Phân tích kết nối',
    catReports: 'Báo cáo',
    catManagement: 'Quản lý chức năng',

    // Report View
    aiReportBadge: 'BÁO CÁO AI PHÂN TÍCH',
    sourcesUsed: 'Nguồn dữ liệu sử dụng',
    author: 'Tác giả',
    createdTime: 'Thời gian tạo',
    exportReport: 'Export Report',
    searchTablePlaceholder: 'Tìm nhanh tên sự kiện, mã trích dẫn, diễn giả...',
    summaryHeader: 'Tóm tắt Tổng quan',
    tableHeader: 'Nhật ký Bản ghi Trích dẫn Chi tiết',
    colCode: 'Mã Định Danh',
    colEventName: 'Tên Sự kiện',
    colOrganizer: 'Đơn vị Tổ chức',
    colSpeakers: 'Diễn giả chính',
    colDate: 'Thời gian',
    colStatus: 'Trạng thái',
    statusActive: 'Active',
    statusDeleted: 'Deleted',

    // Recent Reports
    recentReportsTitle: 'Báo cáo gần đây',
    viewAll: 'Xem tất cả',

    // Side Panel
    sidePanelTitle: 'Phân Tích Kết Nối & Bối Cảnh',
    tabConnections: 'Kết nối',
    tabNotes: 'Ghi chú',
    tabLogs: 'Log Nguồn',
    linkedEntities: 'Mạng lưới Thực thể Đã Liên Kết',
    directRelations: 'Mối Quan Hệ Trực Tiếp',
    businessNotes: 'Nhật ký Ghi chú Nghiệp vụ',
    autoSave: 'Tự động lưu',
    notesPlaceholder: 'Nhập ghi chú cá nhân hoặc đánh giá bổ sung cho báo cáo...',
    notesTipHeader: 'Mẹo quản trị Quiet Authority:',
    notesTipBody: 'Ghi chú của bạn sẽ gắn liền với báo cáo ID và xuất kèm khi gửi phê duyệt.',
    citationLogsTitle: 'Danh mục Trích dẫn Citation Logs',

    // Source Selector Modal
    modalTitle: 'Chọn Dữ Liệu Nguồn Để Phân Tích',
    selectedCount: 'Đã chọn',
    confirmUpdate: 'Xác nhận & Cập nhật'
  },
  EN: {
    // Header
    searchPlaceholder: 'Search records, [EVT-2024], speakers, orgs...',
    enterpriseDb: 'Enterprise DB',
    adminRole: 'Administrator',
    languageName: 'English (EN)',
    displayMode: 'Display Mode',
    notifications: 'System Notifications',

    // Navigation
    mainMenu: 'Main Menu',
    systemAdmin: 'System Administration',
    navHome: 'Home',
    navDashboard: 'Dashboard',
    navSource: 'Source',
    navReports: 'Reports',
    navConnections: 'Connections',
    navPartners: 'Partners & Guests',
    navUpload: 'Upload',
    navExtractionJobs: 'Extraction Jobs',
    navMergeSplit: 'Merge / Split',
    navAlias: 'Academic Alias',
    navMapping: 'Department Mapping',
    navPersonnel: 'HR & Departments',
    navAdminMgmt: 'Admin Management',
    logout: 'Log out',
    sourceTreeHeader: 'Source Tree',
    reportsListHeader: 'Reports Directory',
    records: 'records',
    databases: 'Databases',
    tabNavigation: 'Navigation',
    tabData: 'Data',

    // Prompt Section
    welcomeTitle: 'Welcome to EventKnow',
    welcomeSubtitle: 'Your intelligent event analytics & knowledge assistant',
    needHelp: 'How can we help?',
    suggestionHeader: 'Choose a suggested topic or type your own query below',
    sourcesCount: 'sources',
    promptPlaceholder: 'Enter your event analysis prompt or select a suggestion above...',
    addSourceData: 'Add Source Data',
    sourcesSelected: 'Sources',
    notSelected: 'None selected',
    sendQuery: 'Submit Analysis Query',
    aiDisclaimer: 'AI-generated content may require manual verification.',

    // Categories
    catDataDiscovery: 'Data Discovery',
    catActivities: 'Activities',
    catConnectionAnalytics: 'Network Analytics',
    catReports: 'Reports',
    catManagement: 'Management',

    // Report View
    aiReportBadge: 'AI SYNTHESIZED REPORT',
    sourcesUsed: 'Sources Utilized',
    author: 'Author',
    createdTime: 'Timestamp',
    exportReport: 'Export Report',
    searchTablePlaceholder: 'Search event title, citation code, speaker...',
    summaryHeader: 'Executive Summary',
    tableHeader: 'Detailed Extracted Event Records',
    colCode: 'Identifier',
    colEventName: 'Event Title',
    colOrganizer: 'Organizer',
    colSpeakers: 'Key Speakers',
    colDate: 'Event Date',
    colStatus: 'Status',
    statusActive: 'Active',
    statusDeleted: 'Deleted',

    // Recent Reports
    recentReportsTitle: 'Recent Reports',
    viewAll: 'View All',

    // Side Panel
    sidePanelTitle: 'Connections & Context Analysis',
    tabConnections: 'Connections',
    tabNotes: 'Notes',
    tabLogs: 'Source Logs',
    linkedEntities: 'Linked Knowledge Entities',
    directRelations: 'Direct Relations',
    businessNotes: 'Business Notes Log',
    autoSave: 'Auto-saved',
    notesPlaceholder: 'Enter private audit notes or additional report evaluations...',
    notesTipHeader: 'Quiet Authority Management Tip:',
    notesTipBody: 'Your notes will be attached to the report and included when exported.',
    citationLogsTitle: 'Citation Index Logs',

    // Source Selector Modal
    modalTitle: 'Select Data Sources For Analysis',
    selectedCount: 'Selected',
    confirmUpdate: 'Confirm & Update'
  }
};
