import { DashboardAggregate, TopOrganization } from '../types';

const BASE = '/api/dashboard';

export interface DashboardFilterParams {
    startDate?: string;
    endDate?: string;
    department?: string;
    academicTitle?: string;
    role?: string;
    /** FR-4.6 — Event Dashboard stream: canonical event UUIDs to scope aggregate */
    eventIds?: string[];
}

/**
 * Fetch the dashboard aggregate data (summary, monthly trend, department stats, health indicator)
 */
export async function fetchDashboardAggregate(filters: DashboardFilterParams = {}): Promise<DashboardAggregate> {
    const queryParams = new URLSearchParams();
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    if (filters.department) queryParams.append('department', filters.department);
    if (filters.academicTitle) queryParams.append('academicTitle', filters.academicTitle);
    if (filters.role) queryParams.append('role', filters.role);
    // FR-4.6: repeated params for Spring's List<UUID> binding
    if (filters.eventIds && filters.eventIds.length > 0) {
        filters.eventIds.forEach(id => queryParams.append('eventIds', id));
    }

    const url = `${BASE}/aggregate?${queryParams.toString()}`;

    const response = await fetch(url, {
        method: 'GET',
        credentials: 'include', // Ensure session cookies are sent
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('UNAUTHORIZED');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch dashboard aggregate`);
    }

    return response.json();
}

/**
 * Fetch the top organizations by attendee count
 */
export async function fetchTopOrganizations(limit: number = 10): Promise<TopOrganization[]> {
    const url = `${BASE}/top-organizations?limit=${limit}`;

    const response = await fetch(url, {
        method: 'GET',
        credentials: 'include', // Ensure session cookies are sent
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('UNAUTHORIZED');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch top organizations`);
    }

    const json = await response.json();
    return json.data || [];
}

/**
 * FR-4.6 — Fetch visible canonical events for the Event Dashboard picker.
 * Returns events ordered by event_date DESC, filtered by RLS.
 */
export interface EventListItem {
    id: string;
    eventName: string;
    eventDate: string;
    department: string;
}

export async function fetchEventList(): Promise<EventListItem[]> {
    const url = `${BASE}/events-list`;

    const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) {
        if (response.status === 401) throw new Error('UNAUTHORIZED');
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch events list`);
    }

    return response.json();
}
