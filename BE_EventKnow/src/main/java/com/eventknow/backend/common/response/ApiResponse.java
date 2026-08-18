package com.eventknow.backend.common.response;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

public record ApiResponse<T>(
        String message,
        T result,
        List<String> errors,
        String path,
        LocalDateTime timestamp) {
    public static <T> ApiResponse<T> success(T result) {
        return new ApiResponse<>("Success", result, Collections.emptyList(), null, LocalDateTime.now());
    }

    public static <T> ApiResponse<T> success(String message, T result) {
        return new ApiResponse<>(message, result, Collections.emptyList(), null, LocalDateTime.now());
    }

    public static <T> ApiResponse<T> error(String message, List<String> errors, String path) {
        return new ApiResponse<>(message, null, errors != null ? errors : Collections.emptyList(), path,
                LocalDateTime.now());
    }
}
