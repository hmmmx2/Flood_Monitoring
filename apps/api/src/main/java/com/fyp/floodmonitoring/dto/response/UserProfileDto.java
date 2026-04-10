package com.fyp.floodmonitoring.dto.response;

public record UserProfileDto(
        String id,
        String displayName,
        String email,
        String phone,
        String locationLabel,
        String avatarUrl
) {}
