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
    }>;
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
} = {}): Promise<AttendeeProfile[]> {
    const queryParams = new URLSearchParams();
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.role) queryParams.append('role', filters.role);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.academicTitle) queryParams.append('academicTitle', filters.academicTitle);

    const response = await fetch(`/api/attendees?${queryParams.toString()}`, {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch attendees: ${response.statusText}`);
    }

    const json = await response.json();
    return json.data || [];
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
    const response = await fetch(`/api/attendees/${id}/status`, {
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
} = {}): Promise<OrganizationProfile[]> {
    const queryParams = new URLSearchParams();
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.category) queryParams.append('category', filters.category);

    const response = await fetch(`/api/organizations?${queryParams.toString()}`, {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch organizations: ${response.statusText}`);
    }

    const json = await response.json();
    return json.data || [];
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
export async function fetchDuplicateCandidates(entityType: 'PERSON' | 'ORGANIZATION', threshold: number = 0.4): Promise<DuplicateCandidate[]> {
    const query = new URLSearchParams({ entityType, threshold: String(threshold) });
    const response = await fetch(`/api/identity/duplicates?${query.toString()}`, {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch duplicate pairs: ${response.statusText}`);
    }

    const json = await response.json();
    return json.data || [];
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
