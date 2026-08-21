export interface AttendeeProfile {
    id: string;
    fullName: string;
    normalizedName: string;
    email: string;
    phone: string;
    academicTitleRaw: string;
    academicTitleNormalized: string[];
    attendeeRole: 'SPEAKER' | 'EXPERT' | 'GUEST' | 'SPONSOR' | '';
    position: string;
    organizationName: string;
    followUpStatus: 'CHUA_LIEN_HE' | 'DA_LIEN_HE' | 'TU_CHOI';
    dynamicAttributes: Record<string, any>;
    sourceFileCount: number;
    sourceSheets?: Array<{
        eventName: string;
        fileName: string;
        sheetName: string;
        eventDate: string;
        attendanceStatus: string;
        snapshotData?: Record<string, any>;
    }>;
    isCrossDomain?: boolean | null;
    events?: any[];
    notes?: any[];
}

export interface OrganizationProfile {
    id: string;
    orgName: string;
    normalizedName: string;
    emailDomain: string;
    address: string;
    category: 'RESEARCH_INSTITUTE' | 'UNIVERSITY' | 'TECH_ENTERPRISE' | 'GOVERNMENT' | 'INTERNATIONAL';
    memberCount: number;
    eventsCount: number;
    dynamicAttributes: Record<string, any>;
    sourceSheets?: Array<{
        eventName: string;
        contributionRole: string;
    }>;
    notes?: any[];
}

export interface DuplicateCandidate {
    idA: string;
    nameA: string;
    idB: string;
    nameB: string;
    score: number;
    matchReason: string;
}

// Fetch all attendees
export async function fetchAttendees(filters: {
    search?: string;
    role?: string;
    status?: string;
    academicTitle?: string;
    page?: number;
    size?: number;
} = {}): Promise<{ content: AttendeeProfile[]; totalPages: number; totalElements: number }> {
    const queryParams = new URLSearchParams();
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.role) queryParams.append('role', filters.role);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.academicTitle) queryParams.append('academicTitle', filters.academicTitle);
    if (filters.page !== undefined) queryParams.append('page', String(filters.page));
    if (filters.size !== undefined) queryParams.append('size', String(filters.size));

    const response = await fetch(`/api/attendees?${queryParams.toString()}`, {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch attendees: ${response.statusText}`);
    }

    const json = await response.json();
    return json.data || { content: [], totalPages: 0, totalElements: 0 };
}

// Fetch single attendee detail (resolves 302 automatically by fetch client)
export async function fetchAttendeeDetail(id: string): Promise<AttendeeProfile> {
    const response = await fetch(`/api/attendees/${id}`, {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch attendee details: ${response.statusText}`);
    }

    const json = await response.json();
    return json.data;
}

// Update attendee follow-up status
export async function updateAttendeeStatus(id: string, status: string): Promise<AttendeeProfile> {
    const response = await fetch(`/api/attendees/${id}/follow-up-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followUpStatus: status }),
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`Failed to update status: ${response.statusText}`);
    }

    const json = await response.json();
    return json.data;
}

// Fetch organizations
export async function fetchOrganizations(filters: {
    search?: string;
    category?: string;
    page?: number;
    size?: number;
} = {}): Promise<{ content: OrganizationProfile[]; totalPages: number; totalElements: number }> {
    const queryParams = new URLSearchParams();
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.category) queryParams.append('category', filters.category);
    if (filters.page !== undefined) queryParams.append('page', String(filters.page));
    if (filters.size !== undefined) queryParams.append('size', String(filters.size));

    const response = await fetch(`/api/organizations?${queryParams.toString()}`, {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch organizations: ${response.statusText}`);
    }

    const json = await response.json();
    return json.data || { content: [], totalPages: 0, totalElements: 0 };
}

// Fetch organization detail
export async function fetchOrganizationDetail(id: string): Promise<OrganizationProfile> {
    const response = await fetch(`/api/organizations/${id}`, {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch organization: ${response.statusText}`);
    }

    const json = await response.json();
    return json.data;
}

// Fetch duplicate candidate pairs for PERSON or ORGANIZATION
export async function fetchDuplicateCandidates(
    entityType: 'PERSON' | 'ORGANIZATION',
    threshold: number = 0.4,
    page: number = 0,
    size: number = 10
): Promise<{ content: DuplicateCandidate[]; totalPages: number; totalElements: number }> {
    const query = new URLSearchParams({
        entityType,
        threshold: String(threshold),
        page: String(page),
        size: String(size)
    });
    const response = await fetch(`/api/identity/duplicates?${query.toString()}`, {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch duplicate pairs: ${response.statusText}`);
    }

    const json = await response.json();
    return json.data || { content: [], totalPages: 0, totalElements: 0 };
}

