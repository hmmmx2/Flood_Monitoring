package com.fyp.floodmonitoring.dto.request;

import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Size(max = 200) String displayName,
        @Size(max = 50)  String phone,
        @Size(max = 255) String locationLabel
) {}
