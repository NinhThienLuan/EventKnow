package com.eventknow.backend.modules.ingestion.exception;

public class DriveConnectionExpiredException extends RuntimeException {
    public DriveConnectionExpiredException(String message) {
        super(message);
    }

    public DriveConnectionExpiredException(String message, Throwable cause) {
        super(message, cause);
    }
}
