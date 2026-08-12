package com.eventknow.backend.common.exception;

import org.springframework.http.HttpStatus;

public interface ErrorCode {
    HttpStatus getStatus();

    String getMessage();

    String getErrorKey();
}
