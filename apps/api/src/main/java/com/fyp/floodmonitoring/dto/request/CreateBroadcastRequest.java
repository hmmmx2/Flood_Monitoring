package com.fyp.floodmonitoring.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateBroadcastRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 160) String body,
        String targetZone,
        String severity
) {}
