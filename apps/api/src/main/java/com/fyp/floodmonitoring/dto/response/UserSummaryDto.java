package com.fyp.floodmonitoring.dto.response;

public record UserSummaryDto(
        String id,
        String email,
        String displayName,
        String avatarUrl,
        String role
) {}
