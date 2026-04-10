package com.fyp.floodmonitoring.repository;

import com.fyp.floodmonitoring.entity.CommunityPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface CommunityPostRepository extends JpaRepository<CommunityPost, UUID> {

    // Global feed
    Page<CommunityPost> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<CommunityPost> findAllByOrderByLikesCountDescCreatedAtDesc(Pageable pageable);

    // Group feed
    Page<CommunityPost> findByGroupIdOrderByCreatedAtDesc(UUID groupId, Pageable pageable);
    Page<CommunityPost> findByGroupIdOrderByLikesCountDescCreatedAtDesc(UUID groupId, Pageable pageable);

    @Modifying
    @Query("UPDATE CommunityPost p SET p.likesCount = p.likesCount + :delta WHERE p.id = :id")
    void adjustLikes(@Param("id") UUID id, @Param("delta") int delta);

    @Modifying
    @Query("UPDATE CommunityPost p SET p.commentsCount = p.commentsCount + :delta WHERE p.id = :id")
    void adjustComments(@Param("id") UUID id, @Param("delta") int delta);
}
