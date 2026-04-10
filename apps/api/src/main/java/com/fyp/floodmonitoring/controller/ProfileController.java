package com.fyp.floodmonitoring.controller;

import com.fyp.floodmonitoring.dto.request.UpdateProfileRequest;
import com.fyp.floodmonitoring.dto.response.UserProfileDto;
import com.fyp.floodmonitoring.service.ProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** PATCH /profile — update the authenticated user's profile fields. */
@RestController
@RequestMapping("/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @PatchMapping
    public ResponseEntity<UserProfileDto> updateProfile(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody UpdateProfileRequest req) {

        UUID userId = UUID.fromString(principal.getUsername());
        return ResponseEntity.ok(profileService.updateProfile(userId, req));
    }
}
