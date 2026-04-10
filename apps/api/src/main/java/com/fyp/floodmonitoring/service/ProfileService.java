package com.fyp.floodmonitoring.service;

import com.fyp.floodmonitoring.dto.request.UpdateProfileRequest;
import com.fyp.floodmonitoring.dto.response.UserProfileDto;
import com.fyp.floodmonitoring.entity.User;
import com.fyp.floodmonitoring.exception.AppException;
import com.fyp.floodmonitoring.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserRepository userRepository;

    @Transactional
    public UserProfileDto updateProfile(UUID userId, UpdateProfileRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> AppException.notFound("User not found"));

        // Apply partial updates — only set fields that are present in the request
        if (StringUtils.hasText(req.displayName())) {
            String[] parts = req.displayName().trim().split("\\s+", 2);
            user.setFirstName(parts[0]);
            user.setLastName(parts.length > 1 ? parts[1] : "");
        }
        if (req.phone() != null) {
            user.setPhone(req.phone().isBlank() ? null : req.phone().trim());
        }
        if (req.locationLabel() != null) {
            user.setLocationLabel(req.locationLabel().isBlank() ? null : req.locationLabel().trim());
        }

        user = userRepository.save(user);
        return toDto(user);
    }

    private UserProfileDto toDto(User u) {
        return new UserProfileDto(
                u.getId().toString(),
                (u.getFirstName() + " " + u.getLastName()).trim(),
                u.getEmail(),
                u.getPhone(),
                u.getLocationLabel(),
                u.getAvatarUrl());
    }
}