// Merge secondary entity into primary canonical entity
export async function mergeEntities(entityType: 'PERSON' | 'ORGANIZATION' | 'EVENT', primaryId: string, secondaryId: string): Promise<any> {
    const response = await fetch('/api/identity/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, primaryId, secondaryId }),
        credentials: 'include',
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to merge entities: ${response.status}`);
    }

    return response.json();
}

// Split / rollback a previous merge by its log trace ID
export async function splitEntities(mergeLogId: string): Promise<any> {
    const response = await fetch('/api/identity/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mergeLogId }),
        credentials: 'include',
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to split entities: ${response.status}`);
    }

    return response.json();
}

export interface SearchEvent {
    eventId: string;
    eventName: string;
    eventDate: string;
    department: string;
    attendeeRole: string;
}

export interface SearchAttendee {
    resolvedPersonId: string;
    fullName: string;
    email: string;
    organizationName: string;
    academicTitle: string[];
    attendeeRole: string;
    position: string;
    researchDomains: string[];
    expertiseTags: string[];
    totalEventsAttended: number;
    isCrossDomain: boolean | null;
    events: SearchEvent[];
}

// Advanced Search Attendees
export async function searchAttendees(filters: {
    query?: string;
    startDate?: string;
    endDate?: string;
    researchDomains?: string[];
    expertiseTags?: string[];
    academicTitle?: string;
    role?: string;
    department?: string;
    page?: number;
    size?: number;
} = {}): Promise<{ content: SearchAttendee[]; totalPages: number; totalElements: number }> {
    const queryParams = new URLSearchParams();
    if (filters.query) queryParams.append('query', filters.query);
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    if (filters.academicTitle) queryParams.append('academicTitle', filters.academicTitle);
    if (filters.role) queryParams.append('role', filters.role);
    if (filters.department) queryParams.append('department', filters.department);
    if (filters.page !== undefined) queryParams.append('page', String(filters.page));
    if (filters.size !== undefined) queryParams.append('size', String(filters.size));

    if (filters.researchDomains && filters.researchDomains.length > 0) {
        filters.researchDomains.forEach(domain => queryParams.append('researchDomains', domain));
    }
    if (filters.expertiseTags && filters.expertiseTags.length > 0) {
        filters.expertiseTags.forEach(tag => queryParams.append('expertiseTags', tag));
    }

    const response = await fetch(`/api/search/attendees?${queryParams.toString()}`, {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`Failed to search attendees: ${response.statusText}`);
    }

    const json = await response.json();
    return json.data || json;
}

// Fetch popular tags
export async function getPopularTags(): Promise<string[]> {
    const response = await fetch('/api/tags/popular', {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch popular tags: ${response.statusText}`);
    }

    const json = await response.json();
    return json.data || [];
}

export interface DBDepartment {
    id?: string;
    code: string;
    name: string;
    nameEn?: string;
    aliases?: string[];
    createdAt?: string;
}

// Fetch all database departments dynamically
export async function getDepartments(): Promise<DBDepartment[]> {
    const response = await fetch('/api/departments', {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch departments: ${response.statusText}`);
    }

    return response.json();
}

// Create new department in the database
export async function createDepartment(dept: DBDepartment): Promise<DBDepartment> {
    const response = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dept),
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`Failed to create department: ${response.statusText}`);
    }

    return response.json();
}

// Update existing department in the database
export async function updateDepartment(id: string, dept: DBDepartment): Promise<DBDepartment> {
    const response = await fetch(`/api/departments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dept),
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`Failed to update department: ${response.statusText}`);
    }

    return response.json();
}

// Delete department from the database
export async function deleteDepartment(id: string): Promise<void> {
    const response = await fetch(`/api/departments/${id}`, {
        method: 'DELETE',
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`Failed to delete department: ${response.statusText}`);
    }
}

