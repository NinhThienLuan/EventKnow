export interface IngestionInitResponse {
    rawEventId: string;
    status: string;
}

export interface IngestionStatusResponse {
    rawEventId: string;
    originalFileName: string;
    department: string;
    status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
    errorMessage?: string;
    totalJobs: number;
    pendingJobs: number;
    retryingJobs: number;
    successJobs: number;
    failedJobs: number;
    progressPercent: number;
}

const BASE = '/api/ingest';

/**
 * Initiates ingestion by uploading a local Excel/CSV/text file.
 */
export async function uploadExcelFile(
    file: File,
    department?: string | null
): Promise<IngestionInitResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (department) {
        formData.append('manualDepartment', department);
    }

    const response = await fetch(`${BASE}/file`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        // Do not set Content-Type header; fetch will automatically set boundary for FormData
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to upload file`);
    }

    return response.json();
}

/**
 * Initiates ingestion for a Google Drive file by ID.
 */
export async function ingestDriveFile(
    driveFileId: string,
    department?: string | null
): Promise<IngestionInitResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('googleDriveFileId', driveFileId);
    if (department) {
        queryParams.append('manualDepartment', department);
    }

    const response = await fetch(`${BASE}/file?${queryParams.toString()}`, {
        method: 'POST',
        credentials: 'include',
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to ingest Google Drive file`);
    }

    return response.json();
}

/**
 * Fetches the current processing status of an ingestion batch.
 */
export async function fetchIngestionStatus(
    rawEventId: string
): Promise<IngestionStatusResponse> {
    const response = await fetch(`${BASE}/status/${rawEventId}`, {
        credentials: 'include',
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch ingestion status`);
    }

    return response.json();
}
