export interface RecommendGuest {
    resolvedPersonId: string;
    fullName: string;
    organizationName: string;
    matchedTags: string[];
    matchCount: number;
    reason: string;
    totalEventsAttended: number;
    followUpStatus?: 'DA_LIEN_HE' | 'CHUA_LIEN_HE';
}

export interface PaginatedRecommendations {
    content: RecommendGuest[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
}

/**
 * Fetch guest recommendations for a specific event
 */
export async function fetchRecommendations(
    eventId: string,
    minOverlap: number,
    page: number,
    size: number
): Promise<PaginatedRecommendations> {
    const response = await fetch(
        `/api/events/${eventId}/recommend-guests?minOverlapCount=${minOverlap}&page=${page}&size=${size}`,
        {
            method: 'GET',
            credentials: 'include',
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
    }

    const json = await response.json();
    // Match backend RecommendGuestDto projection/dto structure
    return json.data;
}

/**
 * Update the topic tags for an event
 */
export async function updateEventTopicTags(
    eventId: string,
    topicTags: string[]
): Promise<void> {
    const response = await fetch(`/api/events/${eventId}/topic-tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(topicTags),
        credentials: 'include',
    });

    if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.message || `Failed to update topic tags: ${response.statusText}`);
    }
}

/**
 * Fetch popular tags based on attendee expertise tags in database
 */
export async function fetchPopularTags(): Promise<string[]> {
    const response = await fetch('/api/tags/popular', {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch popular tags: ${response.statusText}`);
    }

    const json = await response.json();
    return json.data;
}

/**
 * Predict guest recommendations for a search preview by tags
 */
export async function fetchRecommendationPreview(
    tags: string[],
    minOverlap: number,
    page: number,
    size: number
): Promise<PaginatedRecommendations> {
    const encodedTags = encodeURIComponent(tags.filter(t => t.trim() !== '').join(','));
    const response = await fetch(
        `/api/recommendations/preview?tags=${encodedTags}&minOverlapCount=${minOverlap}&page=${page}&size=${size}`,
        {
            method: 'GET',
            credentials: 'include',
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch preview recommendations: ${response.statusText}`);
    }

    const json = await response.json();
    return json.data || json;
}

