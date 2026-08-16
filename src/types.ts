export interface CitationSource {
  id: string; // e.g., 'EVT-2024-08' or 'VN-AI-CONF-01'
  title: string;
  publisher: string;
  publishDate: string;
  confidenceScore: number;
  snippet: string;
  url?: string;
  status: 'VERIFIED' | 'UPDATED' | 'DELETED_IN_SOURCE';
}

export interface EventRecord {
  id: string;
  code: string;
  eventName: string;
  organizer: string;
  keySpeakers: string[];
  eventDate: string;
  location: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'DELETED_IN_SOURCE';
  citationId: string;
  category: string;
}

export interface KnowledgeNode {
  id: string;
  name: string;
  type: 'EVENT' | 'ORGANIZER' | 'SPEAKER' | 'REPORT' | 'SOURCE';
  connectionsCount: number;
}

export interface KnowledgeLink {
  source: string;
  target: string;
  relation: string;
}

export interface AIReport {
  id: string;
  title: string;
  queryPrompt: string;
  timestamp: string;
  author: string;
  sourcesUsed: number;
  summaryParagraphs: string[];
  citations: Record<string, CitationSource>;
  tableData: EventRecord[];
  relatedNodes: KnowledgeNode[];
  relatedLinks: KnowledgeLink[];
  keyInsights: string[];
}

export interface RecentReportItem {
  id: string;
  title: string;
  editedTime: string;
  iconType: 'document' | 'tree' | 'chart';
  previewText: string;
  sourceCount: number;
}

export interface PromptCategory {
  id: string;
  label: string;
  iconName?: string;
}

export interface SuggestionCard {
  id: string;
  title: string;
  category: string;
  sourcesCount: number;
  featured?: boolean;
}

export interface DashboardSummary {
  totalEvents: number;
  totalAttendees: number;
  uniqueOrganizations: number;
  totalReports: number;
  showUpRate: number | null;
  researchDomainBreakdown: Record<string, number>;
  academicTitleBreakdown: Record<string, number>;
  attendeeRoleBreakdown: Record<string, number>;
  followUpFunnel: Record<string, number>;
}

export interface MonthlyTrend {
  month: string;
  eventCount: number;
  attendeeCount: number;
}

export interface DepartmentStat {
  department: string;
  count: number;
}

export interface DataHealth {
  deletedInSourceCount: number;
  unmappedDepartmentCount: number;
  failedExtractionJobCount: number;
}

export interface DashboardAggregate {
  summary: DashboardSummary;
  monthlyTrend: MonthlyTrend[];
  departmentDistribution: DepartmentStat[];
  dataHealth: DataHealth;
}

export interface TopOrganization {
  organizationId: string;
  orgName: string;
  attendeeCount: number;
}

