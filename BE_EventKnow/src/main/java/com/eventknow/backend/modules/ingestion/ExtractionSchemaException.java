package com.eventknow.backend.modules.ingestion;

public class ExtractionSchemaException extends RuntimeException {
    public ExtractionSchemaException(String message) {
        super(message);
    }

    public ExtractionSchemaException(String message, Throwable cause) {
        super(message, cause);
    }
}
